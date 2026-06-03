# Excalidraw — Rigbox example

[Excalidraw](https://excalidraw.com/) is the well-known browser-based
**virtual whiteboard** — sketch diagrams, wireframes, and architecture drawings
with that distinctive hand-drawn feel, all in a React SPA. This example runs it
on Rigbox unchanged, embedded as a tiny vite project around the published
`@excalidraw/excalidraw` package.

## The single capability: run Excalidraw reproducibly on Rigbox via a Docker build

This isn't a toy app we wrote — it's a real off-the-shelf product running on the
platform. The one thing it demonstrates is the **reproducible `FROM rigbox-base`
Docker build**: the `Dockerfile` scaffolds a minimal vite project, `npm install`s
a **pinned** `@excalidraw/excalidraw@0.17.6`, runs `vite build`, and freezes the
resulting static `build/` directory into the image. Every deploy boots from that
frozen image and just runs `serve`.

```dockerfile
FROM rigbox-base
ARG EXCALIDRAW_VERSION=0.17.6
# scaffold + npm install + vite build, baked once at image-build time
```

`rig.yaml` points at it with a `build:` block — no `install:`, no flag — and
bumps the frozen image's ext4 because vite's `node_modules` plus the bundle
overflows the default rootfs:

```yaml
build:
  dockerfile: Dockerfile
  sizeMb: 4096
```

## Docker build + the hybrid deploy

- **First `rig deploy`**: builds the image from the local `Dockerfile`
  (`vite build` runs once — heavy, expect a few minutes), boots the workspace
  from that frozen image, then starts `serve -s build`.
- **Later `rig deploy`**: if the build inputs are unchanged, it **reuses the
  cached image** — no rebuild, fast.

## No persistence

Excalidraw runs entirely in the browser — drawings live in `localStorage` on
the user's machine. There's nothing to persist on the server, so the workspace
keeps no data dir for this app. The "Export" button in the Excalidraw UI is
the way to save your boards.

## Deploy

```bash
cd excalidraw && rig deploy
```
