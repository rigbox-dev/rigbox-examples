# webhook-receiver

Production-shape secret hygiene in one app: a local `secrets:` block
forwards an HMAC key from your shell, a `credentials:` block has the
platform mint a session secret on first install, and a typed `params:`
block lets you flip the signing algorithm without redeploying.

## What it shows

| `rig.yaml` block | What it does | Where the value comes from | Lifecycle |
|---|---|---|---|
| `secrets:` | Forwards `WEBHOOK_HMAC_KEY` from your shell into the app's env at deploy time | operator's `$WEBHOOK_HMAC_KEY` | Re-supplied every `rig app deploy`; never lands in rig.yaml or git |
| `credentials.session_secret: generate: true` | Server mints a random value at first install, injects as `CRED_SESSION_SECRET` | platform | Persistent; rotates only if you re-create the app |
| `params.signing_algorithm` | Typed `select` for the HMAC variant | manifest default or `rig app param set` | Live-editable; resets to manifest default on `rig app deploy` |

## Deploy

```bash
# 1. Provide the HMAC key locally — the deploy reads this and forwards
#    it into the app's env. Never gets persisted in rig.yaml or git.
export WEBHOOK_HMAC_KEY=$(openssl rand -hex 32)

# 2. Spawn + deploy.
rig workspace spawn --name webhook-demo
cd webhook-receiver
rig app deploy --workspace webhook-demo
rig app share --app webhook-receiver --public
```

## Verify

```bash
# Status — confirms which algo is live + that the HMAC key is set.
curl https://webhook-receiver-<ws>.rigbox.dev/

# Sign a payload locally and POST it.
BODY='{"event":"order.created","id":42}'
SIG=$(printf '%s' "$BODY" | openssl dgst -sha256 -hmac "$WEBHOOK_HMAC_KEY" -hex | cut -d' ' -f2)
curl -X POST -H "X-Signature: $SIG" -d "$BODY" \
  https://webhook-receiver-<ws>.rigbox.dev/webhook
# → { "verified": true, … }

# Try with a wrong signature → 401.
curl -X POST -H "X-Signature: deadbeef" -d "$BODY" \
  https://webhook-receiver-<ws>.rigbox.dev/webhook
# → { "error": "signature mismatch" }
```

## Live-tune via CLI, then reset via redeploy

```bash
# Flip to SHA-512 on the running app — no redeploy needed.
rig app param set --app webhook-receiver signing_algorithm=hmac-sha512
rig app restart --app webhook-receiver
curl …/ | jq .signing_algorithm    # → "hmac-sha512"

# Re-asserting the manifest reverts the live edit.
rig app deploy --workspace webhook-demo
curl …/ | jq .signing_algorithm    # → "hmac-sha256"  (manifest default)
```

## Requirements

Latest CLI:

```bash
curl -fsSL https://rigbox.dev/install.sh | bash
```
