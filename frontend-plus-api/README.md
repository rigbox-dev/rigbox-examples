# frontend-plus-api

A two-app project — one root `rig.yaml` describes the whole workspace: a
tiny todo API on one subdomain and a vanilla-JS frontend that talks to it
on another.

## Deploy in one command

Clone this repo and run:

```bash
git clone https://github.com/rigbox-dev/rigbox-examples.git
cd rigbox-examples/frontend-plus-api
rig deploy
```

That:

1. Spawns a workspace from the `base` template + the declared resources (or
   attaches to the one recorded in `.rig.lock` / `--workspace <id|name>`).
2. Rsyncs and installs each app from its `path` — `frontend-api` from
   `./backend`, `frontend-web` from `./frontend`.
3. Brings them up in `dependsOn` order (`frontend-api`, then `frontend-web`);
   each app gets its own subdomain — `frontend-api-<ws>.rigbox.dev` and
   `frontend-web-<ws>.rigbox.dev`. The web page derives the API origin from its
   own `frontend-web-<ws>` hostname (swapping the prefix to `frontend-api-<ws>`),
   so cross-app wiring needs no per-deploy templating.

The frontend derives the API URL from its own hostname, so no per-deploy
templating is needed.

## What's in the box

One root `rig.yaml` holds the whole spec — a `workspace:` block (base image
+ resources) and an `apps:` map. Each app's `path` directory holds only
code; the app's spec lives inline under `apps.<name>`.

| Path | What it does |
|---|---|
| `rig.yaml` | Workspace blueprint + both app specs inline |
| `backend/` | `frontend-api` — in-memory todo API on port 5100 (`app.js`) |
| `frontend/` | `frontend-web` — static UI on port 5101, `dependsOn: [frontend-api]` (`server.js`, `public/`) |

Both apps target the base image — no backing services, just `apt install nodejs` at install time.

## Verify

```bash
# Frontend shows the todo list; add/delete works.
open https://frontend-web-<ws>.rigbox.dev

# API responds directly.
curl https://frontend-api-<ws>.rigbox.dev/api/todos
curl -X POST -H 'content-type: application/json' \
  -d '{"title":"first todo"}' \
  https://frontend-api-<ws>.rigbox.dev/api/todos
```

## Iterate on the source

Every deploy rsyncs the local working copy of each app's `path` and
reinstalls — no publish round-trip between changes. Edit `backend/` or
`frontend/`, then redeploy.

Redeploy both apps into the same workspace:

```bash
rig deploy
```

Redeploy just one app:

```bash
rig deploy --app frontend-web
```

The project lock (`.rig.lock`) at the repo root remembers which workspace
you targeted last time, so a bare redeploy lands on the same workspace.
Pass `--workspace <id|name>` to target a different one.

## Publishing

Publishing a multi-app project to the registry as a workspace-definition is
a work-in-progress follow-up — not available in this model yet. For now
these examples are deploy-only. (Individual single-app recipes can still be
published with `rig recipe app publish --vendor/--slug/--version`.)

## Requirements

Latest CLI:

```bash
curl -fsSL https://rigbox.dev/install.sh | bash
```
