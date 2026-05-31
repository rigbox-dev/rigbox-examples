# Webhook Receiver

An HMAC webhook validator/inspector. POST a payload to `/webhook` with an
`X-Signature` header and the server recomputes the HMAC of the **raw body** using
a shared signing key and the selected digest algorithm, then reports the request
as valid or invalid. The dashboard shows the active algorithm, the
server-generated endpoint token, the signing-key status, and a live list of the
most recent webhooks — plus a "send test webhook" button that signs a sample
payload correctly so you can see a green `valid` result immediately.

## The capability it demonstrates

Secrets + a server-minted credential + a validated `select` param, working together:

- **Secret** `WEBHOOK_HMAC_KEY` — the shared signing key, supplied from your local
  env at deploy time and injected into the process. **Required.**
- **Credential** `endpoint_token` (`generate: true`) — Rigbox mints a random value
  on first deploy and injects it as `CRED_ENDPOINT_TOKEN`. Stable across redeploys
  and shown in the UI so callers can identify this endpoint.
- **Param** `signing_algorithm` — a `select` (sha256 / sha1 / sha512, default
  sha256) injected as `SIGNING_ALGORITHM`. Flip it live with
  `rig app param set signing_algorithm=sha512`.

## Deploy

```bash
export WEBHOOK_HMAC_KEY=your-shared-signing-key   # REQUIRED — read from local env at deploy
cd webhook-receiver && rig deploy
```

## After deploy

- Open the app URL. The header shows the active **algorithm** pill and a
  **WEBHOOK_HMAC_KEY: set** pill (it'll read **missing** in red if you forgot the
  export above).
- Note the **endpoint token** in `rb-mono` — that's the server-minted
  `CRED_ENDPOINT_TOKEN`.
- Click **Send test webhook** to see a green `valid` row appear in "Recent
  webhooks".
- Flip the algorithm with `rig app param set signing_algorithm=sha512` and
  redeploy/reload to watch the pill change.

## Required env

- `WEBHOOK_HMAC_KEY` (secret) — export it before `rig deploy`. Without it the app
  still boots and health-checks fine, but `/webhook` returns `503` and the UI shows
  the key as missing.

## Notes

- **Persistence: none.** The recent-webhooks list is an in-memory ring buffer
  (last 20) and is cleared on every restart or redeploy. By design — this is an
  inspector, not a store.
- Stack: Python · Flask. Built-in dev server, bound to `0.0.0.0:8080` with the
  reloader off.
