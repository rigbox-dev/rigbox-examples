# Streamlit — Rigbox example

[Streamlit](https://streamlit.io/) is the well-established Python data-app
framework: write a plain `app.py` and Streamlit turns it into a shareable web
app with widgets, charts, and live updates. This example runs an unmodified
Streamlit on Rigbox with a tiny `app.py` you can edit.

## The single capability: framework in the image, app code via rsync

The framework install (`pip install streamlit`, ~80MB with deps) happens
**once**, frozen into the image. Your `app.py` rsyncs in on every deploy — so
iterating on the app is fast, but you never re-install Streamlit:

```dockerfile
FROM rigbox-base
RUN /usr/local/bin/uv pip install --system --python /usr/bin/python3 \
      --break-system-packages streamlit
```

`rig.yaml` points at it with a `build:` block — no `install:`, no flag:

```yaml
build:
  dockerfile: Dockerfile
```

## Docker build + the hybrid deploy

- **First `rig deploy`**: builds the image (Streamlit installed once), boots
  the workspace from it, rsyncs `app.py` on top, runs `streamlit run`.
- **Later `rig deploy`**: image is cached; only the changed `app.py` rsyncs.
  Edit a widget, redeploy, the page refreshes.

## Persistence

There's no built-in app state in this example (Streamlit reruns from `app.py`
on every interaction). `$DATA_DIR=/home/developer/data` is exported anyway
because it's the canonical persistent location — if your app starts writing
files (CSV uploads, a SQLite DB, cached models), put them there and they'll
survive redeploys.

## Deploy

```bash
cd streamlit
rig deploy
```

No required env — everything is set in `rig.yaml`.

## Notes

- **Health:** `GET /_stcore/health` → 200 (Streamlit's built-in liveness
  probe). The process binds `0.0.0.0:8501`.
- **`--server.headless true`** skips the "open browser" prompt and Streamlit's
  first-run "send anonymous stats" question, which would hang the boot.
- Stack: Streamlit on Debian's `python3` (3.11), baked into the image.
