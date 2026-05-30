# ai-chat-sample

Tiny FastAPI passthrough chat that proves out `ai: managed: true` in `rig.yaml`.

## How it works

1. `rig.yaml` sets `ai: managed: true`.
2. `rig deploy` injects two env vars into the systemd unit:
   - `OPENAI_BASE_URL=http://172.16.0.1:9090/v1`
   - `OPENAI_API_KEY=managed-by-rigbox`
3. `uvicorn` starts `chat.py` with those env vars set.
4. `chat.py` POSTs to `{base}/chat/completions` — Rigbox's managed proxy
   (OpenRouter-backed) routes the request and charges the workspace owner's
   account. `MODEL` defaults to the portable `rigbox/default` alias, which the
   proxy resolves to its current default upstream (no vendor model hardcoded).

No proxy-specific code in `chat.py`. The same source would work against
`api.openai.com` if the env was unset.

## Deploy

`rig deploy` reads the single root `rig.yaml`, spawns (or attaches) a
workspace, and deploys the app — no registry write.

```bash
cd ai-chat
rig deploy                 # spawns a fresh workspace
# or target an existing one:
rig deploy --workspace my-ws
```

The deploy output prints the workspace id and the app URL
(`https://ai-chat-<suffix>.rigbox.dev`).

## Use

```bash
curl https://ai-chat-<suffix>.rigbox.dev/healthz        # {"ok": true}
curl https://ai-chat-<suffix>.rigbox.dev/               # service info + model

curl -X POST https://ai-chat-<suffix>.rigbox.dev/chat \
  -H 'content-type: application/json' \
  -d '{"message":"What are you?"}'
```

Managed AI must be enabled for your account (`rig ai defaults --mode managed`).
A `403` from `/chat` means the managed proxy rejected the request — check
`rig ai defaults` and `rig app logs --app ai-chat`.

## Tear down

```bash
rig workspace rm --workspace <ws> --force
```
