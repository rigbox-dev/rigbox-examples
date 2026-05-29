# frontend-plus-api

A two-app **composition** — one `composition.yaml` describes a whole
workspace: a tiny todo API on one subdomain and a vanilla-JS frontend
that talks to it on another.

## Deploy in one command

Clone this repo and run:

```bash
git clone https://github.com/rigbox-dev/rigbox-examples.git
cd rigbox-examples/frontend-plus-api
rig workspace deploy --name my-stack
```

That:

1. Spawns a workspace from `@rigbox/base@1` + the declared resources.
2. Installs both child apps from the recipes referenced in `apps[].ref` (`@rigbox/fpa-api@0.1.0`, `@rigbox/fpa-web@0.1.0`).
3. Boots the workspace; both apps reach their public subdomains.

No publishing-first dance — the composition is a pure deploy spec with no vendor identity. Adding your stack to the catalog is a separate, deliberate step (`rig recipe composition publish --vendor/--slug/--version`); see [Publishing your own version](#publishing-your-own-version) below.

## What's in the box

| File | What it does |
|---|---|
| `composition.yaml` | Workspace blueprint — base image, resources, child app refs |
| `backend/rig.yaml` | `fpa-api` — in-memory todo API on port 5100 |
| `frontend/rig.yaml` | `fpa-web` — static UI on port 5101 |

Both children target the base image — no backing services, just `apt install nodejs` at install time.

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

## Iterate on the source

The default `composition.yaml` installs the publisher's frozen recipes. For an edit-deploy loop against `backend/` and `frontend/` here in this repo, use the sibling **`dev/composition.yaml`** — same two apps, but `apps[].path: ../backend` / `../frontend` instead of `apps[].ref`. Every deploy rsyncs the local working copy and reinstalls; no `rig recipe app publish` round-trip between changes.

```bash
cd dev
rig workspace deploy --name my-stack
```

`dev/composition.yaml` is intentionally non-publishable (the publish schema rejects `apps[].path`). For ad-hoc deploys without editing the source, stay at the repo root with the default `composition.yaml`.

## Redeploy into the same workspace

```bash
rig workspace deploy
```

The composition lock (`.rig-workspace-deploy.lock`) remembers which workspace you targeted last time, so a bare redeploy lands on the same workspace.

## Publishing your own version

If you want to *share* this stack as a registry composition rather than just deploy it:

```bash
# 1. Publish the two child recipes — identity comes from the flags,
#    not the manifest.
cd backend  && rig recipe app publish --vendor <you> --slug fpa-api --version 0.1.0 && cd ..
cd frontend && rig recipe app publish --vendor <you> --slug fpa-web --version 0.1.0 && cd ..

# 2. Point composition.yaml's apps[].ref at your versions, then publish.
rig recipe composition publish --vendor <you> --slug frontend-plus-api --version 0.1.0

# 3. Now anyone can deploy your stack with one command.
rig recipe composition deploy --ref @<you>/frontend-plus-api@0.1.0 --name their-stack
```

This is the "I want to maintain a public version of this stack" path. For ad-hoc use, you don't need any of it — `rig workspace deploy` does the right thing.

## Requirements

Latest CLI (v0.12.7+):

```bash
curl -fsSL https://rigbox.dev/install.sh | bash
```
