# pgweb — Rigbox example

[![Deploy to Rigbox](https://rigbox.dev/deploy.svg)](https://rigbox.dev/deploy?repo=rigbox-dev%2Frigbox-examples&ref=main&path=catalog-apps%2Fservice%2Fpgweb%2Frig.yaml)

[pgweb](https://sosedoff.github.io/pgweb/) is the well-established **web UI for
PostgreSQL**: schema browser, query editor, table viewer, CSV/JSON export, all
in a single static Go binary. This example runs the real, unmodified pgweb on
Rigbox, pointed at any Postgres you give it.

## The single capability: a browser-based Postgres admin, frozen into the image

A pinned pgweb release (`0.16.2`, downloaded from GitHub releases) is frozen
into the image once; every deploy boots from that frozen image. The connection
string is a **secret param** — set it once with `rig app param set`, and pgweb
picks it up via `DATABASE_URL` on boot.

```yaml
reproducible: true
install: |
  set -euo pipefail
  PGWEB_VERSION=0.16.2
  …                                                       # arch switch
  curl -fsSL "https://github.com/sosedoff/pgweb/releases/download/v${PGWEB_VERSION}/pgweb_${PGWEB_ARCH}.zip" \
    -o /tmp/pgweb.zip
  unzip -o /tmp/pgweb.zip -d /tmp
  sudo install -m 755 "/tmp/pgweb_${PGWEB_ARCH}" /usr/local/bin/pgweb
```

No Dockerfile — `install:` is the same script a plain deploy would run on the
VM; `reproducible: true` is what makes `rig deploy` freeze its result.

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

## Reproducible deploy + the hybrid model

- **First `rig deploy`**: boots a throwaway builder VM from the `base` image,
  runs `install:` inside it (pgweb binary pinned + downloaded once), snapshots
  the rootfs as a content-addressed image, boots from it.
- **Later `rig deploy`**: if the build inputs (`install:` script, base image)
  are unchanged, the image cache is reused — no re-download, fast. Bump
  `PGWEB_VERSION` in `rig.yaml`'s `install:` to upgrade.

## Deploy

```bash
cd pgweb
rig deploy
rig app param set --app APP_ID database_url='postgres://user:pass@host:5432/dbname?sslmode=require'
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
- Stack: pgweb single Go binary, pinned + frozen in the reproducible image.
