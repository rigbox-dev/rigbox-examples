# Pi — Rigbox example

Runs [Pi](https://www.npmjs.com/package/@mariozechner/pi-coding-agent) on
Rigbox — an OpenRouter-native CLI coding agent from pi.dev. Pi is **terminal
only**: there's no chat panel, no web dashboard. You SSH into the workspace
and run `pi`.

## The single capability: an OpenRouter-native CLI that the managed proxy already speaks

The distinctive thing about Pi (vs. Claude Code / Codex / et al) is that it
reads **`OPENROUTER_API_KEY` directly** at startup — no provider abstraction,
no shim. That makes it a perfect fit for the Rigbox managed AI proxy: the
proxy is OpenRouter-backed, so opting into `ai: { managed: true }` injects a
placeholder `OPENROUTER_API_KEY=managed-by-rigbox` into the VM, Pi reads it,
and every conversation goes through workspace credits with **zero
config**.

To use a real OpenRouter key instead (and skip managed credits):

```bash
rig app secret set OPENROUTER_API_KEY=sk-or-v1-…
```

## SSH-in to use it

Pi has no web UI of its own. The app is declared with `kind: cli`, so `rig.yaml`
carries no `port`, `start`, or `health` — the platform doesn't expect an HTTP
front door. The real product lives in your terminal:

```bash
rig workspace ssh
$ pi
> refactor the auth handler to use early returns
```

## Docker build + the hybrid deploy

```dockerfile
FROM rigbox-base
RUN npm install -g @mariozechner/pi-coding-agent
```

- **First `rig deploy`**: builds the image (one npm install), boots from it.
- **Later `rig deploy`**: cached image reused, no re-install.

## Deploy

```bash
cd pi && rig deploy
rig workspace ssh    # then run `pi` interactively
```

## Notes

- **CLI app, declaratively.** `kind: cli` tells the platform there's no HTTP
  port to probe; the deploy just bakes `pi` onto the SSH PATH and stops there.
  That matches the catalog's internal `AppKind::Cli` shape exactly.
- **Persistence**: Pi keeps no state of its own; conversations are
  ephemeral per terminal session.
