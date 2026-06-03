# Open WebUI — Rigbox example

Runs [Open WebUI](https://docs.openwebui.com/) on Rigbox — the well-known
self-hosted chat front-end (Python + SvelteKit) — pointed at the **Rigbox
managed AI proxy** so you get a full-featured chat UI without holding any
provider API keys yourself.

## The single capability: chat UI on managed credits, no key juggling

The whole point of this example is what `rig.yaml` does in three lines:

```yaml
ai:
  managed: true
```

That makes the workspace inject `OPENAI_API_BASE_URL` pointed at the Rigbox
proxy and `OPENAI_API_KEY=managed-by-rigbox` into the VM env. Open WebUI reads
both natively — it thinks it's talking to OpenAI. The proxy authenticates,
**meters credits against your workspace**, and forwards to whichever
OpenRouter model the chat picked. No `.env`, no rate-limit guesswork, no key
rotation.

Defaults are tuned for the free tier: the model picker pins three free
OpenRouter models (`rigbox/free`, Qwen Coder, Llama 3.3 70B), and
`DEFAULT_MODEL_PARAMS` caps `max_tokens` at 4096 so a runaway chat can't burn
the budget.

## Docker build + the hybrid deploy

Open WebUI's install is heavy — it pins a `cp312` torch wheel, so we use **uv**
to materialize a Python 3.12 venv in the image (the base ships 3.11), then
install `torch-cpu` + `open-webui` from PyPI into it. Everything frozen once:

```dockerfile
FROM rigbox-base
RUN uv python install 3.12 \
 && uv venv --python 3.12 ~/.open-webui/venv \
 && uv pip install <torch-cpu wheel> open-webui==0.9.4
```

- **First `rig deploy`**: builds the image (multi-minute), boots from it.
- **Later `rig deploy`**: cached image reused, no re-install. Bump
  `APP_VERSION` in the Dockerfile to upgrade.

## Deploy

```bash
cd open-webui && rig deploy
```

Then open the app's Rigbox subdomain, register the first account (it becomes
admin because `ENABLE_SIGNUP: False` flips off after the first user), and chat.

## Notes

- **Persistence: yes.** `webui.db` (chat history + config) lives under
  `DATA_DIR=/home/developer/.open-webui/data`, outside the rsync zone.
- **`ENABLE_SIGNUP=False`** keeps this single-tenant. Drop it for multi-user.
- **Health probe**: `GET /health` once the SvelteKit bundle is built; the
  `timeoutSeconds: 600` covers the first-boot DB migration on a cold start.
- **Stack**: Open WebUI (SvelteKit + FastAPI + SQLite) pointed at the Rigbox
  managed proxy.
