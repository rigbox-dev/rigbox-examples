# Marimo — Rigbox example

[![Deploy to Rigbox](https://rigbox.dev/deploy.svg)](https://rigbox.dev/deploy?repo=rigbox-dev%2Frigbox-examples&ref=main&path=catalog-apps%2Fservice%2Fmarimo%2Frig.yaml)

[Marimo](https://marimo.io/) is the next-generation **reactive** Python
notebook: cells re-run automatically when their inputs change, the file format
is plain `.py` (git-friendly), and the UI ships interactive widgets. This
example runs the real, unmodified Marimo on Rigbox.

## The single capability: a reactive notebook server frozen into the image

`pip install marimo` happens **once**, frozen into the image, and every later
deploy reuses it. `rig.yaml`'s `install:` script puts Marimo into the system
site-packages on the Rigbox base, and `reproducible: true` freezes the result:

```yaml
reproducible: true
install: |
  set -euo pipefail
  sudo /usr/local/bin/uv pip install --system --python /usr/bin/python3 \
    --break-system-packages marimo
```

No Dockerfile — `install:` is the same script a plain deploy would run on the
VM; `reproducible: true` is what makes `rig deploy` freeze its result.

## Reproducible deploy + the hybrid model

- **First `rig deploy`**: boots a throwaway builder VM from the `base` image,
  runs `install:` inside it (Marimo installed once), snapshots the rootfs as a
  content-addressed image, boots the workspace from it, then starts
  `marimo edit` on `0.0.0.0:2718`.
- **Later `rig deploy`**: if the build inputs (`install:` script, base image)
  are unchanged, it **reuses the cached image** — no pip re-run, fast.

## Persistence (survives redeploys)

`marimo edit` is pointed at `$DATA_DIR=/home/developer/data` as its working
directory. `$DATA_DIR` is **outside the rsync zone** — the synced app dir is
wiped and re-rsynced on every deploy, but `$DATA_DIR` is not. So every notebook
`.py` you save stays put across redeploys.

## Deploy

```bash
cd marimo
rig deploy
```

No required env — everything is set in `rig.yaml`.

## Notes

- **Persistence: yes.** Notebooks live under `$DATA_DIR` (Marimo's working
  directory), outside the rsync zone — durable across redeploys.
- **Health:** `GET /health` → 200 (Marimo's built-in healthcheck). The process
  binds `0.0.0.0:2718`.
- **`--no-token` is intentional.** The app is private by default and the
  Rigbox gateway auth-gates anonymous traffic, so Marimo's own token gate is
  redundant. Don't set this app `public` without dropping `--no-token`.
- Stack: Marimo on Debian's `python3` (3.11), frozen into the reproducible
  image.

## Deployment strategy

This example explicitly uses `workspace.deployment.strategy: image` because its installer changes system packages, global executable paths, or shared tool configuration. The badge review shows image replacement and requires permission before replacing an existing workspace root filesystem. It is not an incremental app release. Use a dedicated workspace and back up root-filesystem development files; persistent volumes are retained. Migrating this installer to app-local releases remains separate work.
