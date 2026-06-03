# Claude Code — Rigbox example

Runs [**Claude Code**](https://docs.anthropic.com/en/docs/claude-code/overview) —
Anthropic's AI coding agent — on Rigbox. The CLI lives inside the workspace; you
SSH in and run `claude`. It can plan, read, edit, and ship across an entire
codebase from a single terminal session, with model routing through
[OpenRouter](https://openrouter.ai) so you keep one key for every provider.

## The single capability: a long-lived AI-agent workspace, baked into an image

The whole point here is running an **AI coding CLI on a persistent VM** instead
of locally — your repo, history, and `.claude/` config survive across sessions
and across deploys. The `Dockerfile` is `FROM rigbox-base` (the required base —
the platform asserts the rigbox agent + systemd are present and rejects any
other base at build time) and bakes the upstream installer's binary into the
image once:

```dockerfile
FROM rigbox-base
RUN su - developer -s /bin/bash -c '...curl -fsSL https://claude.ai/install.sh | bash...'
RUN ln -sfn /home/developer/.local/bin/claude /usr/local/bin/claude
```

`rig.yaml` points at it with a `build:` block (no `install:`):

```yaml
build:
  dockerfile: Dockerfile
```

## SSH-in to use it

Claude Code is a TUI — there is **no web UI**. The `port: 8080` in `rig.yaml` is
just a static landing page (`python3 -m http.server` serving
`/opt/landing/index.html`) so the platform's "every app has a front door"
health probe stays green. The real UX is SSH:

```bash
ssh "$(rig workspace ssh-info --workspace <name-or-id> --output json | jq -r .ssh_target)"
claude
```

The onboarding wizard is pre-accepted at image-build time
(`~/.claude.json` + `~/.claude/settings.json`), so `claude` drops you straight
into a session — no first-launch prompts.

## OpenRouter routing, no env-var wrangling

Claude Code reads `ANTHROPIC_BASE_URL` + `ANTHROPIC_AUTH_TOKEN`. You set
`OPENROUTER_API_KEY` once; the image's `/etc/profile.d/claude-routing.sh`
translates it on every shell start:

```sh
# baked into the image, sourced by every login shell
export ANTHROPIC_BASE_URL="${OPENROUTER_BASE_URL%/v1}"
export ANTHROPIC_AUTH_TOKEN="${OPENROUTER_API_KEY}"
export ANTHROPIC_API_KEY=""   # AUTH_TOKEN wins; clear API_KEY so it can't override
```

So an SSH session just works — no `export` dance.

## Deploy

```bash
export OPENROUTER_API_KEY=sk-or-...
cd claude && rig deploy
```

The `secrets:` block in `rig.yaml` forwards `OPENROUTER_API_KEY` from your
local shell into the workspace.

## Notes

- **Persistence: yes.** `~/.claude/` (history, project state) lives on the
  workspace disk, outside the rsync zone — durable across redeploys.
- **No public UI.** The HTTP front door is auth-gated by the Rigbox gateway and
  only shows a "SSH in to use the CLI" landing page. Don't set this app
  `public` — the CLI is the value, not the page.
- **Onboarding bypass.** `hasCompletedOnboarding` + `bypassPermissionsModeAccepted`
  are written at image-build time so `claude` is non-interactive on first launch.
