# Pi — Rigbox example

[![Deploy to Rigbox](https://rigbox.dev/deploy.svg)](https://rigbox.dev/deploy?repo=rigbox-dev%2Frigbox-examples&ref=main&path=catalog-apps%2Fcli%2Fpi%2Frig.yaml)

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

## Reproducible deploy + the hybrid model

```yaml
reproducible: true
install: |
  set -euo pipefail
  npm install -g --no-fund --silent @mariozechner/pi-coding-agent
  sudo ln -sfn "$NPM_CONFIG_PREFIX/bin/pi" /usr/local/bin/pi
```

No Dockerfile — `install:` is the same script a plain deploy would run on the
VM; `reproducible: true` is what makes `rig deploy` freeze its result.

- **First `rig deploy`**: boots a throwaway builder VM from the `base` image,
  runs `install:` inside it (one npm install), snapshots the rootfs as a
  content-addressed image, boots the workspace from it.
- **Later `rig deploy`**: if the build inputs (`install:` script, base image)
  are unchanged, the cached image is reused — no re-install.

## Deploy

```bash
cd pi && rig deploy
rig workspace ssh    # then run `pi` interactively
```

## Notes

- **CLI app, declaratively.** `kind: cli` tells the platform there's no HTTP
  port to probe; the deploy just puts `pi` on the SSH PATH and stops there.
  That matches the catalog's internal `AppKind::Cli` shape exactly.
- **Persistence**: Pi keeps no state of its own; conversations are
  ephemeral per terminal session.
