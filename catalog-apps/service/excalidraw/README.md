# Excalidraw — Rigbox example

[Excalidraw](https://excalidraw.com/) is the well-known browser-based
**virtual whiteboard** — sketch diagrams, wireframes, and architecture drawings
with that distinctive hand-drawn feel, all in a React SPA. This example runs it
on Rigbox unchanged, embedded as a tiny vite project around the published
`@excalidraw/excalidraw` package.

## The single capability: run Excalidraw reproducibly on Rigbox

This isn't a toy app we wrote — it's a real off-the-shelf product running on the
platform. The one thing it demonstrates is the **reproducible deploy**: the
`install:` script scaffolds a minimal vite project under `/opt/excalidraw`,
`npm install`s a **pinned** `@excalidraw/excalidraw@0.17.6`, runs `vite build`,
and the resulting static `build/` directory is frozen into the image. Every
deploy boots from that frozen image and just runs `serve`.

```yaml
reproducible: true
install: |
  set -euo pipefail
  EXCALIDRAW_VERSION=0.17.6
  sudo mkdir -p /opt/excalidraw && sudo chown developer:developer /opt/excalidraw
  cd /opt/excalidraw
  …                                                       # scaffold package.json / vite.config.js / index.html / src/main.jsx
  npm install --no-audit --no-fund react react-dom "@excalidraw/excalidraw@${EXCALIDRAW_VERSION}" vite @vitejs/plugin-react serve
  npx vite build
```

No Dockerfile — `install:` is the same script a plain deploy would run on the
VM; `reproducible: true` is what makes `rig deploy` freeze its result.

## Reproducible deploy + the hybrid model

- **First `rig deploy`**: boots a throwaway builder VM from the `base` image,
  runs `install:` inside it (`vite build` runs once — heavy, expect a few
  minutes), snapshots the rootfs as a content-addressed image, boots the
  workspace from it, then starts `serve -s build`.
- **Later `rig deploy`**: if the build inputs (`install:` script, base image)
  are unchanged, it **reuses the cached image** — no rebuild, fast.

> Excalidraw's install footprint (vite + `node_modules` + the built bundle) is
> larger than the 3GB default. The builder takes its disk from
> `workspace.resources.diskSizeMb`, so keep that value above the footprint — see
> the repo README.

## No persistence

Excalidraw runs entirely in the browser — drawings live in `localStorage` on
the user's machine. There's nothing to persist on the server, so the workspace
keeps no data dir for this app. The "Export" button in the Excalidraw UI is
the way to save your boards.

## Deploy

```bash
cd excalidraw && rig deploy
```
