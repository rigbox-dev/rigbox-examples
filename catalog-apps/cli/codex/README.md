# Codex CLI — Rigbox example

Runs [**Codex CLI**](https://github.com/openai/codex) — OpenAI's lightweight
coding agent for the terminal — on Rigbox. The CLI lives inside the workspace;
you SSH in and run `codex`. It's the OpenAI-shaped counterpart to Claude Code:
small, fast, and natively speaks the OpenAI API, which makes it trivial to
point at [OpenRouter](https://openrouter.ai) (or any OpenAI-compatible proxy)
without provider-specific config.

## The single capability: an OpenAI-shaped AI agent baked into an image

The whole point here is **running an OpenAI-API-compatible AI CLI on a
persistent VM** — your repo, history, and `~/.codex/` config survive across
sessions and across deploys. The `Dockerfile` is `FROM rigbox-base` (the
required base — the platform asserts the rigbox agent + systemd are present and
rejects any other base at build time) and bakes the npm-published binary into
the image once:

```dockerfile
FROM rigbox-base
RUN su - developer -s /bin/bash -c 'npm install -g --no-fund --silent @openai/codex'
RUN ln -sfn /home/developer/.npm-global/bin/codex /usr/local/bin/codex
```

`rig.yaml` points at it with a `build:` block (no `install:`):

```yaml
build:
  dockerfile: Dockerfile
```

## SSH-in to use it

Codex CLI is a TUI — there is **no web UI**. The app is declared with
`kind: cli`, so `rig.yaml` carries no `port`, `start`, or `health` — the
platform doesn't expect an HTTP front door. The real UX is SSH:

```bash
ssh "$(rig workspace ssh-info --workspace <name-or-id> --output json | jq -r .ssh_target)"
codex
```

## OpenRouter routing, one rename

Codex CLI reads `OPENAI_BASE_URL` + `OPENAI_API_KEY`. OpenRouter speaks the
OpenAI API at `/v1`, so the image's `/etc/profile.d/codex-routing.sh` just
renames the env vars on every shell start:

```sh
# baked into the image, sourced by every login shell
export OPENAI_BASE_URL="${OPENROUTER_BASE_URL%/}"   # already ends in /v1
export OPENAI_API_KEY="${OPENROUTER_API_KEY}"
```

You set `OPENROUTER_API_KEY` once at deploy time; an SSH session just works.

## Deploy

```bash
export OPENROUTER_API_KEY=sk-or-...
cd codex && rig deploy
```

The `secrets:` block in `rig.yaml` forwards `OPENROUTER_API_KEY` from your
local shell into the workspace.

## Notes

- **Persistence: yes.** `~/.codex/` (history, session state) lives on the
  workspace disk, outside the rsync zone — durable across redeploys.
- **No public UI.** `kind: cli` means there's no HTTP front door at all — the
  workspace is reachable only via SSH on the rigbox gateway.
- **`OPENAI_API_KEY` is set inside the VM**, but it's an OpenRouter key — Codex
  doesn't care, OpenAI-API-compatible is OpenAI-API-compatible.
