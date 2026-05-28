# portable-deploy

The recipe IS the deploy. `source: { kind: git, repo: ... }` tells
the VM to `git clone` the source itself at install time, so the
operator never needs a local checkout to deploy this app.

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

There's nothing to clone locally. From any machine with the CLI:

```bash
rig workspace spawn --name portable-demo
rig recipe app install \
  --ref @jonathan/portable-deploy@0.1.0 \
  --workspace portable-demo
rig app share --app portable-deploy --public
```

If you want to publish your own version first (e.g. you forked the
repo and want to point at your fork), clone this directory and:

```bash
cd portable-deploy
rig recipe app publish        # uploads under your community vendor
rig recipe app install --ref @<your-vendor>/portable-deploy@0.1.0 --workspace portable-demo
```

## Verify

```bash
curl https://portable-deploy-<ws>.rigbox.dev/healthz       # → ok
curl https://portable-deploy-<ws>.rigbox.dev/              # the demo page
```

## When to reach for this

- Sharing a deploy recipe — "anyone can `rig recipe app install` this onto their workspace."
- CI deploys where the runner shouldn't carry your source.
- Demos you want to share via a one-line incantation.

## Requirements

Latest CLI:

```bash
curl -fsSL https://rigbox.dev/install.sh | bash
```
