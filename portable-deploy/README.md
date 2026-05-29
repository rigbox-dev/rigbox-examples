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

The `rig.yaml` is a pure deploy spec — no vendor identity baked in.
From a checkout of this repo:

```bash
cd portable-deploy
rig deploy --workspace portable-demo
```

That auto-detects `rig.yaml` and runs `rig app deploy`; the VM clones
the source itself at install time, so the deploy carries no local
source either way.

If you want to **publish** this as a reusable catalog recipe — so
anyone can install it by ref without a checkout — that's a separate,
deliberate step. Identity comes from the publish flags, not the
manifest:

```bash
cd portable-deploy
rig recipe app publish --vendor <you> --slug portable-deploy --version 0.1.0
rig recipe app install --ref @<you>/portable-deploy@0.1.0 --workspace portable-demo
rig app share --app portable-deploy --public
```

## Verify

```bash
curl https://portable-deploy-<ws>.rigbox.dev/healthz       # → ok
curl https://portable-deploy-<ws>.rigbox.dev/              # the demo page
```

## When to reach for this

- CI deploys where the runner shouldn't carry your source.
- Demos you want to share via a one-line incantation.
- Once published (see above), anyone can `rig recipe app install` it onto their workspace without a checkout.

## Requirements

Latest CLI:

```bash
curl -fsSL https://rigbox.dev/install.sh | bash
```
