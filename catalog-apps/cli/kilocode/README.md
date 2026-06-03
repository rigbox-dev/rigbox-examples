# Kilo Code — Rigbox example

Runs [**Kilo Code**](https://kilocode.ai) — an all-in-one AI coding CLI that
fronts 100+ providers behind one binary — on Rigbox. You SSH in and run
`kilocode`. Where Claude Code is Anthropic-shaped and Codex CLI is OpenAI-shaped,
Kilo's distinguishing capability is **provider portability**: pick the provider
in env (`KILO_PROVIDER_TYPE`) and swap it out without touching install scripts.

## The single capability: a multi-provider agent, pinned to OpenRouter in image

The whole point here is **running a provider-agnostic AI CLI** while pinning
the choice (OpenRouter) at image-build time so a fresh SSH session is
immediately wired up. The `Dockerfile` is `FROM rigbox-base` (the required
base — the platform asserts the rigbox agent + systemd are present and rejects
any other base at build time), bakes the npm-published CLI into the image, and
drops a profile.d shim that exports `KILO_PROVIDER_TYPE=openrouter` on every
shell start:

```dockerfile
FROM rigbox-base
RUN su - developer -s /bin/bash -c 'npm install -g --no-fund --silent @kilocode/cli'
RUN ln -sfn /home/developer/.npm-global/bin/kilocode /usr/local/bin/kilocode
```

`rig.yaml` points at it with a `build:` block (no `install:`):

```yaml
build:
  dockerfile: Dockerfile
```

## SSH-in to use it

Kilo Code is a TUI — there is **no web UI**. The `port: 8080` in `rig.yaml` is
just a static landing page (`python3 -m http.server` serving
`/opt/landing/index.html`) so the platform's "every app has a front door"
health probe stays green. The real UX is SSH:

```bash
ssh "$(rig workspace ssh-info --workspace <name-or-id> --output json | jq -r .ssh_target)"
kilocode
```

## OpenRouter routing, two-line shim

Kilo Code reads `KILO_PROVIDER_TYPE` and `KILO_OPEN_ROUTER_API_KEY`. The
image's `/etc/profile.d/kilocode-routing.sh` pins the provider and maps the
generic key on every shell start:

```sh
# baked into the image, sourced by every login shell
export KILO_PROVIDER_TYPE="openrouter"
export KILO_OPEN_ROUTER_API_KEY="${OPENROUTER_API_KEY}"
```

Want a different provider (Anthropic-direct, OpenAI-direct, …)? Override
`KILO_PROVIDER_TYPE` in `rig.yaml`'s `env:` block and forward the matching
provider key as a `secret`.

## Deploy

```bash
export OPENROUTER_API_KEY=sk-or-...
cd kilocode && rig deploy
```

The `secrets:` block in `rig.yaml` forwards `OPENROUTER_API_KEY` from your
local shell into the workspace.

## Notes

- **Persistence: yes.** `~/.local/share/kilo` (session state, project config)
  lives on the workspace disk, outside the rsync zone — durable across
  redeploys.
- **No public UI.** The HTTP front door is auth-gated by the Rigbox gateway and
  only shows a "SSH in to use the CLI" landing page. Don't set this app
  `public` — the CLI is the value, not the page.
- **Pinned at image-build time, overridable at deploy time.** The profile.d
  shim pins OpenRouter as the default; nothing stops you from `export`-ing a
  different `KILO_PROVIDER_TYPE` inside a session.
