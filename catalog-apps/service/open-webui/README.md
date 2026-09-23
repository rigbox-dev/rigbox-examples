# Open WebUI — Rigbox example

[![Deploy to Rigbox](https://rigbox.dev/deploy.svg)](https://rigbox.dev/deploy?repo=rigbox-dev%2Frigbox-examples&ref=main&path=catalog-apps%2Fservice%2Fopen-webui%2Frig.yaml)

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

That injects `OPENAI_BASE_URL` pointing at the Rigbox proxy and
`OPENAI_API_KEY=managed-by-rigbox`. `start.sh` maps the URL to
`OPENAI_API_BASE_URL`, which Open WebUI reads. The proxy authenticates,
**meters credits against your workspace**, and forwards to whichever
OpenRouter model the chat picked. No `.env`, no rate-limit guesswork, no key
rotation.

Defaults are tuned for the free tier: the model picker pins three free
OpenRouter models (`rigbox/free`, Qwen Coder, Llama 3.3 70B), and
`DEFAULT_MODEL_PARAMS` caps `max_tokens` at 4096 so a runaway chat can't burn
the budget.

## The heavy install, frozen once

Open WebUI pins a `cp312` torch wheel and the Rigbox base ships Debian's Python
3.11, so `install:` uses **uv** to materialize a 3.12 venv and installs the CPU
torch wheel + `open-webui` into it. That whole tree is frozen into the image:

```yaml
reproducible: true
install: |
  set -euo pipefail
  APP_HOME=/home/developer/.open-webui
  APP_VERSION=0.9.4
  uv python install 3.12
  uv venv --clear --python 3.12 "$APP_HOME/venv"
  uv pip install --no-cache --python "$APP_HOME/venv/bin/python" \
    "$TORCH_CPU_WHEEL_URL" "open-webui==${APP_VERSION}"
```

No Dockerfile — `install:` is the same script a plain deploy would run on the
VM (as `developer`, who owns `$APP_HOME`, so no `sudo` is needed here);
`reproducible: true` is what makes `rig deploy` freeze its result. `start.sh`
passes the generated admin credential to Open WebUI and runs the frozen binary.

## Reproducible deploy + the hybrid model

- **First `rig deploy`**: boots a throwaway builder VM from the `base` image,
  runs `install:` inside it (torch + open-webui — multi-minute), snapshots the
  rootfs as a content-addressed image, boots the workspace from it.
- **Later `rig deploy`**: if the build inputs (`install:` script, base image)
  are unchanged, it **reuses the cached image** — no re-install, fast. Bump
  `APP_VERSION` in `install:` to upgrade.

> This install is the largest in the catalog subtree — the CPU torch wheel alone
> is most of a gigabyte on top of a full CPython 3.12. The builder takes its disk
> from `workspace.resources.diskSizeMb`, which is `8192` here for exactly that
> reason; see the repo README.

## Deploy

```bash
cd open-webui && rig deploy
```

Open the app's private Rigbox subdomain and sign in with `admin@example.com`
(or your `admin_email` parameter) and the generated `admin_password` credential
shown by Rigbox. Open WebUI creates this administrator on first boot; public
account registration is disabled.

## Notes

- **Persistence.** `webui.db` lives under
  `DATA_DIR=/home/developer/.open-webui/data`. Local code-only redeploys preserve
  it; GitHub image deployments replace the root filesystem. Back it up before
  an image deployment if you need to retain chat history and configuration.
- **`ENABLE_SIGNUP=False`** keeps this single-tenant. Drop it for multi-user.
- **Health probe**: `GET /health` once the SvelteKit bundle is built; the
  `timeoutSeconds: 600` covers the first-boot DB migration on a cold start.
- **Stack**: Open WebUI (SvelteKit + FastAPI + SQLite) on a uv-managed Python
  3.12 venv, frozen into the reproducible image, pointed at the Rigbox managed
  proxy.

## Deployment strategy

This example explicitly uses `workspace.deployment.strategy: image` because its installer changes system packages, global executable paths, or shared tool configuration. The badge review shows image replacement and requires permission before replacing an existing workspace root filesystem. It is not an incremental app release. Use a dedicated workspace and back up root-filesystem development files; persistent volumes are retained. Migrating this installer to app-local releases remains separate work.
