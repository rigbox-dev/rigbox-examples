# param-showcase

Exercises every v1 `ParamSpec` type (`string`, `number`, `boolean`,
`secret`, `select`, `email`, `url`, `textarea`) and every notable
attribute (`label`, `description`, `group`, `helpUrl`, `options`,
`order`, `sensitive`, `validationPattern`, `envVar`).

Open [`rig.yaml`](./rig.yaml) for the canonical reference page.

## Quick deploy

```bash
rig workspace spawn --name showcase
cd param-showcase
rig app deploy --workspace showcase
rig app share --app param-showcase --public

curl https://param-showcase-<ws>.rigbox.dev/params
```

`/params` returns the live env-projected values straight away — the
manifest defaults materialize into the systemd env on first install,
no explicit `param set` round-trip needed. `api_secret` is masked.

## Source-of-truth model

`rig.yaml` is authoritative. The CLI/UI can tweak `config.params`
values live via `rig app param set`, but re-deploying from the
manifest is the canonical reset — `rig app deploy` re-asserts every
declared default and reverts in-flight CLI edits.

```bash
# Live tweak — survives until next deploy
rig app param set --app param-showcase log_level=debug
rig app restart --app param-showcase
curl …/params | jq .log_level   # → "debug"

# Reset by redeploying from the manifest
rig app deploy --workspace showcase
curl …/params | jq .log_level   # → "info"  (rig.yaml's declared default)
```

## Requirements

Latest CLI:

```bash
curl -fsSL https://rigbox.dev/install.sh | bash
rig --version
```
