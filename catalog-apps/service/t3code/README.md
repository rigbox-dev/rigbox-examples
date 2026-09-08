# T3 Code — Rigbox example

[![Deploy to Rigbox](https://rigbox.dev/deploy.svg)](https://rigbox.dev/deploy?repo=rigbox-dev%2Frigbox-examples&ref=main&path=catalog-apps%2Fservice%2Ft3code%2Frig.yaml)

Runs [T3 Code](https://github.com/OpenRouterTeam/spawn) on Rigbox — a
browser-based AI workspace that hosts **Claude Code, Codex, and other coding
agents behind one web UI**. You pick the agent in the sidebar, T3 routes the
conversation to the right backend, and you never leave the browser tab.

## The single capability: multiple coding agents, one browser tab

Most CLI coding agents (Claude Code, Codex, OpenCode, Pi, …) want their own
terminal + their own provider env shape. T3 collapses that into a single web
UI: each agent gets a tab, T3 owns the LLM connection, and a small **provider
shim** in `start.sh` translates whatever the workspace gives it into the env
vars each agent reads natively.

The shim runs at boot:

- Sources `~/.rigbox/.env` so the managed-proxy injection (or any user secret)
  is in scope.
- If `AI_PROXY_URL` is set (managed mode) → exports
  `OPENAI_BASE_URL`/`OPENAI_API_KEY`/`OPENROUTER_*` pointed at the Rigbox proxy.
- If `OPENROUTER_API_KEY` is set → mirrors it into `ANTHROPIC_*`/`OPENAI_*` so
  agents that only know those shapes still work.

Then it execs the absolute `t3` binary on `0.0.0.0:3773`.

## Why `install:` patches the entrypoint

`t3@0.0.23` ships a Node shebang but guards its entrypoint behind
`if (import.meta.main)` — a Bun convention that is **unset under Node**. Left
unpatched, `systemd` execs `t3`, the CLI exits 0 silently with no output, and
nothing ever listens on `:3773`. The install script rewrites that single line to
`if (true)` so the server actually starts:

```yaml
reproducible: true
install: |
  set -euo pipefail
  export NPM_CONFIG_PREFIX="$HOME/.npm-global"
  npm install -g --no-fund --silent t3
  T3_DIST="$NPM_CONFIG_PREFIX/lib/node_modules/t3/dist/bin.mjs"
  node -e '…'  "$T3_DIST"                # if (import.meta.main) → if (true)
  t3 --version >/dev/null
```

No Dockerfile — `install:` is the same script a plain deploy would run on the
VM (as `developer`, with passwordless `sudo` for any system-path step);
`reproducible: true` is what makes `rig deploy` freeze its result.

## Reproducible deploy + the hybrid model

The deploy is **hybrid** — the image carries the environment, rsync carries the
boot wrapper next to `rig.yaml`:

- **First `rig deploy`**: boots a throwaway builder VM from the `base` image,
  runs `install:` inside it (`npm install -g t3` + the patch), snapshots the
  rootfs as a content-addressed image, boots the workspace from it.
- **Later `rig deploy`**: if the build inputs (`install:` script, base image)
  are unchanged, it **reuses the cached image** — no re-install, fast. Editing
  `start.sh` only rsyncs; it doesn't rebuild.

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

## Deployment strategy

This example explicitly uses `workspace.deployment.strategy: image` because its installer changes system packages, global executable paths, or shared tool configuration. The badge review shows image replacement and requires permission before replacing an existing workspace root filesystem. It is not an incremental app release. Use a dedicated workspace and back up root-filesystem development files; persistent volumes are retained. Migrating this installer to app-local releases remains separate work.
