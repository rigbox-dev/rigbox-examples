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

`WEBHOOK_HMAC_KEY` is a required secret. Provide it either by exporting it, or —
the tidier way — from a `.env` file via `--stage`:

```bash
# From a .env file (this example ships a demo .env.production):
cd webhook-receiver && rig deploy --stage production   # loads .env.production

# …or export it yourself:
export WEBHOOK_HMAC_KEY=your-shared-signing-key
cd webhook-receiver && rig deploy
```

`--stage production` loads `.env.production` (and `.env.local`, `.env`) into the
deploy env, so the names in `secrets:` are picked up without a manual `export`.
Precedence, highest wins: **real env > `.env.production.local` > `.env.local` >
`.env.production` > `.env`** — an exported var always beats the file. Only names
declared in `secrets:` reach the deploy, so an unrelated key in the file is
ignored. Copy `.env.example` to make your own; put real secrets in `.env.local`
(gitignored) rather than the committed demo `.env.production`.

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

- `WEBHOOK_HMAC_KEY` (secret) — supply via `--stage production` (loads
  `.env.production`) or `export` before `rig deploy`. Without it the app still
  boots and health-checks fine, but `/webhook` returns `503` and the UI shows the
  key as missing.

## Files

- `.env.example` — template documenting the secret (never loaded).
- `.env.production` — demo value loaded by `rig deploy --stage production`.

## Notes

- **Persistence: none.** The recent-webhooks list is an in-memory ring buffer
  (last 20) and is cleared on every restart or redeploy. By design — this is an
  inspector, not a store.
- Stack: Python · Flask. Built-in dev server, bound to `0.0.0.0:8080` with the
  reloader off.
