# code-server — Rigbox example

Runs **code-server** — VS Code in the browser, the well-known self-hosted editor —
on Rigbox. Open the app and you get the full VS Code UI: file tree, editor,
integrated terminal, extensions. This is an established off-the-shelf product, not
hand-written app code.

## The single capability: an established product, installed reproducibly

The whole point here is running a real, third-party product **as-is** through a
reproducible deploy. `rig.yaml`'s `install:` script puts code-server onto the
Rigbox base with its official installer, and `reproducible: true` freezes the
result so it only ever runs once:

```yaml
reproducible: true
install: |
  set -euo pipefail
  # Install code-server (VS Code in the browser) on top of the rigbox base.
  curl -fsSL https://code-server.dev/install.sh | sudo sh
```

No Dockerfile — `install:` is the same script a plain deploy would run on the
VM; `reproducible: true` is what makes `rig deploy` freeze its result.

## Reproducible deploy + the hybrid model

The deploy is **hybrid** — the image carries the environment, rsync carries the
code:

- **First `rig deploy`**: boots a throwaway builder VM from the `base` image,
  runs `install:` inside it (code-server installed once), snapshots the rootfs
  as a content-addressed image, boots the workspace from it.
- **Later `rig deploy`**: if the build inputs (`install:` script, base image)
  are unchanged, it **reuses the cached image** — no re-install, fast.

## Deploy

```bash
cd code-server && rig deploy
```

No required env — `DATA_DIR` is set in `rig.yaml`.

## After deploy, look at

- The **VS Code UI** in the browser — open a file, use the integrated terminal,
  install an extension.
- The editor opens on `$DATA_DIR` (`/home/developer/data`) as its workspace
  folder, so the files you create there persist.

## Notes

- **Persistence: yes.** code-server's user data, settings, and extensions live
  under `$DATA_DIR=/home/developer/data` (`--user-data-dir` / `--extensions-dir`),
  which is **outside the rsync zone** — they survive redeploys. The editor also
  opens on `$DATA_DIR`, so files you edit there stay put.
- **`--auth none` is intentional.** The app is private by default and the Rigbox
  gateway auth-gates anonymous traffic, so code-server's own password gate is
  redundant — the gateway is the front door. Don't set this app `public` without
  re-adding code-server auth.
- Health: `GET /healthz` → 200 (served by code-server); the process binds
  `0.0.0.0:8080`. `timeoutSeconds: 90` covers a cold first boot.
