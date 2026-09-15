# Claude Code — Rigbox example

[![Deploy to Rigbox](https://rigbox.dev/deploy.svg)](https://rigbox.dev/deploy?repo=rigbox-dev%2Frigbox-examples&ref=main&path=catalog-apps%2Fcli%2Fclaude%2Frig.yaml)

Runs [**Claude Code**](https://docs.anthropic.com/en/docs/claude-code/overview) —
Anthropic's AI coding agent — on Rigbox. The CLI lives inside the workspace; you
SSH in and run `claude`. It can plan, read, edit, and ship across an entire
codebase from a single terminal session, with model routing through Rigbox's
**managed AI proxy** — no API key to set, so deploying is never blocked on a
local secret.

## The single capability: a long-lived AI-agent workspace, frozen into an image

The whole point here is running an **AI coding CLI on a persistent VM** instead
of locally — your repo, history, and `.claude/` config survive across sessions
and across deploys. `rig.yaml` sets `reproducible: true`, so `rig deploy` runs
the `install:` script once in a builder VM, freezes the result as an image, and
later deploys boot from it instead of re-running the upstream installer:

```yaml
reproducible: true
install: |
  set -euo pipefail
  curl -fsSL https://claude.ai/install.sh | bash          # → ~/.local/bin/claude
  sudo ln -sfn "$HOME/.local/bin/claude" /usr/local/bin/claude
  sudo tee /etc/profile.d/claude-routing.sh <<'EOF'
  …                                                       # managed-AI routing, below
  EOF
```

No Dockerfile — `install:` is the same script a plain deploy would run on the
VM (as `developer`, with passwordless `sudo` for the system-path steps);
`reproducible: true` is what makes `rig deploy` freeze its result.

## SSH-in to use it

Claude Code is a TUI — there is **no web UI**. The app is declared with
`kind: cli`, so `rig.yaml` carries no `port`, `start`, or `health` — the
platform doesn't expect an HTTP front door. The real UX is SSH:

```bash
ssh "$(rig workspace ssh-info --workspace <name-or-id> --output json | jq -r .ssh_target)"
claude
```

The onboarding wizard is pre-accepted at install time
(`~/.claude.json` + `~/.claude/settings.json`), so `claude` drops you straight
into a session — no first-launch prompts.

## Managed AI routing, no key to set

`rig.yaml` opts into the workspace's managed AI proxy:

```yaml
ai:
  managed: true
```

Claude Code reads `ANTHROPIC_BASE_URL` + `ANTHROPIC_AUTH_TOKEN`. The managed
proxy serves the Anthropic `/v1/messages` shape, and the
`/etc/profile.d/claude-routing.sh` that `install:` writes points Claude at it on
every shell start:

```sh
# written by install:, sourced by every login shell
. ~/.rigbox/proxy.env                               # OPENAI_BASE_URL=<proxy>/v1, OPENAI_API_KEY=<placeholder>
export ANTHROPIC_BASE_URL="${OPENAI_BASE_URL%/v1}"  # Claude appends /v1/messages itself
export ANTHROPIC_AUTH_TOKEN="${OPENAI_API_KEY}"
export ANTHROPIC_API_KEY=""   # AUTH_TOKEN wins; clear API_KEY so it can't override
```

So an SSH session just works — no key, no `export` dance.

**Bring your own key instead?** Export `OPENROUTER_API_KEY` at deploy time and
the routing script prefers it, pointing Claude straight at OpenRouter.

## Deploy

```bash
cd claude && rig deploy
```

No secret required — `ai: managed: true` routes Claude through the workspace's
managed AI proxy (your account's AI mode must be `managed`, which is the
default).

## Notes

- **Persistence: yes.** `~/.claude/` (history, project state) lives on the
  workspace disk, outside the rsync zone — durable across redeploys.
- **No public UI.** `kind: cli` means there's no HTTP front door at all — the
  workspace is reachable only via SSH on the rigbox gateway.
- **Onboarding bypass.** `hasCompletedOnboarding` + `bypassPermissionsModeAccepted`
  are written by `install:` so `claude` is non-interactive on first launch.

## Deployment strategy

This example explicitly uses `workspace.deployment.strategy: image` because its installer changes system packages, global executable paths, or shared tool configuration. The badge review shows image replacement and requires permission before replacing an existing workspace root filesystem. It is not an incremental app release. Use a dedicated workspace and back up root-filesystem development files; persistent volumes are retained. Migrating this installer to app-local releases remains separate work.
