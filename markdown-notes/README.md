# Markdown Notes — Rigbox example

A tiny note-taking app on **Python · Flask**. Write a note in Markdown, hit save,
and it's rendered to HTML on the page — headings, lists, tables, blockquotes, and
fenced code blocks with Pygments syntax highlighting. Newest notes first. Notes
are stored in SQLite and survive redeploys.

## The single capability: a Docker-frozen build + persistence

Two things work together here:

1. **A reproducible Docker build.** Instead of running `pip install` on every
   deploy, the Python deps are frozen into an image once. The `Dockerfile` is
   `FROM rigbox-base` (the Debian-12 base with python3.11 + pip) and bakes
   `flask markdown pygments gunicorn` into the image's system site-packages:

   ```dockerfile
   FROM rigbox-base
   RUN pip install --break-system-packages --no-cache-dir \
         flask markdown pygments gunicorn
   ```

   `rig.yaml` points at it with a `build:` block (no `install:`):

   ```yaml
   build:
     dockerfile: Dockerfile
   ```

2. **Persistence that survives redeploys.** The SQLite DB lives at
   `$DATA_DIR/markdown-notes.db` with `DATA_DIR=/home/developer/data` (set via
   `env:`), which is **outside the rsync zone**. The synced app dir is wiped and
   re-rsynced on every deploy; `$DATA_DIR` is not — so your notes stay put. The
   app `mkdir -p`s the dir at startup since a fresh workspace won't have it.

## Docker build + the hybrid deploy

The deploy is **hybrid** — the image carries the environment, rsync carries the
code:

- **First `rig deploy --reproducible`**: builds the image from the local
  `Dockerfile` (pip deps frozen once), boots the workspace from that image, then
  rsyncs `app.py` + `templates/` + `static/` on top.
- **Later `rig deploy --reproducible`**: if the build inputs (Dockerfile/deps)
  are unchanged, it **reuses the cached image** and only rsyncs the changed code
  — no pip re-run, fast.

Because the deps live in the image at system paths (not in the synced app dir),
the rsynced `app.py` finds `flask` / `markdown` / `pygments` / `gunicorn` at
runtime, and `gunicorn --bind 0.0.0.0:8080 app:app` imports the synced module.

## Deploy

```bash
cd markdown-notes && rig deploy --reproducible
```

No required env — `DATA_DIR` is set in `rig.yaml`.

## After deploy, look at

- The page — write a note with a fenced code block and watch it render with
  syntax highlighting.
- The **persisted in SQLite** pill and the note count in the header card.
- Redeploy (`rig deploy --reproducible`) and confirm your notes are **still
  there** — that's `$DATA_DIR` surviving the rsync wipe.

## Notes

- **Persistence: yes.** SQLite at `$DATA_DIR/markdown-notes.db`, outside the
  rsync zone — durable across redeploys.
- Health: `GET /healthz` → `{"ok": true}`; the process binds `0.0.0.0:8080`
  under gunicorn.
- Stack: Python · Flask, served by gunicorn (baked into the image).
