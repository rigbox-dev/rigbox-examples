# param-showcase

Exercises every v1 `ParamSpec` type (`string`, `number`, `boolean`,
`secret`, `select`, `email`, `url`, `textarea`) and every notable
attribute (`label`, `description`, `group`, `helpUrl`, `options`,
`order`, `sensitive`, `validationPattern`, `envVar`).

Open [`rig.yaml`](./rig.yaml) for the canonical reference page.

## Quick deploy

```bash
cd param-showcase
rig deploy                              # spawns a workspace, deploys this app
rig app share --app param-showcase --public

curl https://param-showcase-<ws>.rigbox.dev/params
```

`rig deploy` reads the single root `rig.yaml`, spawns (or reuses) a
workspace, and installs the app in one step — no separate
`rig workspace spawn`. The workspace it binds to is recorded in
`.rig-app-deploy.lock` (gitignored); later `rig deploy` runs reuse it.
Pass `--workspace <name>` to target a specific one.

`/params` returns the live env-projected values straight away — the
manifest defaults materialize into the systemd env on first install,
no explicit `param set` round-trip needed. `api_secret` has no default
and is masked (shows `null` until you supply one).

New apps deploy **private** (auth-gated); `rig app share --public`
opens them up so an unauthenticated `curl` returns 200.

## Source-of-truth model

`rig.yaml` is authoritative. The CLI/UI can tweak `config.params`
values live via `rig app param set`, but re-deploying from the
manifest is the canonical reset — `rig deploy` re-asserts every
declared default and reverts in-flight CLI edits.

```bash
# Live tweak — survives until next deploy
rig app param set --app param-showcase log_level=debug
rig app restart --app param-showcase
curl …/params | jq .log_level   # → "debug"

# Reset by redeploying from the manifest
rig deploy
curl …/params | jq .log_level   # → "info"  (rig.yaml's declared default)
```

## Requirements

Latest CLI:

```bash
curl -fsSL https://rigbox.dev/install.sh | bash
rig --version
```
