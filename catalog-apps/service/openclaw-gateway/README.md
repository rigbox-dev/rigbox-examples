# OpenClaw Gateway — Rigbox example

[![Deploy to Rigbox](https://rigbox.dev/deploy.svg)](https://rigbox.dev/deploy?repo=rigbox-dev%2Frigbox-examples&ref=main&path=catalog-apps%2Fservice%2Fopenclaw-gateway%2Frig.yaml)

Runs [OpenClaw](https://www.npmjs.com/package/openclaw)'s gateway on Rigbox —
the **WebSocket control plane** that the Clawd browser dashboard talks to.
This isn't a user-facing chat app; it's the relay your browser UI connects to
in order to drive a remote agent.

## The single capability: a token-auth wss:// gateway backed by managed AI

The distinctive thing here is the **runtime config synthesis** in
`gateway.js`. OpenClaw normally expects a hand-written `openclaw.json` and an
`auth-profiles.json` on disk; for ephemeral VMs that's painful. `start.sh` runs
`gateway.js` first and generates both at every boot:

- **Managed mode** (default): `AI_PROXY_URL` is injected by `ai: { managed:
  true }`. The wrapper writes a `rigbox-openrouter` provider entry pointed at
  the proxy's `/v1` endpoint with the `managed-by-rigbox` placeholder key, and
  OpenClaw routes every conversation through it.
- **BYO mode**: set `ANTHROPIC_API_KEY` / `GEMINI_API_KEY` / `OPENAI_API_KEY`
  via `rig app secret set` and the wrapper writes that key into the
  auth-profile instead.

The `gateway_token` credential (`generate: true`) is minted once per deploy —
the dashboard reads it via `rig app credentials get gateway_token` and uses it
to authenticate the `wss://` handshake.

## The install, frozen once

Only one thing is heavy here — the global npm install of OpenClaw — so that's
what gets frozen:

```yaml
reproducible: true
install: |
  set -euo pipefail
  OPENCLAW_VERSION=2026.4.29
  npm config set prefix "$HOME/.npm-global"
  export PATH="$HOME/.npm-global/bin:$PATH"
  export NODE_ENV=production
  npm install -g --no-fund --no-audit --omit=dev "openclaw@${OPENCLAW_VERSION}"
  openclaw --version >/dev/null
```

No Dockerfile — `install:` is the same script a plain deploy would run on the
VM (as `developer`, into a user-writable npm prefix so root is never required);
`reproducible: true` is what makes `rig deploy` freeze its result.

## Reproducible deploy + the hybrid model

The deploy is **hybrid**, and the split matters for this app: the image carries
the OpenClaw runtime, while `start.sh` and `gateway.js` — the per-boot config
synthesis — **rsync in with the app**, so you can iterate on the wrapper without
rebuilding anything.

- **First `rig deploy`**: boots a throwaway builder VM from the `base` image,
  runs `install:` inside it (`npm install -g openclaw`), snapshots the rootfs
  as a content-addressed image, boots the workspace from it.
- **Later `rig deploy`**: if the build inputs (`install:` script, base image)
  are unchanged, it **reuses the cached image** — no re-install, fast. Bump
  `OPENCLAW_VERSION` in `install:` to upgrade.

## Deploy

```bash
cd openclaw-gateway && rig deploy
rig app credentials get gateway_token   # copy this into the Clawd UI
```

Then point the Clawd browser dashboard at the gateway's Rigbox subdomain with
that token. With managed AI on, your conversations go through workspace
credits — no per-provider key required.

## Notes

- **WebSocket, not HTTP.** No health probe is wired here; the rigbox subdomain
  routes WebSocket upgrades to 18789 once the systemd unit is up.
- **Trust boundary** is the rigbox subdomain layer + the gateway token. The
  Control UI's device-pairing flow is bypassed
  (`dangerouslyDisableDeviceAuth`) because device pairing isn't workable for
  ephemeral VMs — token auth is the only guard.
- **Persistence**: OpenClaw's runtime state lives under `~/.openclaw`. The
  `openclaw.json` / `auth-profiles.json` are regenerated on every boot, so
  changing a param + redeploying picks up the new config immediately.

## Deployment strategy

This example explicitly uses `workspace.deployment.strategy: image` because its installer changes system packages, global executable paths, or shared tool configuration. The badge review shows image replacement and requires permission before replacing an existing workspace root filesystem. It is not an incremental app release. Use a dedicated workspace and back up root-filesystem development files; persistent volumes are retained. Migrating this installer to app-local releases remains separate work.
