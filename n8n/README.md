# n8n — Rigbox example

[n8n](https://n8n.io) is the well-known self-hosted **workflow-automation**
product: a visual editor where you wire up triggers, app integrations, and
code nodes into automations that run on a schedule or webhook. This example
runs the real, unmodified n8n on Rigbox — the app UI is n8n's own, not the
shared example design language.

## The single capability: run n8n reproducibly on Rigbox

n8n is a big Node app, and `npm install -g n8n` is heavy. The point of this
example is that the heavy install happens **once**, frozen into an image, and
every later deploy reuses it. `rig.yaml` declares the install as a plain
`install:` script and flips on `reproducible: true`:

```yaml
reproducible: true
install: |
  set -euo pipefail
  sudo npm install -g n8n
```

No Dockerfile. `install:` is the same script a plain deploy would run on the
VM; `reproducible: true` is what makes `rig deploy` freeze its result.

## Reproducible deploy + the hybrid model

The deploy is **hybrid** — the frozen image carries the environment, rsync
carries the code:

- **First `rig deploy`**: boots a throwaway builder VM from the `base` image,
  runs `install:` inside it (`npm install -g n8n` runs once — this build is
  **slow**, expect a few minutes), snapshots the rootfs as a content-addressed
  image, boots the workspace from that image, then starts `n8n start`.
- **Later `rig deploy`**: if the build inputs (the `install:` script, base
  image) are unchanged, it **reuses the cached image** — no npm re-run, fast.

Because n8n lives in the image at a system path (global npm), `n8n start` finds
it at runtime.

> n8n's `node_modules` is large. The builder takes its disk from
> `workspace.resources.diskSizeMb`, so keep that value comfortably above the
> installed footprint — see the repo README.

## Persistence (survives redeploys)

n8n keeps its SQLite database, its **encryption key**, and all your saved
workflows + credentials inside its user folder. This example points that folder
at `$DATA_DIR`:

```yaml
env:
  DATA_DIR: /home/developer/data
  N8N_USER_FOLDER: /home/developer/data
```

`$DATA_DIR` is **outside the rsync zone** — the synced app dir is wiped and
re-rsynced on every deploy, but `$DATA_DIR` is not. So your workflows and
credentials stay put across redeploys. (n8n creates a `.n8n/` folder under
`N8N_USER_FOLDER` for the DB and encryption key.)

## Deploy

```bash
cd n8n && rig deploy
```

No required env — everything is set in `rig.yaml`. The first deploy is slow
(building the n8n image); later deploys are fast.

## After deploy, look at

- The **n8n editor UI** at the workspace URL — set up the owner account, then
  build a workflow on the canvas (a Schedule or Webhook trigger into a couple of
  nodes) and execute it.
- Redeploy (`rig deploy`) and confirm your workflows and credentials are
  **still there** — that's `$DATA_DIR` surviving the rsync wipe.

## Notes

- **Persistence: yes.** n8n's SQLite DB, encryption key, workflows, and
  credentials live under `$DATA_DIR` (`N8N_USER_FOLDER=/home/developer/data`),
  outside the rsync zone — durable across redeploys.
- **Health:** `GET /healthz` → 200 (n8n's built-in health endpoint). The
  process binds `0.0.0.0:8080` (`N8N_LISTEN_ADDRESS=0.0.0.0`, `N8N_PORT=8080`),
  with a generous 90s health timeout because n8n's first boot is heavy.
- `N8N_SECURE_COOKIE=false` because the app is served behind the Rigbox gateway
  over the workspace subdomain; n8n would otherwise refuse to load the editor
  over the proxied connection.
- Stack: n8n on Node 22, frozen into the reproducible image.
