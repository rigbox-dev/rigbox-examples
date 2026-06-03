# OpenCode — Rigbox example

Runs [**OpenCode**](https://opencode.ai) — the open-source, terminal-first AI
coding agent — on Rigbox. It's a single static Go binary, ships as a TUI, and
reads `OPENROUTER_API_KEY` directly without any env-var translation. You SSH
in and run `opencode`.

## The single capability: a single-binary OSS agent with native OpenRouter

The whole point here is **running the OSS terminal agent on a persistent VM**
with no glue code. Where Claude Code and Codex CLI need a `/etc/profile.d/…`
shim to translate provider env vars, OpenCode reads `OPENROUTER_API_KEY`
itself — set it once at deploy time and you're done.

The `Dockerfile` is `FROM rigbox-base` (the required base — the platform asserts
the rigbox agent + systemd are present and rejects any other base at build
time) and bakes the upstream Go binary into the image once:

```dockerfile
FROM rigbox-base
RUN su - developer -s /bin/bash -c 'curl -fsSL https://opencode.ai/install | bash'
RUN ln -sfn /home/developer/.opencode/bin/opencode /usr/local/bin/opencode
```

`rig.yaml` points at it with a `build:` block (no `install:`):

```yaml
build:
  dockerfile: Dockerfile
```

## SSH-in to use it

OpenCode is a TUI — there is **no web UI**. The `port: 8080` in `rig.yaml` is
just a static landing page (`python3 -m http.server` serving
`/opt/landing/index.html`) so the platform's "every app has a front door"
health probe stays green. The real UX is SSH:

```bash
ssh "$(rig workspace ssh-info --workspace <name-or-id> --output json | jq -r .ssh_target)"
opencode
```

## Native OpenRouter, no shim

OpenCode reads `OPENROUTER_API_KEY` directly. The image's
`/etc/profile.d/opencode-routing.sh` only puts `~/.opencode/bin` on `PATH`
for non-interactive login shells — there's no env-translation block because
none is needed. That's the whole pitch versus Claude/Codex: one less moving
part.

## Deploy

```bash
export OPENROUTER_API_KEY=sk-or-...
cd opencode && rig deploy
```

The `secrets:` block in `rig.yaml` forwards `OPENROUTER_API_KEY` from your
local shell into the workspace.

## Notes

- **Persistence: yes.** `~/.opencode/` (session state, project config) lives
  on the workspace disk, outside the rsync zone — durable across redeploys.
- **No public UI.** The HTTP front door is auth-gated by the Rigbox gateway and
  only shows a "SSH in to use the CLI" landing page. Don't set this app
  `public` — the CLI is the value, not the page.
- **Stack:** Go binary from the upstream installer; the `~/.opencode/bin`
  path (and the legacy `~/.local/bin` fallback) are both pre-added to PATH so
  the binary is reachable from any login shell.
