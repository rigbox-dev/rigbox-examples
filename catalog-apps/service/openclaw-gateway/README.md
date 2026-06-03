# OpenClaw Gateway — Rigbox example

Runs [OpenClaw](https://www.npmjs.com/package/openclaw)'s gateway on Rigbox —
the **WebSocket control plane** that the Clawd browser dashboard talks to.
This isn't a user-facing chat app; it's the relay your browser UI connects to
in order to drive a remote agent.

## The single capability: a token-auth wss:// gateway backed by managed AI

The distinctive thing here is the **runtime config synthesis** in
`gateway.js`. OpenClaw normally expects a hand-written `openclaw.json` and an
`auth-profiles.json` on disk; for ephemeral VMs that's painful. This wrapper
generates both at every boot:

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

## Docker build + the hybrid deploy

```dockerfile
FROM rigbox-base
RUN npm install -g openclaw@2026.4.29
COPY gateway.js rigbox-openclaw-gateway /home/developer/.openclaw/bin/
```

- **First `rig deploy`**: builds the image (npm install OpenClaw), boots from
  it.
- **Later `rig deploy`**: cached image reused. Bump `OPENCLAW_VERSION` in the
  Dockerfile to upgrade.

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
