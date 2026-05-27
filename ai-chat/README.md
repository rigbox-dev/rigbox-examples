# ai-chat-sample

Tiny FastAPI passthrough chat that proves out `ai: managed: true` in `rig.yaml`.

## How it works

1. `rig.yaml` sets `ai: managed: true`.
2. The CLI's `to_recipe_manifest` (PR #72) injects:
   - `OPENAI_BASE_URL=http://172.16.0.1:9090/v1`
   - `OPENAI_API_KEY=managed-by-rigbox`
3. `uvicorn` starts `chat.py` under systemd with those env vars set.
4. `chat.py` reads them and POSTs to `{base}/chat/completions` — Rigbox's managed proxy (OpenRouter-backed) routes the request and charges the workspace owner's account.

No proxy-specific code in `chat.py`. Same source would work against `api.openai.com` if the env was unset.

## Deploy

```bash
cd /path/to/ai-chat-sample
rig app deploy --workspace my-ws
```

## Use

```bash
curl https://ai-chat-<workspace-suffix>.rigbox.dev/
curl -X POST https://ai-chat-<workspace-suffix>.rigbox.dev/chat \
  -H 'content-type: application/json' \
  -d '{"message":"What are you?"}'
```

The first call may show a 403 if the workspace's `ai_mode` isn't set to managed:

```bash
rig ai mode managed --workspace my-ws
```
