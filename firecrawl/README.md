# Firecrawl — Rigbox example

[Firecrawl](https://www.firecrawl.dev/) is the self-hosted web-scraping API:
crawl a site, render JS with a real browser, extract structured data, or convert
pages to markdown. This example runs the unmodified upstream stack — Firecrawl
v2.9.0 — on Rigbox in a single VM.

## The single capability: bring up the whole Firecrawl stack reproducibly

Firecrawl isn't one process — it's an API on Node, a Playwright/Chromium worker,
PostgreSQL 17 (with `pg_cron`), Redis, and RabbitMQ. What this example
demonstrates is **freezing the entire stack into a `FROM rigbox-base` image
once**, so every later deploy boots from the frozen image instead of re-cloning,
re-`pnpm install`ing, and re-downloading Chromium (a ~6GB build that takes
10–20 minutes cold).

The Dockerfile installs the apt packages, clones `firecrawl@v2.9.0`,
`pnpm install`s, builds `apps/api` + `apps/playwright-service-ts`, downloads
Playwright Chromium to `/opt/pw-browsers`, and writes the playwright sidecar
systemd unit. The image carries everything except the live Postgres data dir.

`rig.yaml` bumps the frozen image's ext4 because the build is huge:

```yaml
build:
  dockerfile: Dockerfile
  sizeMb: 12288
```

## Credentials + first-boot database init

Three credentials are **generated on first deploy** by Rigbox and persist
across redeploys (rotate via `rig credentials rotate`):

```yaml
credentials:
  api_key:           { generate: true }   # → CRED_API_KEY (the Bearer token)
  postgres_password: { generate: true }   # → CRED_POSTGRES_PASSWORD
  bull_auth_key:     { generate: true }   # → CRED_BULL_AUTH_KEY
```

On every boot, `start.sh`:

1. Brings up `postgresql@17-main`, `redis-server`, `rabbitmq-server`, and the
   `firecrawl-playwright` sidecar.
2. Ensures the `firecrawl` Postgres role + database exist (idempotent), loads
   the `nuq` schema if missing.
3. Writes `/home/developer/.firecrawl/.env` from the credentials + the user's
   `ai_proxy_mode` / `proxy_*` params.
4. Exec's the api harness: `node apps/api/dist/src/harness.js --start-built`.

The Postgres data dir at `/var/lib/postgresql/17/main` lives on the VM (not in
the image), so your scraped data persists across redeploys.

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

The first deploy is slow — building Firecrawl + Chromium can take 15+ minutes
and the image runs ~6GB. Later deploys reuse the cached image and are fast.
