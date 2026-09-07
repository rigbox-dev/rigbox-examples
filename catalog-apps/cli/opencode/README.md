# OpenCode — Rigbox example

[![Deploy to Rigbox](https://rigbox.dev/deploy.svg)](https://rigbox.dev/deploy?repo=rigbox-dev%2Frigbox-examples&ref=main&path=catalog-apps%2Fcli%2Fopencode%2Frig.yaml)

Runs [**OpenCode**](https://opencode.ai) — the open-source, terminal-first AI
coding agent — on Rigbox. It's a single static Go binary, ships as a TUI, and
routes through Rigbox's **managed AI proxy** via a provider config written at
install time — no API key to set. You SSH in and run `opencode`.

## The single capability: a single-binary OSS agent, zero-key managed AI

The whole point here is **running the OSS terminal agent on a persistent VM**
with no glue code. `install:` writes an `opencode.json` that registers a custom
OpenAI-compatible provider pointed at the workspace's managed AI proxy, so
`opencode` works on first SSH — nothing to set, no key to forward.

`rig.yaml` sets `reproducible: true`, so `rig deploy` runs the `install:`
script once in a builder VM, freezes the upstream Go binary (and that config)
as an image, and later deploys boot from it instead of re-running the
installer:

```yaml
reproducible: true
install: |
  set -euo pipefail
  curl -fsSL https://opencode.ai/install | bash            # → ~/.opencode/bin/opencode
  sudo ln -sfn "$HOME/.opencode/bin/opencode" /usr/local/bin/opencode
  sudo tee /etc/profile.d/opencode-routing.sh <<'EOF'
  …                                                       # PATH for login shells, below
  EOF
  cat > "$HOME/.config/opencode/opencode.json" <<'EOF'
  …                                                       # managed-AI provider, below
  EOF
```

No Dockerfile — `install:` is the same script a plain deploy would run on the
VM (as `developer`, with passwordless `sudo` for the system-path steps);
`reproducible: true` is what makes `rig deploy` freeze its result.

## SSH-in to use it

OpenCode is a TUI — there is **no web UI**. The app is declared with
`kind: cli`, so `rig.yaml` carries no `port`, `start`, or `health` — the
platform doesn't expect an HTTP front door. The real UX is SSH:

```bash
ssh "$(rig workspace ssh-info --workspace <name-or-id> --output json | jq -r .ssh_target)"
opencode
```

## Managed AI via a provider config

OpenCode's provider, base URL, key, and model live in a config file, not env
vars. `install:` writes `~/.config/opencode/opencode.json` with a custom
`@ai-sdk/openai-compatible` provider pointed at the managed proxy:

```jsonc
{
  "model": "rigbox/anthropic/claude-sonnet-4.5",
  "provider": {
    "rigbox": {
      "npm": "@ai-sdk/openai-compatible",
      "options": { "baseURL": "http://172.16.0.1:9090/v1", "apiKey": "managed-by-rigbox" }
    }
  }
}
```

The `/etc/profile.d/opencode-routing.sh` that `install:` writes only puts
`~/.opencode/bin` on `PATH` for non-interactive login shells — the AI wiring is
entirely in the config file.

## Deploy

```bash
cd opencode && rig deploy
```

No secret required — `ai: managed: true` routes OpenCode through the workspace's
managed AI proxy (your account's AI mode must be `managed`, which is the
default).

## Notes

- **Persistence: yes.** `~/.opencode/` (session state, project config) lives
  on the workspace disk, outside the rsync zone — durable across redeploys.
- **No public UI.** `kind: cli` means there's no HTTP front door at all — the
  workspace is reachable only via SSH on the rigbox gateway.
- **Stack:** Go binary from the upstream installer; the `~/.opencode/bin`
  path (and the legacy `~/.local/bin` fallback) are both pre-added to PATH so
  the binary is reachable from any login shell.
