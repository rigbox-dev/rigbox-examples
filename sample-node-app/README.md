# sample-node-app

The smallest valid `rig.yaml` — a Node HTTP server on port 5000. No params,
no secrets, no managed AI. The reference for the minimum shape every other
example builds on.

## What's here

```
sample-node-app/
├── rig.yaml   # name, port, start, install, env, health
├── app.js     # listens on $PORT, serves a tiny index + /healthz
└── public/    # the HTML page the root URL renders
```

## Deploy

`rig deploy` spawns a fresh workspace (or attaches to the one bound in the
local `.rig.lock`), rsyncs this directory, runs `install`, then brings the
app up under systemd and waits for the health check.

```bash
cd sample-node-app
rig deploy            # spawns a workspace with a generated name
# or pin a name:  rig deploy --name my-workspace
```

The output prints the workspace name and the app URL
(`https://node-app-<ws>.rigbox.dev`).

## Verify

Apps are private by default (the URL redirects to login). Make it public
for an unauthenticated smoke test:

```bash
rig app share --app node-app --public

curl https://node-app-<ws>.rigbox.dev/healthz   # → 200 {"ok":true,...}
curl https://node-app-<ws>.rigbox.dev/          # → the demo page
```

## A note on PORT

The top-level `port:` field wires the subdomain/proxy routing — it is **not**
auto-exported into the app's process environment. `app.js` reads
`process.env.PORT`, so `PORT` is declared explicitly under `env:` (kept in
sync with `port:`).

## Tear down

```bash
rig workspace rm --workspace <ws> --force
```

## When to reach for this

- First time deploying anything with Rigbox — copy this, adjust
  `name` / `port` / `start`, and `rig deploy`.
- Smoke-testing that a workspace is healthy: deploy this app, hit `/healthz`.
