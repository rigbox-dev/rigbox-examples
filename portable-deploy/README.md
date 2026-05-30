# portable-deploy

The deploy carries no source. `source: { kind: git, repo: ... }` tells
the VM to `git clone` the source itself at install time, so nothing
gets rsynced up from the operator's machine.

## What it shows

| `rig.yaml` block | What it does |
|---|---|
| `source.kind: git` + `source.repo: …` | Skips the rsync-from-local path; the VM clones the public repo at install time |
| Custom `install:` script | Reshuffles the cloned tree so `app.js` lives at the working-dir root |

No application code lives in this directory — the rig.yaml is the
entire surface. The actual app is in `sample-node-app/` of the same
repo; the install script promotes its contents up one level on the
VM.

## Deploy

```bash
cd portable-deploy
rig deploy --name portable-demo
```

`rig deploy` reads `rig.yaml`, spawns a fresh workspace (`--name` labels
it; omit to reuse the one bound in `.rig.lock` or auto-spawn one), then
the VM `git clone`s the repo from `source.repo` at install time. No
local source is rsynced up, so the deploy carries no app code either way
— a CI runner or a one-line README can deploy it without a checkout.

The CLI prints the workspace id and the app URL. To reach the app
without logging in, make it public:

```bash
rig app share --app portable-deploy --public
```

## Verify

```bash
curl https://portable-deploy-<ws>.rigbox.dev/healthz       # → {"ok":true,...}
curl https://portable-deploy-<ws>.rigbox.dev/              # the demo page
```

## When to reach for this

- CI deploys where the runner shouldn't carry your source.
- Demos you want to share via a one-line incantation.

## Requirements

Latest CLI:

```bash
curl -fsSL https://rigbox.dev/install.sh | bash
```
