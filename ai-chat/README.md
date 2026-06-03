# AI Chat — Rigbox example

A clean single-page AI chatbot built on **Python · FastAPI** (uvicorn). Type a
message, it POSTs to `/chat`, the server calls an OpenAI-compatible
chat-completions endpoint and returns the reply.

## The single capability: the managed AI proxy

This app **never holds a real API key**. `rig.yaml` sets:

```yaml
ai:
  managed: true
```

so Rigbox injects `OPENAI_BASE_URL` and `OPENAI_API_KEY=managed-by-rigbox` into
the VM. The app (`chat.py`, using `httpx`) just calls
`POST {OPENAI_BASE_URL}/chat/completions` with that key — the proxy
authenticates, meters credits, and forwards to a real provider. No vendor model
or secret is hardcoded.

The model is a **portable alias** chosen via a validated `select` param (`model`
→ `MODEL` env, default `rigbox/default`), so the same code works against any
backend the proxy resolves.

## Deploy: a recipe `install:` step

The Python deps are declared in `rig.yaml` as a recipe `install:` step — no
Dockerfile — so they install onto the workspace's shared base rootfs:

```yaml
install: pip install --break-system-packages fastapi uvicorn pydantic httpx
start: uvicorn chat:app --host 0.0.0.0 --port 8080
```

On `rig deploy`, Rigbox rsyncs `chat.py` + `static/` to the workspace and runs
the `install:` step on the VM, layered on the base image — fast, with no
per-deploy image build. The deps land in the system site-packages, so the synced
code imports `fastapi` / `uvicorn` / `httpx` at runtime. A later `rig deploy`
with unchanged deps takes the code-only fast path and skips the reinstall.

## Deploy

```bash
cd ai-chat && rig deploy
```

No required env — the AI credentials are injected by the managed proxy.

## After deploy, look at

- The chat page — send a message and watch the assistant reply.
- The **model alias pill** in the header (top right of the card), e.g.
  `rigbox/default`.
- Flip the model live without redeploying:
  `rig app param set model=rigbox/fast` (options: `rigbox/default`,
  `rigbox/fast`, `rigbox/free`).

## Notes

- Persistence: none — chat is in-memory per browser session.
- Install: deps install on deploy via the recipe `install:` step (layered on the base); unchanged redeploys skip it.
- Health: `GET /healthz` → `{"ok": true}`; the process binds `0.0.0.0:8080`.
