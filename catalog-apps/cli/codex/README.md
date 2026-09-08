# Codex CLI — Rigbox example

[![Deploy to Rigbox](https://rigbox.dev/deploy.svg)](https://rigbox.dev/deploy?repo=rigbox-dev%2Frigbox-examples&ref=main&path=catalog-apps%2Fcli%2Fcodex%2Frig.yaml)

Install Codex CLI 0.153.4 as a managed app release in a persistent workspace. Dependencies live under the release directory; no sudo, global npm installation, or shell-profile modification is needed.

```bash
cd catalog-apps/cli/codex
rig deploy
```

Then SSH into the workspace and run `codex` from your development checkout. Rigbox registers the `executables.codex` entrypoint and preserves command arguments, terminal input, and the invoking directory. `codex.sh` supplies the versioned managed-AI provider configuration through command-line options, while authentication and interactive state remain in the user's home directory. The workspace supplies the managed proxy environment; no private provider key is committed here.

There is no HTTP port or preview URL. Activating another release changes subsequent CLI invocations; an already-running command keeps its current process. App rollback switches the registered entrypoint to a retained release. Your development files and SSH session remain in place.

This manifest explicitly selects incremental deployment. Existing image-based installations require reviewed ownership migration; they are not silently adopted or overwritten.
