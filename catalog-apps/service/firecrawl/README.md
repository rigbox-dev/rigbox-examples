# Firecrawl — Rigbox example

[Firecrawl](https://www.firecrawl.dev/) is the self-hosted web-scraping API:
crawl a site, render JS with a real browser, extract structured data, or convert
pages to markdown. This example runs the unmodified upstream stack — Firecrawl
v2.9.0 — on Rigbox in a single VM.

## The single capability: bring up the whole Firecrawl stack reproducibly

Firecrawl isn't one process — it's an API on Node, a Playwright/Chromium worker,
PostgreSQL 17 (with `pg_cron`), Redis, and RabbitMQ. What this example
demonstrates is **freezing that entire stack into one image**, so every later
deploy boots from the frozen image instead of re-cloning, re-`pnpm install`ing,
and re-downloading Chromium (a build that takes 10–20 minutes cold).

`install:` does all of it — apt-installs Postgres 17 + pg_cron + Redis +
RabbitMQ, points Postgres at `:5433` with `pg_cron` preloaded, pins
`pnpm@9.15.4` via corepack, clones `firecrawl@v2.9.0`, builds the Go
html-to-markdown shared library, `pnpm install && pnpm run build`s both
`apps/api` and `apps/playwright-service-ts`, downloads Playwright Chromium to
`/opt/pw-browsers`, writes the playwright sidecar systemd unit, and finally
drops the build-only Go/Rust toolchains again:

```yaml
reproducible: true
install: |
  set -euo pipefail
  sudo apt-get install -y postgresql-17 postgresql-17-cron redis-server rabbitmq-server …
  sudo corepack prepare "pnpm@9.15.4" --activate
  git clone --depth 1 --branch v2.9.0 https://github.com/firecrawl/firecrawl.git ~/firecrawl
  (cd ~/firecrawl/apps/api && pnpm install --no-frozen-lockfile && pnpm run build)
  sudo PLAYWRIGHT_BROWSERS_PATH=/opt/pw-browsers npx --yes playwright install --with-deps chromium
  sudo tee /etc/systemd/system/firecrawl-playwright.service …
```

No Dockerfile — `install:` is the same script a plain deploy would run on the
VM (as `developer`, with passwordless `sudo` for the apt/`/opt`/`/etc` steps);
`reproducible: true` is what makes `rig deploy` freeze its result.

## Reproducible deploy + the hybrid model

The deploy is **hybrid** — the image carries the whole stack, rsync carries
`start.sh`:

- **First `rig deploy`**: boots a throwaway builder VM from the `base` image,
  runs `install:` inside it (15+ minutes — apt, clone, two pnpm builds, a
  Chromium download), snapshots the rootfs as a content-addressed image, boots
  the workspace from it.
- **Later `rig deploy`**: if the build inputs (`install:` script, base image)
  are unchanged, it **reuses the cached image** — no rebuild, fast. Editing
  `start.sh` only rsyncs.

> This install lands around **6GB** (node_modules for two apps + Chromium + the
> apt stack). The builder takes its disk from `workspace.resources.diskSizeMb`,
> which is `8192` here to leave headroom for it; see the repo README.

## Credentials + first-boot database init

Three credentials are **generated on first deploy** by Rigbox and persist
across redeploys (rotate via `rig credentials rotate`):

```yaml
credentials:
  api_key:           { generate: true }   # → CRED_API_KEY (the Bearer token)
  postgres_password: { generate: true }   # → CRED_POSTGRES_PASSWORD
  bull_auth_key:     { generate: true }   # → CRED_BULL_AUTH_KEY
```

The frozen image carries the *software*, not the live database, so `start.sh`
rsyncs in with the app and on every boot:

1. Brings up `postgresql@17-main`, `redis-server`, `rabbitmq-server`, and the
   `firecrawl-playwright` sidecar.
2. Ensures the `firecrawl` Postgres role + database exist (idempotent), loads
   the `nuq` schema if missing.
3. Writes `/home/developer/.firecrawl/.env` from the credentials + the user's
   `ai_proxy_mode` / `proxy_*` params.
4. Exec's the api harness: `node apps/api/dist/src/harness.js --start-built`.

Everything Postgres writes at runtime lives on the workspace disk at
`/var/lib/postgresql/17/main`, so your scraped data survives redeploys — a
cached-image redeploy boots the existing disk and only rsyncs code.

## Using it

```bash
curl -X POST "https://<subdomain>.rigbox.dev/v2/scrape" \
  -H "Authorization: Bearer $CRED_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{"url": "https://rigbox.dev", "formats": ["markdown"], "waitFor": 5000}'
```

The health probe hits `/` (v2.9.0's harness returns 200 JSON there; `/v2/health`
isn't exposed). Timeout is 240s because first-boot postgres init runs before
the listener binds.

## Deploy

```bash
cd firecrawl && rig deploy
```

The first deploy is slow — the builder runs the full Firecrawl + Chromium build.
Later deploys reuse the cached image and are fast.
