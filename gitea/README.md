# Gitea — Rigbox example

[Gitea](https://about.gitea.com/) is a well-established, self-hosted Git service —
a lightweight GitHub-in-a-box with repos, issues, pull requests, and a web UI,
shipped as a single static Go binary. This example runs it on Rigbox unchanged.

## The single capability: run Gitea reproducibly on Rigbox via a Docker build

This isn't a toy app we wrote — it's a real, off-the-shelf product running on the
platform. The one thing it demonstrates is the **reproducible `FROM rigbox-base`
Docker build**: the `Dockerfile` downloads a **pinned** Gitea binary
(`1.22.6`, checksum-verified) onto the Rigbox base image once, and every deploy
boots from that frozen image instead of re-downloading.

```dockerfile
FROM rigbox-base
ARG GITEA_VERSION=1.22.6
RUN curl -fsSL "https://dl.gitea.com/gitea/${GITEA_VERSION}/gitea-${GITEA_VERSION}-linux-amd64" \
      -o /usr/local/bin/gitea \
 && echo "<sha256>  /usr/local/bin/gitea" | sha256sum -c - \
 && chmod +x /usr/local/bin/gitea
```

`rig.yaml` points at it with a `build:` block — no `install:`, no flag:

```yaml
build:
  dockerfile: Dockerfile
```

## Docker build + the hybrid deploy

The deploy is **hybrid** — the image carries the Gitea binary, rsync carries the
app config:

- **First `rig deploy`**: builds the image from the local `Dockerfile` (Gitea
  binary frozen once), boots the workspace from it, then rsyncs `start.sh` on top.
- **Later `rig deploy`**: if the build inputs (Dockerfile/version) are unchanged,
  it **reuses the cached image** and only rsyncs the changed code — no
  re-download, fast. Bump `GITEA_VERSION` in the Dockerfile to upgrade.

## No setup wizard (the crux)

Gitea normally greets a fresh install with an interactive web **install wizard** —
which would hang the health check forever. This example boots **headless**:

- Everything is configured up front via `GITEA__<section>__<KEY>` environment
  variables in `rig.yaml` (Gitea reads these at startup) — HTTP address/port,
  SQLite database, repository root, data/log/session paths.
- **`GITEA__security__INSTALL_LOCK=true`** is the bypass: it makes Gitea boot
  straight to the app and refuse to serve `/install`. The wizard never appears.

So Gitea comes up clean, binds `0.0.0.0:8080`, and `GET /api/healthz` goes green
without any human in the loop.

## Persistence (survives redeploys)

The synced app dir is wiped and re-rsynced on every deploy, so all durable state
lives under `DATA_DIR=/home/developer/data` (outside the rsync zone):

- **SQLite DB** → `$DATA_DIR/gitea.db`
- **Git repositories** → `$DATA_DIR/repositories`
- **Gitea work dir** (generated `app.ini` with its auto-minted `SECRET_KEY` /
  `INTERNAL_TOKEN`, LFS, sessions, logs) → `$DATA_DIR/gitea`

`start.sh` `mkdir -p`s these on boot (a fresh workspace won't have them), then
`exec gitea web`. Redeploy and your repos + accounts are still there.

## Deploy

```bash
cd gitea && rig deploy
```

No required env — everything is set in `rig.yaml`.

## After deploy, look at

- The **Gitea web UI** at the app's Rigbox subdomain. With `INSTALL_LOCK=true`
  there's no wizard, so create the first account by **registering** in the UI
  (`/user/sign_up`) — the first registered user becomes the site admin. (To
  pre-provision an admin instead, exec into the workspace and run
  `gitea admin user create --admin …`; `GITEA_WORK_DIR` is already set in env.)
- Create a repo, then clone it over the app subdomain — that's the persisted
  `$DATA_DIR/repositories` tree.
- Redeploy (`rig deploy`) and confirm your repos + login **survive** — that's
  `$DATA_DIR` outliving the rsync wipe.

## Notes

- **Persistence: yes.** SQLite + repos + work dir under `$DATA_DIR`, durable
  across redeploys.
- Health: `GET /api/healthz` → 2xx; the process binds `0.0.0.0:8080`.
- Wizard: bypassed via `GITEA__security__INSTALL_LOCK=true` + full env config.
- Stack: Gitea (single static Go binary), pinned + checksum-verified in the image.
