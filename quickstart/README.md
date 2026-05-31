# Quickstart — the hello-world Rigbox app

The smallest example in the repo: a live **status page** on Node 22 + TypeScript
(Hono via `tsx`, no build step). It exists to show the *shape* of a single-app
Rigbox deploy — a process bound to `0.0.0.0:8080`, a `/healthz` the platform gates
on, and a `rig.yaml` with `install` + `start`. Copy it as your starting point.

## The capability it demonstrates

1. **The canonical single-app `rig.yaml`** — `name` / `port` / `install` / `start` /
   `health`. Nothing else is required.
2. **Both deploy source modes** — the default deploys your local working copy; one
   commented-out block flips it to deploy straight from git (see below).

## Deploy

```bash
cd quickstart && rig deploy
```

No env or secrets required. Install is `npm ci` against the committed
`package-lock.json` (a handful of tiny packages — a few seconds). Health goes green
as soon as the process binds the port.

## What to look at after deploy

- The app URL — a `rb-card` status page showing the `running` pill, the **Node
  version**, **hostname**, and live **uptime**.
- `GET /healthz` — returns `200 {"status":"ok",...}`. This is the probe the platform
  uses; if it never returns 2xx the deploy is rolled back.
- `GET /tokens.css` — the shared design tokens, served straight from the app.

## The two deploy source modes

By default `rig deploy` **rsyncs your local working copy** to the workspace — no
`source:` block needed. That's what ships in `rig.yaml`.

To deploy **straight from git** instead (the server clones the repo, ignoring your
local copy), uncomment the block already present in `rig.yaml`:

```yaml
source:
  kind: git
  repo: https://github.com/rigbox-dev/rigbox-examples.git
  branch: main
```

That single block is the entire difference between the two modes:

| Mode | `source:` block | What gets deployed |
|------|-----------------|--------------------|
| Local (default) | absent | your working directory, rsynced |
| Git | `kind: git` + `repo` + `branch` | a fresh clone of the repo at that branch |

Use local while iterating; use git for reproducible, commit-pinned deploys from CI.
