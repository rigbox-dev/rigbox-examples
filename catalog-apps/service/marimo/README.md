# Marimo — Rigbox example

[Marimo](https://marimo.io/) is the next-generation **reactive** Python
notebook: cells re-run automatically when their inputs change, the file format
is plain `.py` (git-friendly), and the UI ships interactive widgets. This
example runs the real, unmodified Marimo on Rigbox.

## The single capability: a reactive notebook server frozen into the image

`pip install marimo` happens **once**, frozen into the image, and every later
deploy reuses it. The `Dockerfile` is `FROM rigbox-base` and bakes Marimo into
the system site-packages:

```dockerfile
FROM rigbox-base
RUN /usr/local/bin/uv pip install --system --python /usr/bin/python3 \
      --break-system-packages marimo
```

`rig.yaml` points at it with a `build:` block — no `install:`, no flag:

```yaml
build:
  dockerfile: Dockerfile
```

## Docker build + the hybrid deploy

- **First `rig deploy`**: builds the image (Marimo installed once), boots the
  workspace from it, then starts `marimo edit` on `0.0.0.0:2718`.
- **Later `rig deploy`**: if the build inputs are unchanged, it **reuses the
  cached image** — no pip re-run, fast.

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
- Stack: Marimo on Debian's `python3` (3.11), baked into the image.
