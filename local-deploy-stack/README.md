# local-deploy-stack

Two-app composition deployed via `rig workspace deploy` from this
directory — no publishing required.

## What's here

```
local-deploy-stack/
├── composition.yaml      # workspace blueprint: base + two apps
├── backend/
│   ├── rig.yaml          # fpa-api: todo API on port 5100
│   └── app.js
└── frontend/
    ├── rig.yaml          # fpa-web: static UI on port 5101
    ├── server.js
    └── public/index.html
```

## Deploy

From this directory:

```bash
rig workspace deploy --name my-stack
```

That:

1. Reads `composition.yaml`
2. Spawns a workspace using `base.image: "@rigbox/base@1"` + the declared resources
3. Deploys each `apps[].path` child in dependency order:
   - `./backend` first (no `dependsOn`)
   - `./frontend` after (`dependsOn: [api]`)
4. Each child's rig.yaml is rsynced in-place and installed via the
   standard `rig app deploy` pipeline.

After the deploy completes, the frontend is at
`https://fpa-web-<workspace-suffix>.rigbox.dev` and the API at
`https://fpa-api-<workspace-suffix>.rigbox.dev`. The frontend's JS
discovers the API URL from its own hostname, so no per-deploy
templating is required.

## Redeploy into the same workspace

```bash
rig workspace deploy --workspace my-stack
```

This skips workspace creation and redeploys each app — handy during
iteration on either side.

## Difference from `frontend-plus-api/`

Both examples ship the same two apps. The differences are about how
the composition gets deployed:

| | `local-deploy-stack/` (this) | `frontend-plus-api/` |
|---|---|---|
| Deploy verb | `rig workspace deploy` | `rig recipe composition deploy --ref ...` |
| Source delivery | rsync from local filesystem | `source: { kind: git }` in each child |
| Publish required? | No | Yes (per-app `rig recipe app publish` + `rig recipe composition publish`) |
| Use when | Iterating locally, sharing as a git repo | Distributing the stack via the recipe registry |
