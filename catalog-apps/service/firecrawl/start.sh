#!/usr/bin/env bash
# Boot Firecrawl: ensure postgres-17 + redis + rabbitmq are running, ensure
# the firecrawl role + DB + nuq schema exist (first boot only), materialize
# .firecrawl/.env from the rigbox-generated credentials + user params, then
# exec the firecrawl api harness.
#
# The Dockerfile bakes the firecrawl source + node_modules + chromium into
# the image; postgres data lives at /var/lib/postgresql/17/main on the VM
# (not in the image) so the database itself is initialized here.
set -euo pipefail

PG_PORT="5433"
FIRECRAWL_DIR="/home/developer/firecrawl"
ENV_DIR="/home/developer/.firecrawl"
ENV_FILE="$ENV_DIR/.env"

# ---------------------------------------------------------------------------
# Ensure system services are up. The Dockerfile installed but didn't enable
# them across reboots; do it idempotently here.
# ---------------------------------------------------------------------------
systemctl enable --now postgresql@17-main
systemctl enable --now redis-server
systemctl enable --now rabbitmq-server
systemctl enable --now firecrawl-playwright.service

# ---------------------------------------------------------------------------
# Wait for postgres to accept connections on the firecrawl port.
# ---------------------------------------------------------------------------
for _ in $(seq 1 30); do
    if su - postgres -c "pg_isready -q -p ${PG_PORT}" 2>/dev/null; then
        break
    fi
    sleep 1
done

# ---------------------------------------------------------------------------
# Ensure the firecrawl role + DB exist. Idempotent: ALTER ROLE the password
# every boot so a rotated CRED_POSTGRES_PASSWORD takes effect immediately.
# ---------------------------------------------------------------------------
: "${CRED_POSTGRES_PASSWORD:?CRED_POSTGRES_PASSWORD must be set — declare credentials.postgres_password in rig.yaml}"
: "${CRED_BULL_AUTH_KEY:?CRED_BULL_AUTH_KEY must be set}"
: "${CRED_API_KEY:?CRED_API_KEY must be set}"

ROLE_EXISTS=$(su - postgres -c "psql -p ${PG_PORT} -tAc \"SELECT 1 FROM pg_roles WHERE rolname='firecrawl'\"" 2>/dev/null || true)
if [ "$ROLE_EXISTS" = "1" ]; then
    su - postgres -c "psql -p ${PG_PORT} -c \"ALTER ROLE firecrawl WITH PASSWORD '${CRED_POSTGRES_PASSWORD}';\""
else
    su - postgres -c "psql -p ${PG_PORT} -v ON_ERROR_STOP=0" <<SQL
DO \$\$
BEGIN
    IF NOT EXISTS (SELECT FROM pg_catalog.pg_roles WHERE rolname = 'firecrawl') THEN
        CREATE ROLE firecrawl WITH LOGIN PASSWORD '${CRED_POSTGRES_PASSWORD}';
    END IF;
END
\$\$;

SELECT 'CREATE DATABASE firecrawl OWNER firecrawl'
WHERE NOT EXISTS (SELECT FROM pg_database WHERE datname = 'firecrawl')\gexec

GRANT ALL PRIVILEGES ON DATABASE firecrawl TO firecrawl;
SQL
fi

# Load nuq schema once, idempotent — the firecrawl repo ships it at one of a
# few paths depending on the build, so probe.
NUQ_LOADED=$(su - postgres -c "psql -p ${PG_PORT} -d firecrawl -tAc \"SELECT 1 FROM information_schema.schemata WHERE schema_name='nuq'\"" 2>/dev/null || true)
if [ "$NUQ_LOADED" != "1" ]; then
    for cand in \
        "$FIRECRAWL_DIR/apps/nuq-postgres/nuq.sql" \
        "$FIRECRAWL_DIR/apps/api/sharedLibs/nuq/schema.sql" \
        "$FIRECRAWL_DIR/apps/api/nuq-schema.sql" \
        "$FIRECRAWL_DIR/apps/api/dist/schema.sql"; do
        if [ -f "$cand" ]; then
            su - postgres -c "psql -p ${PG_PORT} -d firecrawl -f '$cand'" 2>&1 | tail -5 || true
            su - postgres -c "psql -p ${PG_PORT} -d firecrawl -c 'GRANT ALL ON SCHEMA nuq TO firecrawl; GRANT ALL ON ALL TABLES IN SCHEMA nuq TO firecrawl; GRANT ALL ON ALL SEQUENCES IN SCHEMA nuq TO firecrawl; ALTER DEFAULT PRIVILEGES IN SCHEMA nuq GRANT ALL ON TABLES TO firecrawl;'" 2>&1 || true
            break
        fi
    done
fi

# ---------------------------------------------------------------------------
# Materialize .firecrawl/.env from credentials + params. Written every boot
# so rotated credentials and patched params take effect.
# ---------------------------------------------------------------------------
mkdir -p "$ENV_DIR"
chown developer:developer "$ENV_DIR"
chmod 700 "$ENV_DIR"

cat > "$ENV_FILE" <<EOF
PORT=3002
HOST=0.0.0.0
NODE_ENV=production
USE_DB_AUTHENTICATION=false
NUM_WORKERS_PER_QUEUE=1
REDIS_URL=redis://localhost:6379
REDIS_RATE_LIMIT_URL=redis://localhost:6379
PLAYWRIGHT_MICROSERVICE_URL=http://localhost:3000/scrape
DATABASE_URL=postgresql://firecrawl:${CRED_POSTGRES_PASSWORD}@localhost:${PG_PORT}/firecrawl
NUQ_DATABASE_URL=postgresql://firecrawl:${CRED_POSTGRES_PASSWORD}@localhost:${PG_PORT}/firecrawl
NUQ_RABBITMQ_URL=amqp://guest:guest@localhost:5672
POSTGRES_PASSWORD=${CRED_POSTGRES_PASSWORD}
BULL_AUTH_KEY=${CRED_BULL_AUTH_KEY}
TEST_API_KEY=${CRED_API_KEY}
EOF

# Optional AI + proxy knobs (only emit when set so firecrawl's defaults win).
if [ -n "${OPENAI_API_KEY:-}" ]; then
    echo "OPENAI_API_KEY=${OPENAI_API_KEY}" >> "$ENV_FILE"
fi
if [ -n "${AI_PROXY_MODE:-}" ]; then
    echo "AI_PROXY_MODE=${AI_PROXY_MODE}" >> "$ENV_FILE"
fi
if [ -n "${PROXY_SERVER:-}" ]; then
    echo "PROXY_SERVER=${PROXY_SERVER}" >> "$ENV_FILE"
fi
if [ -n "${PROXY_USERNAME:-}" ]; then
    echo "PROXY_USERNAME=${PROXY_USERNAME}" >> "$ENV_FILE"
fi
if [ -n "${PROXY_PASSWORD:-}" ]; then
    echo "PROXY_PASSWORD=${PROXY_PASSWORD}" >> "$ENV_FILE"
fi

chown developer:developer "$ENV_FILE"
chmod 600 "$ENV_FILE"

# ---------------------------------------------------------------------------
# Hand off to the firecrawl harness. The env file above is loaded by the
# harness itself (firecrawl reads .env via dotenv); we also export the bits
# systemd would have set so an interactive `start.sh` invocation works.
# ---------------------------------------------------------------------------
set -a
. "$ENV_FILE"
set +a

cd "$FIRECRAWL_DIR/apps/api"
exec /usr/local/bin/node "$FIRECRAWL_DIR/apps/api/dist/src/harness.js" --start-built
