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

## Docker build + the hybrid deploy

The upstream installer is heavy — uv, Python 3.11, Node 22, Playwright + a
Chromium download, and a Vite SPA build — so it's frozen into the image once:

```dockerfile
FROM rigbox-base
RUN curl -fsSL https://.../scripts/install.sh | bash -s -- --skip-setup
# … then `npm ci && npm run build` to pre-bake hermes_cli/web_dist/ …
```

- **First `rig deploy`**: builds the image (multi-minute), boots from it.
- **Later `rig deploy`**: cached image reused, no re-install.

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
