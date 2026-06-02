# n8n — Rigbox example

[n8n](https://n8n.io) is the well-known self-hosted **workflow-automation**
product: a visual editor where you wire up triggers, app integrations, and
code nodes into automations that run on a schedule or webhook. This example
runs the real, unmodified n8n on Rigbox — the app UI is n8n's own, not the
shared example design language.

## The single capability: run n8n reproducibly on Rigbox

n8n is a big Node app, and `npm install -g n8n` is heavy. The point of this
example is that the heavy install happens **once**, frozen into an image, and
every later deploy reuses it. The `Dockerfile` is `FROM rigbox-base` (the
Debian-12 base with node22 + the rigbox agent/systemd) and bakes n8n into the
image's global npm packages:

```dockerfile
FROM rigbox-base
RUN npm install -g n8n
```

`rig.yaml` points at it with a `build:` block (no `install:`), which makes
`rig deploy` reproducible automatically — no flag:

```yaml
build:
  dockerfile: Dockerfile
```

## Docker build + the hybrid deploy

The deploy is **hybrid** — the image carries the environment, rsync carries the
code:

- **First `rig deploy`**: builds the image from the local `Dockerfile`
  (`npm install -g n8n` runs once — this build is **slow**, expect a few
  minutes), boots the workspace from that frozen image, then starts
  `n8n start`.
- **Later `rig deploy`**: if the build inputs (the Dockerfile, base image) are
  unchanged, it **reuses the cached image** — no npm re-run, fast.

Because n8n lives in the image at a system path (global npm), `n8n start` finds
it at runtime.

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
- Stack: n8n on Node 22, baked into the image.
