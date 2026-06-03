# Junie — Rigbox example

Runs [**Junie**](https://www.jetbrains.com/junie/) — JetBrains' AI coding agent
— on Rigbox. You SSH in and run `junie`. Junie distinguishes itself with a
JetBrains-bundled binary that ships with the npm package, so the install pulls
a chunky postinstall archive — by baking it into a `FROM rigbox-base` image
once, every deploy avoids the slow re-download.

## The single capability: a heavy postinstall, frozen into the image

The whole point here is **freezing a slow install once** so deploys boot fast.
Junie's npm package runs a postinstall step that fetches a JetBrains-bundled
binary archive — easily 30–60 seconds on a fresh VM. The `Dockerfile` is
`FROM rigbox-base` (the required base — the platform asserts the rigbox agent
+ systemd are present and rejects any other base at build time) and bakes the
fully-installed CLI into the image once:

```dockerfile
FROM rigbox-base
RUN su - developer -s /bin/bash -c 'npm install -g --no-fund --silent @jetbrains/junie-cli'
RUN ln -sfn /home/developer/.npm-global/bin/junie /usr/local/bin/junie
```

`rig.yaml` points at it with a `build:` block (no `install:`):

```yaml
build:
  dockerfile: Dockerfile
```

## SSH-in to use it

Junie is a TUI — there is **no web UI**. The `port: 8080` in `rig.yaml` is just
a static landing page (`python3 -m http.server` serving
`/opt/landing/index.html`) so the platform's "every app has a front door"
health probe stays green. The real UX is SSH:

```bash
ssh "$(rig workspace ssh-info --workspace <name-or-id> --output json | jq -r .ssh_target)"
junie
```

## OpenRouter routing, one rename

Junie reads `JUNIE_OPENROUTER_API_KEY` first, then falls back to the generic
`OPENROUTER_API_KEY`. The image's `/etc/profile.d/junie-routing.sh` re-exports
the generic key as the Junie-specific one, so a single `OPENROUTER_API_KEY` at
deploy time wires it up:

```sh
# baked into the image, sourced by every login shell
if [ -n "$OPENROUTER_API_KEY" ] && [ -z "$JUNIE_OPENROUTER_API_KEY" ]; then
  export JUNIE_OPENROUTER_API_KEY="$OPENROUTER_API_KEY"
fi
```

## Deploy

```bash
export OPENROUTER_API_KEY=sk-or-...
cd junie && rig deploy
```

The `secrets:` block in `rig.yaml` forwards `OPENROUTER_API_KEY` from your
local shell into the workspace.

## Notes

- **Persistence: yes.** `~/.local/share/junie` (the cached JetBrains-bundled
  binary + agent state) lives on the workspace disk, outside the rsync zone —
  durable across redeploys.
- **No public UI.** The HTTP front door is auth-gated by the Rigbox gateway and
  only shows a "SSH in to use the CLI" landing page. Don't set this app
  `public` — the CLI is the value, not the page.
- **Disk: 4096MB.** Sized to comfortably hold the JetBrains-bundled archive
  Junie downloads on top of any project repo you check out.
