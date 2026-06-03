# T3 Code — Rigbox example

Runs [T3 Code](https://github.com/OpenRouterTeam/spawn) on Rigbox — a
browser-based AI workspace that hosts **Claude Code, Codex, and other coding
agents behind one web UI**. You pick the agent in the sidebar, T3 routes the
conversation to the right backend, and you never leave the browser tab.

## The single capability: multiple coding agents, one browser tab

Most CLI coding agents (Claude Code, Codex, OpenCode, Pi, …) want their own
terminal + their own provider env shape. T3 collapses that into a single web
UI: each agent gets a tab, T3 owns the LLM connection, and a small **provider
shim** in the start wrapper translates whatever the workspace gives it into
the env vars each agent reads natively.

The shim runs at boot in `rigbox-t3code-start`:

- Sources `~/.rigbox/.env` so the managed-proxy injection (or any user secret)
  is in scope.
- If `AI_PROXY_URL` is set (managed mode) → exports
  `OPENAI_BASE_URL`/`OPENAI_API_KEY`/`OPENROUTER_*` pointed at the Rigbox proxy.
- If `OPENROUTER_API_KEY` is set → mirrors it into `ANTHROPIC_*`/`OPENAI_*` so
  agents that only know those shapes still work.

Then it execs the absolute `t3` binary on `0.0.0.0:3773`.

## Why a Dockerfile patch

`t3@0.0.23` ships a Node shebang but guards its entrypoint behind
`if (import.meta.main)` — a Bun convention that is **unset under Node**. Left
unpatched, `systemd` execs `t3`, the CLI exits 0 silently with no output, and
nothing ever listens on `:3773`. The Dockerfile rewrites that single line to
`if (true)` so the server actually starts.

## Docker build + the hybrid deploy

```dockerfile
FROM rigbox-base
RUN npm install -g t3 && <patch import.meta.main>
COPY <wrapper> /home/developer/.local/bin/rigbox-t3code-start
```

- **First `rig deploy`**: builds the image (npm install + patch), boots from it.
- **Later `rig deploy`**: cached image reused, no re-install.

## Deploy

```bash
cd t3code && rig deploy
```

No required env — `ai: { managed: true }` makes the workspace inject the
proxy URL and a placeholder OpenRouter key. Bring your own real OpenRouter key
via `OPENROUTER_API_KEY` if you want to bypass managed credits.

## Notes

- **Persistence: yes.** T3 stores chats and per-agent state under
  `~/.t3` (outside the rsync zone), so they survive redeploys.
- **Why `--mode web`.** Hosted T3 stays in web mode even though we generate a
  desktop bootstrap token in the upstream catalog item — the in-browser UI is
  the front door here, not Electron.
- **Auth**: T3 has no built-in auth on `:3773`. The rigbox subdomain layer is
  the front door; don't make this app `public` without re-adding auth.
