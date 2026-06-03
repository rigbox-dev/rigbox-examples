# pgweb — Rigbox example

[pgweb](https://sosedoff.github.io/pgweb/) is the well-established **web UI for
PostgreSQL**: schema browser, query editor, table viewer, CSV/JSON export, all
in a single static Go binary. This example runs the real, unmodified pgweb on
Rigbox, pointed at any Postgres you give it.

## The single capability: a browser-based Postgres admin, frozen into the image

A pinned pgweb release (`0.16.2`, downloaded from GitHub releases) is baked
into the image once; every deploy boots from that frozen image. The connection
string is a **secret param** — set it once with `rig app param set`, and pgweb
picks it up via `DATABASE_URL` on boot.

```dockerfile
FROM rigbox-base
ARG PGWEB_VERSION=0.16.2
RUN curl -fsSL "https://github.com/sosedoff/pgweb/releases/download/v${PGWEB_VERSION}/pgweb_linux_amd64.zip" \
      -o /tmp/pgweb.zip \
 && unzip -o /tmp/pgweb.zip -d /tmp \
 && mv /tmp/pgweb_linux_amd64 /usr/local/bin/pgweb
```

`rig.yaml` points at it with a `build:` block — no `install:`, no flag:

```yaml
build:
  dockerfile: Dockerfile
```

## External Postgres (the design choice)

This example **does not bundle Postgres**. pgweb is the admin, not the database
— bundling one in the same VM would couple them in a way real deployments
don't. Instead, the database lives wherever yours does (managed Postgres,
another Rigbox app, an external host), and pgweb connects to it via a secret
`database_url` param:

```yaml
params:
  - key: database_url
    type: secret
    envVar: DATABASE_URL
```

`pgweb` natively reads `$DATABASE_URL` at startup, so the secret flows straight
into the connection — no config file. Leave the param blank to start without a
connection and connect via the UI's `--sessions` mode instead.

## Docker build + the hybrid deploy

- **First `rig deploy`**: builds the image (pgweb binary pinned + downloaded
  once), boots from it.
- **Later `rig deploy`**: image cache reused — no re-download, fast. Bump
  `PGWEB_VERSION` in the Dockerfile to upgrade.

## Deploy

```bash
cd pgweb
rig deploy
rig app param set database_url='postgres://user:pass@host:5432/dbname?sslmode=require'
```

(The param can also be set in the UI after deploy. Without it, pgweb still
boots — the UI lets you punch in a connection manually.)

## Notes

- **Persistence: none needed.** pgweb is stateless; all state lives in the
  Postgres it's connecting to. `$DATA_DIR` is exported anyway for consistency.
- **Health:** `GET /` → 200 (the homepage SPA shell renders even without a DB
  connection — pgweb has no dedicated `/health` endpoint).
- **`--sessions`** lets users open additional Postgres connections through the
  UI instead of being pinned to the `DATABASE_URL` connection only.
- Stack: pgweb single Go binary, pinned + frozen in the image.
