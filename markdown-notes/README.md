# Markdown Notes — Rigbox example

[![Deploy to Rigbox](https://rigbox.dev/deploy.svg)](https://rigbox.dev/deploy?repo=rigbox-dev%2Frigbox-examples&ref=main&path=markdown-notes%2Frig.yaml)

A tiny note-taking app on **Python · Flask**. Write a note in Markdown, hit save,
and it's rendered to HTML on the page — headings, lists, tables, blockquotes, and
fenced code blocks with Pygments syntax highlighting. Newest notes first. Notes
are stored in SQLite and survive redeploys.

## The single capability: persistence that survives redeploys

Two things work together here:

1. **App-local dependencies.** `install:` creates `.venv` with
   `python3 -m venv --copies .venv`, then installs the pinned `requirements.txt`.
   The service runs `.venv/bin/gunicorn`, without sudo or system pip changes.

2. **Workspace volume-backed persistence.** `rig.yaml` declares a `data` volume at
   `/home/developer/data` and opts the app into it with `volumes: [data]`. The
   SQLite DB lives at `$DATA_DIR/markdown-notes.db`, with `DATA_DIR` pointing at
   that mount. The synced app dir is wiped and re-rsynced on every deploy; the
   volume is not, so your notes stay put. The app `mkdir -p`s the dir at startup
   since a fresh workspace won't have it.

## How the deploy works

Rigbox stages app code and its virtual environment in a managed release directory.
Unchanged dependency inputs reuse the existing installation. Activation briefly
restarts the service; the workspace and its persistent volume remain in place.

## Deploy

```bash
cd markdown-notes && rig deploy
```

No required env — `DATA_DIR` is set in `rig.yaml`.

## After deploy, look at

- The page — write a note with a fenced code block and watch it render with
  syntax highlighting.
- The **persisted in SQLite** pill and the note count in the header card.
- Redeploy (`rig deploy`) and confirm your notes are **still
  there** — that's the `data` volume surviving the rsync wipe.

## Notes

- **Persistence: yes.** SQLite at `$DATA_DIR/markdown-notes.db` on the `data`
  workspace volume — durable across redeploys.
- Health: `GET /healthz` → `{"ok": true}`; the process binds `0.0.0.0:8080`
  under gunicorn.
- Stack: Python · Flask, served by gunicorn (installed via the recipe `install:` step).

## Persistent app releases

The manifest uses `workspace.deployment.strategy: incremental`. Deployment stages app files separately from your editable checkout, then briefly restarts affected services on their original ports. The workspace, SSH sessions, and unrelated files stay in place. App rollback restores a retained release, not database contents or external side effects.

The explicit `DATA_DIR=/home/developer/data` uses the declared volume. Rigbox mounts a private app subdirectory there during installation and runtime. Existing legacy data at the volume root needs a reviewed migration into that subdirectory; deployment does not move or overwrite it.
