# frontend-plus-api

A two-app **composition** — one `composition.yaml` describes a whole
workspace: a tiny todo API on one subdomain and a vanilla-JS
frontend that talks to it on another.

## What it shows

| File | What it does |
|---|---|
| `composition.yaml` | The workspace blueprint. Declares the base image, resources, and child app refs with optional `params` / `dependsOn` overrides. Deployed as a single unit via `rig recipe composition deploy`. |
| `backend/rig.yaml` | The `fpa-api` recipe — in-memory todo API on port 5100, with one boolean `params` toggle for /metrics. |
| `frontend/rig.yaml` | The `fpa-web` recipe — static-file server on port 5101. Frontend code derives the API URL from its own hostname. |

Both child apps target the base image (`@rigbox/base@1`) — no
backing services, just `apt install nodejs` at install time.

## Deploy

The two child recipes must be published first; then the composition
references them by `@vendor/slug@version`.

```bash
# 1. Publish the two child recipes (one time only — or anytime you
#    bump versions).
cd backend && rig recipe app publish && cd ..
cd frontend && rig recipe app publish && cd ..

# 2. Publish the composition itself.
rig recipe composition publish

# 3. Deploy a whole workspace from the composition. This creates
#    the workspace AND installs both apps in one shot.
rig recipe composition deploy --ref @jonathan/frontend-plus-api@0.1.0
```

`composition deploy` creates a workspace named after the slug
(`frontend-plus-api-<short>`) and surfaces both apps publicly:

- `https://fpa-web-<ws>.rigbox.dev`  — the todo UI
- `https://fpa-api-<ws>.rigbox.dev`  — the API

## Verify

```bash
# Frontend shows the todo list; add/delete works.
open https://fpa-web-<ws>.rigbox.dev

# API responds directly.
curl https://fpa-api-<ws>.rigbox.dev/api/todos
curl -X POST -H 'content-type: application/json' \
  -d '{"title":"first todo"}' \
  https://fpa-api-<ws>.rigbox.dev/api/todos
```

## Per-app tweaks from the composition

The composition.yaml's `apps[].params` block overrides each child's
declared defaults. For example, to ship with Prometheus metrics on
by default, add to the api entry:

```yaml
- ref: "@jonathan/fpa-api@0.1.0"
  alias: api
  params:
    enable_metrics: "true"
```

Republish the composition (bump its version) and redeploy. The
backend's `/metrics` endpoint will now be live without the operator
needing to run `rig app param set`.

## When to reach for this

- Multi-app stacks that should be deployed as one unit.
- Sharing a development environment ("clone my stack") as a single
  manifest.
- Wiring two of your own recipes together (e.g., a CMS + its admin
  panel; an API + its docs site).

## Requirements

CLI v0.12.4 or later.

```bash
curl -fsSL https://rigbox.dev/install.sh | bash
```
