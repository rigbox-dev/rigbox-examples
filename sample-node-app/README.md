# sample-node-app

The smallest valid `rig.yaml` — Node HTTP server on port 5000. No params, no secrets, no managed AI. Reference for the minimum shape every other example builds on.

## What's here

```
sample-node-app/
├── rig.yaml   # 10 lines: name, port, start, install, env, health
├── app.js     # listens on $PORT, serves a tiny index + /healthz
└── public/    # one HTML page so the root URL renders something
```

## Deploy

```bash
cd sample-node-app
rig app deploy --workspace <your-workspace>
```

## Verify

```bash
curl https://node-app-<ws>.rigbox.dev/healthz   # → 200 ok
curl https://node-app-<ws>.rigbox.dev/          # → the demo page
```

## When to reach for this

- First time deploying anything with Rigbox — copy this, adjust `name` / `port` / `start`, deploy.
- Smoke test that a workspace is healthy: deploy this app, hit `/healthz`.
