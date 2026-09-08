# Markdown Notes — Rigbox example

[![Deploy to Rigbox](https://rigbox.dev/deploy.svg)](https://rigbox.dev/deploy?repo=rigbox-dev%2Frigbox-examples&ref=main&path=markdown-notes%2Frig.yaml)

A tiny note-taking app on **Python · Flask**. Write a note in Markdown, hit save,
and it's rendered to HTML on the page — headings, lists, tables, blockquotes, and
fenced code blocks with Pygments syntax highlighting. Newest notes first. Notes
are stored in SQLite and survive redeploys.

## The single capability: persistence that survives redeploys

Two things work together here:

1. **A recipe `install:` step.** The Python deps are declared in `rig.yaml`
   (no Dockerfile), so they install onto the workspace's shared base rootfs:

   ```yaml
   install: pip install --break-system-packages flask markdown pygments gunicorn
   ```

2. **Workspace volume-backed persistence.** `rig.yaml` declares a `data` volume at
   `/home/developer/data` and opts the app into it with `volumes: [data]`. The
   SQLite DB lives at `$DATA_DIR/markdown-notes.db`, with `DATA_DIR` pointing at
   that mount. The synced app dir is wiped and re-rsynced on every deploy; the
   volume is not, so your notes stay put. The app `mkdir -p`s the dir at startup
   since a fresh workspace won't have it.

## How the deploy works

On `rig deploy`, Rigbox rsyncs `app.py` + `templates/` + `static/` to the
workspace and runs the `install:` step on the VM, layered on the shared base
image — fast, with no per-deploy image build. The deps land in the system
site-packages, so the synced `app.py` finds `flask` / `markdown` / `pygments` /
`gunicorn` at runtime, and `gunicorn --bind 0.0.0.0:8080 app:app` imports the
synced module. A later `rig deploy` with unchanged deps takes the code-only fast
path and skips the reinstall.

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

Persistent application data now uses `RIGBOX_APP_DATA_DIR`, managed separately from release files. Existing data at `/home/developer/data` requires an explicit migration; it is not automatically moved or overwritten.
