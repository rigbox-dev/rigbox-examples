# webhook-receiver

Production-shape secret hygiene in one app: a local `secrets:` block
forwards an HMAC key from your shell, a `credentials:` block has the
platform mint a session secret on first deploy, and a typed `params:`
block lets you flip the signing algorithm without redeploying.

This is a **single-app** project — one root `rig.yaml` with top-level
fields. `rig deploy`, run from this directory, resolves secrets from
your shell, spawns (or reuses) a workspace, and deploys in one step.

## What it shows

| `rig.yaml` block | What it does | Where the value comes from | Lifecycle |
|---|---|---|---|
| `secrets:` | Forwards `WEBHOOK_HMAC_KEY` from your shell into the app's env at deploy time | operator's `$WEBHOOK_HMAC_KEY` | Re-supplied every `rig deploy`; never lands in rig.yaml or git |
| `credentials.session_secret: generate: true` | Server mints a random value on first deploy, injects as `CRED_SESSION_SECRET` | platform | Persistent; rotates only if you re-create the app |
| `params.signing_algorithm` | Typed `select` for the HMAC variant | manifest default or `rig app param set` | Live-editable; resets to manifest default on `rig deploy` |

## Required secret

This app **requires** `WEBHOOK_HMAC_KEY` to be set in your shell at
deploy time. It is the HMAC key used to verify the `X-Signature` header
on incoming `POST /webhook` requests. If it is unset, `rig deploy`
fails fast before publishing.

```bash
# Anything works as a key; this generates a strong random one.
export WEBHOOK_HMAC_KEY=$(openssl rand -hex 32)
```

## Deploy

```bash
cd webhook-receiver

# `rig deploy` reads WEBHOOK_HMAC_KEY from the shell, spawns/reuses a
# workspace, and deploys. Inline form shown; an exported var works too.
WEBHOOK_HMAC_KEY=$(openssl rand -hex 32) rig deploy

# The /webhook endpoint must be reachable by external senders, so make
# the app public (it is private — login-gated — by default).
rig app share --app webhook-receiver --public
```

`rig deploy` prints the workspace and the app URL, e.g.
`https://webhook-receiver-<ws>.rigbox.dev`.

## Verify

```bash
URL=https://webhook-receiver-<ws>.rigbox.dev

# Health check → 200.
curl -s -o /dev/null -w '%{http_code}\n' "$URL/healthz"

# Status — confirms which algo is live + that the HMAC key is set.
curl -s "$URL/"

# Sign a payload locally with the SAME key and POST it. The signature
# is the hex HMAC of the exact request body.
BODY='{"event":"order.created","id":42}'
SIG=$(printf '%s' "$BODY" | openssl dgst -sha256 -hmac "$WEBHOOK_HMAC_KEY" -hex | sed 's/^.* //')
curl -s -X POST -H "X-Signature: $SIG" -d "$BODY" "$URL/webhook"
# → { "verified": true, … }   (HTTP 200)

# Wrong or missing signature → 401.
curl -s -X POST -H "X-Signature: deadbeef" -d "$BODY" "$URL/webhook"
# → { "error": "signature mismatch" }   (HTTP 401)
curl -s -X POST -d "$BODY" "$URL/webhook"
# → { "error": "signature mismatch" }   (HTTP 401)
```

If you switch the algorithm to `hmac-sha512`, sign with
`openssl dgst -sha512` instead.

## Live-tune via CLI, then reset via redeploy

```bash
# Flip to SHA-512 on the running app — no redeploy needed.
rig app param set --app webhook-receiver signing_algorithm=hmac-sha512
rig app restart --app webhook-receiver
curl -s "$URL/" | jq .signing_algorithm    # → "hmac-sha512"

# Re-asserting the manifest reverts the live edit (remember the secret).
WEBHOOK_HMAC_KEY=$WEBHOOK_HMAC_KEY rig deploy
curl -s "$URL/" | jq .signing_algorithm    # → "hmac-sha256"  (manifest default)
```

## Requirements

Latest CLI:

```bash
curl -fsSL https://rigbox.dev/install.sh | bash
```
