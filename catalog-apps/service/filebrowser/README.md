# File Browser — Rigbox example

[![Deploy to Rigbox](https://rigbox.dev/deploy.svg)](https://rigbox.dev/deploy?repo=rigbox-dev%2Frigbox-examples&ref=main&path=catalog-apps%2Fservice%2Ffilebrowser%2Frig.yaml)

[File Browser](https://filebrowser.org/) is a tiny self-hosted file manager —
upload, download, preview, edit, and share the files in a directory through a
clean web UI. It ships as a single static Go binary. This example runs it on
Rigbox unchanged, pointed at the workspace's persistent data dir.

## The single capability: run File Browser reproducibly on Rigbox

This isn't a toy app we wrote — it's a real off-the-shelf product running on the
platform. The one thing it demonstrates is the **reproducible deploy**: the
`install:` script downloads a **pinned** File Browser binary (`v2.32.0`) onto
the Rigbox base once, and every deploy boots from that frozen image instead of
re-downloading.

```yaml
reproducible: true
install: |
  set -euo pipefail
  FB_VERSION=v2.32.0
  …                                                       # arch switch
  curl -fsSL ".../${FB_ARCH}-filebrowser.tar.gz" \
    | sudo tar -xz -C /usr/local/bin/ filebrowser
```

No Dockerfile — `install:` is the same script a plain deploy would run on the
VM; `reproducible: true` is what makes `rig deploy` freeze its result.

## Persistence (survives redeploys)

File Browser serves `--root /home/developer/data` and keeps its SQLite database
at `$DATA_DIR/filebrowser/filebrowser.db`. `$DATA_DIR` is **outside the rsync
zone**, so uploads, edits, and the user/share database persist across redeploys.

## Default login

On first boot File Browser auto-creates an **`admin` / `admin`** account.
Log in, change the password from the UI (Settings → User Management), and
you're set. The Rigbox gateway also auth-gates the subdomain by default, so
the app sits behind two gates until you mark it public.

## Deploy

```bash
cd filebrowser && rig deploy
```
