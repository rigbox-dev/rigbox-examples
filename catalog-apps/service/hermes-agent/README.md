# Hermes Agent — Rigbox example

Runs [Hermes Agent](https://github.com/NousResearch/hermes-agent) on Rigbox —
NousResearch's self-improving AI agent fronted by a web dashboard, with a
separate multi-platform messaging gateway (Telegram, Discord, Slack, WhatsApp,
Signal) you can enable per platform from the same workspace.

## The single capability: one dashboard, six chat platforms

The distinctive thing here isn't "another chat UI." Hermes ships **two pieces
that coexist in one VM**:

- The **dashboard** — a Vite SPA + FastAPI backend (this is what `port: 9119`
  exposes through the rigbox subdomain). You manage models, prompts, and
  conversations here.
- The **messaging gateway** — a separate user-bus systemd unit
  (`hermes-gateway.service`) that bridges the same agent to Telegram / Discord
  / Slack / WhatsApp / Signal. Drop a bot token into the matching param, SSH
  in once to run `hermes gateway enable <platform> && systemctl --user enable
  --now hermes-gateway.service`, and the agent is reachable from that chat
  network too.

The dashboard speaks to whichever LLM you point it at — including the **Rigbox
managed AI proxy** (no key required, billed to workspace credits) via
`ai: { managed: true }` in `rig.yaml`. Hermes reads the proxy-injected
`OPENROUTER_API_KEY` / `OPENAI_API_KEY` natively, so no code wiring is needed.

## The upstream installer, frozen once

The upstream installer is heavy — uv, Python 3.11, Node 22, Playwright, and a
Vite SPA build — so `install:` runs it once and the result is frozen into the
image. The SPA bundle is pre-built here on purpose: `hermes dashboard` would
otherwise run `npm ci && npm run build` lazily on the first request and blow
the readiness probe.

```yaml
reproducible: true
install: |
  set -euo pipefail
  export HERMES_HOME=/home/developer/.hermes
  curl -fsSL https://raw.githubusercontent.com/NousResearch/hermes-agent/main/scripts/install.sh \
    | bash -s -- --skip-setup
  …                                       # npm ci && npm run build → hermes_cli/web_dist/
  …                                       # trim install-only caches, ensure ~/.local/bin/hermes
```

No Dockerfile — `install:` is the same script a plain deploy would run on the
VM (as `developer`, exactly the user the upstream installer expects);
`reproducible: true` is what makes `rig deploy` freeze its result. It's
idempotent: the SPA build is skipped when `web_dist/index.html` is already
there, and the launcher shim is only rewritten when the installer truncated it.

## Reproducible deploy + the hybrid model

- **First `rig deploy`**: boots a throwaway builder VM from the `base` image,
  runs `install:` inside it (multi-minute — uv, Node 22, Playwright, the Vite
  build), snapshots the rootfs as a content-addressed image, boots the
  workspace from it.
- **Later `rig deploy`**: if the build inputs (`install:` script, base image)
  are unchanged, it **reuses the cached image** — no re-install, fast.

> This install (uv-managed CPython, a Node 22 toolchain, and the SPA build tree)
> outgrows the 3GB default even after the cache trim. The builder takes its disk
> from `workspace.resources.diskSizeMb`, which is `4096` here; see the repo
> README.

## Deploy

```bash
cd hermes-agent && rig deploy
```

Then open the dashboard at the app's Rigbox subdomain. To bring up Telegram:
set the `telegram_bot_token` param (`rig app param set telegram_bot_token=…`),
SSH in once and run `hermes gateway enable telegram && systemctl --user enable
--now hermes-gateway.service`.

## Notes

- **Persistence: yes.** Hermes' session state, encryption material, and the
  `.env` live under `$HERMES_HOME=/home/developer/.hermes` (outside the rsync
  zone), so redeploys preserve your config and chat history.
- **Why `--insecure` in `start`.** Hermes' `web_server.start_server` refuses
  non-loopback binds without it; the rigbox subdomain layer is the real trust
  boundary. Don't drop it without auth-gating differently.
- **Health probe**: `GET /api/status` is the only endpoint that doesn't require
  a session token, so it's what the readiness probe hits.
- **Browser automation.** `install:` trims `~/.cache/ms-playwright` along with
  the other installer caches (it's a build cache, not a runtime dependency of
  the dashboard); Hermes re-fetches a browser on demand if you use a tool that
  needs one.
