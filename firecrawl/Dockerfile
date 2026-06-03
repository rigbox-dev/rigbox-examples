FROM rigbox-base
# Firecrawl v2.9.0 stack, frozen into the image. This Dockerfile installs:
#   - PostgreSQL 17 + pg_cron, Redis, RabbitMQ (system services)
#   - Node toolchain + corepack-managed pnpm@9 (v2.9.0 builds on pnpm 9, not 10)
#   - The firecrawl repo at v2.9.0, with apps/api + apps/playwright-service-ts built
#   - Playwright chromium under /opt/pw-browsers
#   - A sidecar firecrawl-playwright.service systemd unit on :3000
#
# The postgres DB itself (the `firecrawl` role + database + nuq schema) is NOT
# created here — postgres data lives at /var/lib/postgresql on the VM, not in
# the image. start.sh creates the role/db on first boot.

ARG FIRECRAWL_VERSION=v2.9.0
ARG PNPM_VERSION=9.15.4
ARG PG_PORT=5433
ARG GO_VERSION=1.24.4

ENV DEBIAN_FRONTEND=noninteractive
ENV PLAYWRIGHT_BROWSERS_PATH=/opt/pw-browsers

# ---------------------------------------------------------------------------
# 1. apt: postgres-17 + pg_cron + redis + rabbitmq + build deps
# ---------------------------------------------------------------------------
RUN apt-get update \
 && apt-get install -y --no-install-recommends gnupg ca-certificates curl \
 && curl -fsSL https://www.postgresql.org/media/keys/ACCC4CF8.asc \
      | gpg --dearmor -o /usr/share/keyrings/pgdg.gpg \
 && echo "deb [signed-by=/usr/share/keyrings/pgdg.gpg] http://apt.postgresql.org/pub/repos/apt bookworm-pgdg main" \
      > /etc/apt/sources.list.d/pgdg.list \
 && apt-get update \
 && apt-get install -y --no-install-recommends \
      postgresql-17 \
      postgresql-17-cron \
      postgresql-client-17 \
      libpq-dev \
      redis-server \
      rabbitmq-server \
      git \
      build-essential \
      unzip \
 && apt-get clean \
 && rm -rf /var/lib/apt/lists/*

# ---------------------------------------------------------------------------
# 2. postgres config: pg_cron preload, trust local auth, listen on 5433
#    (postgres runtime data dir is /var/lib/postgresql/17/main, untouched here)
# ---------------------------------------------------------------------------
RUN PG_CONF=/etc/postgresql/17/main/postgresql.conf \
 && sed -i "s/^#\?shared_preload_libraries.*/shared_preload_libraries = 'pg_cron'/" "$PG_CONF" \
 && printf "\n# pg_cron settings\ncron.database_name = 'firecrawl'\n" >> "$PG_CONF" \
 && sed -i "s/^port = .*/port = ${PG_PORT}/" "$PG_CONF" \
 && PG_HBA=/etc/postgresql/17/main/pg_hba.conf \
 && sed -i 's/^local\s\+all\s\+all\s\+peer/local   all             all                                     trust/' "$PG_HBA" \
 && printf 'host    all             all             127.0.0.1/32            md5\n' >> "$PG_HBA"

# Bind redis to loopback — same as the catalog.
RUN sed -i 's/^bind .*/bind 127.0.0.1 ::1/' /etc/redis/redis.conf

# ---------------------------------------------------------------------------
# 3. pnpm@9.15.4 via corepack. v2.9.0 silently skips esbuild install scripts
#    under pnpm 10/11, so we pin 9.
# ---------------------------------------------------------------------------
RUN corepack enable \
 && corepack prepare "pnpm@${PNPM_VERSION}" --activate \
 && echo 'resolution-mode=highest' >> /etc/npmrc

# ---------------------------------------------------------------------------
# 4. Go + Rust toolchains (needed to build the html-to-markdown .so and a few
#    firecrawl native modules). The base image doesn't ship them.
# ---------------------------------------------------------------------------
ENV RUSTUP_HOME=/usr/local/rustup \
    CARGO_HOME=/usr/local/cargo \
    PATH=/usr/local/cargo/bin:/usr/local/go/bin:${PATH}
RUN curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs \
      | sh -s -- -y --default-toolchain stable --profile minimal \
 && chmod -R a+rw /usr/local/cargo /usr/local/rustup \
 && curl -fsSL "https://go.dev/dl/go${GO_VERSION}.linux-amd64.tar.gz" \
      | tar -xz -C /usr/local \
 && ln -sf /usr/local/go/bin/go /usr/local/bin/go \
 && ln -sf /usr/local/go/bin/gofmt /usr/local/bin/gofmt

# ---------------------------------------------------------------------------
# 5. Clone firecrawl @ v2.9.0 and pin pnpm in every package.json.
# ---------------------------------------------------------------------------
RUN git clone --depth 1 --branch "${FIRECRAWL_VERSION}" \
      https://github.com/firecrawl/firecrawl.git /home/developer/firecrawl \
 && chown -R developer:developer /home/developer/firecrawl \
 && find /home/developer/firecrawl -maxdepth 4 -name package.json -not -path '*/node_modules/*' \
      -exec node -e 'const fs=require("fs"); const p=process.argv[1]; const j=JSON.parse(fs.readFileSync(p,"utf8")); j.packageManager = "pnpm@'"${PNPM_VERSION}"'"; fs.writeFileSync(p, JSON.stringify(j, null, 2) + "\n");' {} \;

# ---------------------------------------------------------------------------
# 6. Build the Go html-to-markdown shared library.
# ---------------------------------------------------------------------------
RUN cd /home/developer/firecrawl/apps/api/sharedLibs/go-html-to-md \
 && go build -buildmode=c-shared -o html-to-markdown.so html-to-markdown.go \
 && chown -R developer:developer /home/developer/firecrawl/apps/api/sharedLibs

# ---------------------------------------------------------------------------
# 7. pnpm install + build api + playwright-service-ts.
# --no-frozen-lockfile because v2.9.0's lockfile has an overrides mismatch.
# ---------------------------------------------------------------------------
USER developer
RUN cd /home/developer/firecrawl/apps/api \
 && pnpm install --no-frozen-lockfile \
 && pnpm run build \
 && pnpm prune --prod --ignore-scripts || true
RUN cd /home/developer/firecrawl/apps/playwright-service-ts \
 && pnpm install --no-frozen-lockfile \
 && pnpm run build

# ---------------------------------------------------------------------------
# 8. Playwright chromium under /opt/pw-browsers (world-readable so the dev
#    user can launch it whether the service runs as root or developer).
# ---------------------------------------------------------------------------
USER root
RUN mkdir -p /opt/pw-browsers \
 && cd /home/developer/firecrawl/apps/playwright-service-ts \
 && npx --yes playwright install --with-deps chromium \
 && chmod -R a+rX /opt/pw-browsers

# ---------------------------------------------------------------------------
# 9. Sidecar systemd unit for the playwright service on :3000.
# ---------------------------------------------------------------------------
RUN cat > /etc/systemd/system/firecrawl-playwright.service <<'EOF'
[Unit]
Description=Firecrawl Playwright service
After=network.target

[Service]
Type=simple
User=developer
Group=developer
WorkingDirectory=/home/developer/firecrawl/apps/playwright-service-ts
Environment=PORT=3000
Environment=PLAYWRIGHT_BROWSERS_PATH=/opt/pw-browsers
ExecStart=/usr/local/bin/node /home/developer/firecrawl/apps/playwright-service-ts/dist/api.js
Restart=always
RestartSec=2

[Install]
WantedBy=multi-user.target
EOF
RUN systemctl enable firecrawl-playwright.service

# ---------------------------------------------------------------------------
# 10. Prune build caches + the toolchains we installed (only used at build).
# ---------------------------------------------------------------------------
RUN rm -rf /home/developer/.cache/go-build /home/developer/.npm/_cacache /home/developer/.npm/_logs \
 && su - developer -c 'pnpm store prune || true' \
 && rm -rf /usr/local/cargo /usr/local/rustup /usr/local/go /usr/local/bin/go /usr/local/bin/gofmt

# ---------------------------------------------------------------------------
# 11. Boot wrapper at an absolute path (systemd requires it).
# ---------------------------------------------------------------------------
COPY start.sh /usr/local/bin/firecrawl-start.sh
RUN chmod +x /usr/local/bin/firecrawl-start.sh
