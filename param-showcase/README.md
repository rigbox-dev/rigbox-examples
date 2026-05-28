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

# Materialize defaults into the systemd env (one-time today — see below)
rig app param set --app param-showcase \
  greeting=hello max_items=25 enable_metrics=false log_level=info \
  contact_email=ops@example.com dashboard_url=https://example.com/dashboard \
  welcome_message='Welcome from CLI'
rig app restart --app param-showcase

curl https://param-showcase-<ws>.rigbox.dev/params
```

`/params` returns the live env-projected values; `api_secret` is masked.

## Source-of-truth model

The intent: `rig.yaml` is authoritative. The CLI/UI can tweak
`config.params` values live via `rig app param set`, but re-deploying
from the manifest is the canonical reset.

```bash
# Live tweak
rig app param set --app param-showcase log_level=debug
rig app restart --app param-showcase
curl …/params | jq .log_level   # → "debug"

# Reset by redeploying from the manifest
rig app deploy --workspace showcase
```

## Known gaps (as of writing)

The example exposed two CLI bugs (fixed in v0.12.2 and v0.12.3 — see
[rigbox-dev/cli #84][p84] and [#85][p85]) and one server-side gap:

1. **First-install defaults aren't auto-materialized.** Today
   `rig app deploy` writes `metadata.config` with declared defaults
   but doesn't immediately call the configurator's `apply_params` —
   so the systemd env file stays unpopulated until the user runs
   `rig app param set …` once. The set call invokes `apply_params`,
   which writes the canonical `.env` and triggers a restart.

2. **Redeploy doesn't reset `metadata.config` to manifest defaults.**
   In-flight `rig app param set` edits survive a `rig app deploy`,
   so today the source-of-truth claim is *aspirational* for params.
   A future fix should reset `metadata.config` to spec defaults on
   each `app deploy` (possibly behind a `--reset-params` flag, since
   blowing away tuned values silently could surprise operators).

Both gaps were addressed in follow-up CLI patches (`rig app deploy`
now re-asserts manifest params on every redeploy) and a server
patch (`finalize_post_install` materializes defaults into the env
file). Install the latest CLI to pick up the fixes:

```bash
curl -fsSL https://rigbox.dev/install.sh | bash
```
