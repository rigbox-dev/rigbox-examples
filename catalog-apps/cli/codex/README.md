# Codex CLI — Rigbox example

[![Deploy to Rigbox](https://rigbox.dev/deploy.svg)](https://rigbox.dev/deploy?repo=rigbox-dev%2Frigbox-examples&ref=main&path=catalog-apps%2Fcli%2Fcodex%2Frig.yaml)

Runs [**Codex CLI**](https://github.com/openai/codex) — OpenAI's lightweight
coding agent for the terminal — on Rigbox. The CLI lives inside the workspace;
you SSH in and run `codex`. It's the OpenAI-shaped counterpart to Claude Code:
small, fast, and natively speaks the OpenAI API, which makes it trivial to
point at Rigbox's **managed AI proxy** (an OpenAI-compatible endpoint) — no API
key to set, so deploying is never blocked on a local secret.

## The single capability: an OpenAI-shaped AI agent frozen into an image

The whole point here is **running an OpenAI-API-compatible AI CLI on a
persistent VM** — your repo, history, and `~/.codex/` config survive across
sessions and across deploys. `rig.yaml` sets `reproducible: true`, so
`rig deploy` runs the `install:` script once in a builder VM, freezes the
result as an image, and later deploys boot from it instead of re-running
`npm install`:

```yaml
reproducible: true
install: |
  set -euo pipefail
  npm install -g --no-fund --silent @openai/codex          # → ~/.npm-global/bin/codex
  sudo ln -sfn "$HOME/.npm-global/bin/codex" /usr/local/bin/codex
  sudo tee /etc/profile.d/codex-routing.sh <<'EOF'
  …                                                       # supplies $OPENAI_API_KEY, below
  EOF
  cat > "$HOME/.codex/config.toml" <<'EOF'
  …                                                       # managed-AI provider, below
  EOF
```

No Dockerfile — `install:` is the same script a plain deploy would run on the
VM (as `developer`, with passwordless `sudo` for the system-path steps);
`reproducible: true` is what makes `rig deploy` freeze its result.

## SSH-in to use it

Codex CLI is a TUI — there is **no web UI**. The app is declared with
`kind: cli`, so `rig.yaml` carries no `port`, `start`, or `health` — the
platform doesn't expect an HTTP front door. The real UX is SSH:

```bash
ssh "$(rig workspace ssh-info --workspace <name-or-id> --output json | jq -r .ssh_target)"
codex
```

## Managed AI routing, no key to set

`rig.yaml` opts into the workspace's managed AI proxy:

```yaml
ai:
  managed: true
```

Codex 0.137+ reads its provider from `~/.codex/config.toml`, not env vars, and
only speaks the Responses wire. `install:` writes a config that declares the
managed proxy as a custom provider (plain HTTP, no websocket):

```toml
model = "anthropic/claude-sonnet-4.5"
model_provider = "rigbox"

[model_providers.rigbox]
base_url = "http://172.16.0.1:9090/v1"
env_key = "OPENAI_API_KEY"
wire_api = "responses"
```

The API key comes from `$OPENAI_API_KEY`; the `/etc/profile.d/codex-routing.sh`
that `install:` writes sources the managed proxy's `~/.rigbox/proxy.env` to
supply the placeholder. An SSH session just works — no key, no `export` dance.

## Deploy

```bash
cd codex && rig deploy
```

No secret required — `ai: managed: true` routes Codex through the workspace's
managed AI proxy (your account's AI mode must be `managed`, which is the
default).

## Notes

- **Persistence: yes.** `~/.codex/` (history, session state) lives on the
  workspace disk, outside the rsync zone — durable across redeploys.
- **No public UI.** `kind: cli` means there's no HTTP front door at all — the
  workspace is reachable only via SSH on the rigbox gateway.
- **`OPENAI_API_KEY` inside the VM is a placeholder** (`managed-by-rigbox`); the
  managed proxy authenticates by source IP, not by the key, and meters usage to
  your account.
