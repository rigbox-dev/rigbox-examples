# Jupyter Lab — Rigbox example

[JupyterLab](https://jupyter.org/) is the well-established interactive notebook
environment for Python (and Julia, R, …) — browser editor, kernels, plots,
markdown. This example runs the real, unmodified JupyterLab on Rigbox.

## The single capability: a reproducible interactive notebook server

The heavy `pip install jupyterlab` happens **once**, frozen into the image, and
every later deploy reuses it. The `Dockerfile` is `FROM rigbox-base` and bakes
JupyterLab into the system site-packages:

```dockerfile
FROM rigbox-base
RUN /usr/local/bin/uv pip install --system --python /usr/bin/python3 \
      --break-system-packages jupyterlab
```

`rig.yaml` points at it with a `build:` block — no `install:`, no flag:

```yaml
build:
  dockerfile: Dockerfile
```

## Docker build + the hybrid deploy

The deploy is **hybrid** — the image carries the environment, rsync carries
notebooks you put next to `rig.yaml`:

- **First `rig deploy`**: builds the image from the local `Dockerfile`
  (JupyterLab installed once — this build is slow), boots the workspace from it.
- **Later `rig deploy`**: if the build inputs are unchanged, it **reuses the
  cached image** — no pip re-run, fast.

## Persistence (survives redeploys)

The notebook root is pointed at `$DATA_DIR=/home/developer/data` via
`--notebook-dir`. `$DATA_DIR` is **outside the rsync zone** — the synced app
dir is wiped and re-rsynced on every deploy, but `$DATA_DIR` is not. So every
`.ipynb` you create stays put across redeploys.

## Deploy

```bash
cd jupyter
rig deploy
```

No required env — everything is set in `rig.yaml`.

## Notes

- **Persistence: yes.** Notebooks live under `$DATA_DIR` (`--notebook-dir`),
  outside the rsync zone — durable across redeploys.
- **Health:** `GET /api/status` → 200 (JupyterLab's built-in liveness endpoint).
  The process binds `0.0.0.0:8888`.
- **`--IdentityProvider.token=''` is intentional.** The app is private by
  default and the Rigbox gateway auth-gates anonymous traffic, so Jupyter's own
  token gate is redundant. Don't set this app `public` without re-adding a token.
- Stack: JupyterLab on Debian's `python3` (3.11), baked into the image.
