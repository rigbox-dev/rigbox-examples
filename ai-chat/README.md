# AI Chat — Rigbox example

[![Deploy to Rigbox](https://rigbox.dev/deploy.svg)](https://rigbox.dev/deploy?repo=rigbox-dev%2Frigbox-examples&ref=main&path=ai-chat%2Frig.yaml)

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

Dependencies are pinned in `requirements.txt` and installed inside the app release:

```yaml
install: |
  python3 -m venv --copies .venv
  .venv/bin/python -m pip install -r requirements.txt
start: .venv/bin/uvicorn chat:app --host 0.0.0.0 --port 8080
```

Rigbox stages the code in the existing workspace and reuses dependencies when
`requirements.txt` and the installation environment are unchanged. No sudo or
image build is required.

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

## Persistent app releases

The manifest uses `workspace.deployment.strategy: incremental`. Deployment stages app files separately from your editable checkout, then briefly restarts affected services on their original ports. The workspace, SSH sessions, and unrelated files stay in place. App rollback restores a retained release, not database contents or external side effects.
