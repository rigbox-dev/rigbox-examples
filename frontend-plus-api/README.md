# frontend-plus-api

A two-app project — one root `rig.yaml` describes the whole workspace: a
tiny todo API on one subdomain and a vanilla-JS frontend that talks to it
on another.

## Deploy in one command

Clone this repo and run:

```bash
git clone https://github.com/rigbox-dev/rigbox-examples.git
cd rigbox-examples/frontend-plus-api
rig deploy
```

That:

1. Spawns a workspace from the `base` template + the declared resources (or
   attaches to the one recorded in `.rig.lock` / `--workspace <id|name>`).
2. Rsyncs and installs each app from its `path` — `frontend-api` from
   `./backend`, `frontend-web` from `./frontend`.
3. Brings them up in `dependsOn` order (`frontend-api`, then `frontend-web`);
   each app gets its own subdomain — `frontend-api-<ws>.rigbox.dev` and
   `frontend-web-<ws>.rigbox.dev`.

## How the apps talk (inter-app networking)

Both apps run as processes on the **same workspace VM**, so a sibling is
reachable over loopback. Because `frontend-web` declares
`dependsOn: [frontend-api]`, Rigbox does the service discovery for you: it
injects

```
RIGBOX_FRONTEND_API_URL=http://127.0.0.1:5100
```

into `frontend-web`'s environment (`RIGBOX_<APP_NAME>_URL`, name uppercased,
dashes → underscores). `server.js` reads that var and **proxies `/api`** to the
backend over loopback. The browser only ever talks to `frontend-web`'s own
origin — so there's **no CORS**, and `frontend-api` can stay **private** (the
default). Only `frontend-web` is public; the API is never exposed to the
internet.

Running locally? The platform var isn't set, so `server.js` falls back to
`http://127.0.0.1:5100` — `node server.js` in each dir just works.

Apps deploy **private** by default, so open just the public entry point —
`frontend-web` — to the world (the API needs nothing):

```bash
rig app share --app frontend-web --public
```

Re-run that after each `rig deploy` — a deploy resets app visibility to the
`rig.yaml` default (private).

> The old approach — a browser `fetch` cross-origin to the API's subdomain —
> failed with `CORS request did not succeed` whenever the API was private (the
> fetch followed the login redirect). Proxying server-side over the workspace's
> internal network avoids that entirely and keeps the API key/credentials off
> the client.

## Toggle: loopback vs the public internet

The page has a **Private / Internet** route switch. Both reach the same
backend; they differ in *how*:

- **Private (default)** — `server.js` proxies `/api` to `127.0.0.1:5100` over
  the VM's loopback. Fast, never leaves the VM, and needs no credentials. This
  is what you should use when the dependency is co-located.
- **Internet** — `server.js` proxies `/api` to `frontend-api`'s **public
  subdomain** over the internet (through the gateway). Since `frontend-api` is
  private, the call is authenticated with an `X-Rigbox-Key` header — so this
  route exercises the metered, public path instead of loopback.

The key is an **optional deploy secret** the workspace owner sets. It stays
server-side in `frontend-web`'s env and is **never sent to the browser**:

```bash
export RIGBOX_API_KEY=rb_...     # your Rigbox API key (the workspace owner's)
rig deploy
```

`rig.yaml` declares it as `secrets: [{ name: RIGBOX_API_KEY, optional: true }]`,
so **deploying without it still works** — the Internet toggle just shows a toast
explaining how to enable it, and the app keeps running on the Private route.
Requires CLI ≥ 0.12.33 (optional secrets).

Notes:
- Use the **owner's** key — a key from another account gets `403` (the API is
  private to its owner). A non-owner or missing key can't read it.
- **Prefer a workspace-scoped key** if you have one: a leak is then bounded to
  this workspace's own apps (which the VM already reaches over loopback). The
  key does live in the app's server-side env — a deliberate, owner-controlled
  tradeoff for this demo.
- Don't reach for Internet mode when loopback works — it's here to show the
  public/authenticated path, not because you need it for co-located apps.

### Or just make the API public

If you don't want a key at all, share the API and it answers without auth:

```bash
rig app share --app frontend-api --public
```

Then anyone can hit it — fine for this throwaway todo data, not for anything real.

## What's in the box

One root `rig.yaml` holds the whole spec — a `workspace:` block (base image
+ resources) and an `apps:` map. Each app's `path` directory holds only
code; the app's spec lives inline under `apps.<name>`.

| Path | What it does |
|---|---|
| `rig.yaml` | Workspace blueprint + both app specs inline |
| `backend/` | `frontend-api` — in-memory todo API on port 5100, stays private (`app.js`) |
| `frontend/` | `frontend-web` — static UI on port 5101 that proxies `/api` to its sibling; `dependsOn: [frontend-api]` (`server.js`, `public/`) |

Both apps target the base image — no backing services, just `apt install nodejs` at install time.

## Verify

```bash
# Frontend shows the todo list; add/delete works.
open https://frontend-web-<ws>.rigbox.dev

# The API is reached *through* the frontend's same-origin /api proxy:
curl https://frontend-web-<ws>.rigbox.dev/api/todos
curl -X POST -H 'content-type: application/json' \
  -d '{"title":"first todo"}' \
  https://frontend-web-<ws>.rigbox.dev/api/todos

# frontend-api itself is private — hitting its subdomain directly redirects
# to login (302). That's expected; the proxy reaches it over loopback.
curl -s -o /dev/null -w '%{http_code}\n' https://frontend-api-<ws>.rigbox.dev/api/todos
```

## Iterate on the source

Every deploy rsyncs the local working copy of each app's `path` and
reinstalls — no publish round-trip between changes. Edit `backend/` or
`frontend/`, then redeploy.

Redeploy both apps into the same workspace:

```bash
rig deploy
```

Redeploy just one app:

```bash
rig deploy --app frontend-web
```

The project lock (`.rig.lock`) at the repo root remembers which workspace
you targeted last time, so a bare redeploy lands on the same workspace.
Pass `--workspace <id|name>` to target a different one.

## Publishing

Publishing a multi-app project to the registry as a workspace-definition is
a work-in-progress follow-up — not available in this model yet. For now
these examples are deploy-only. (Individual single-app recipes can still be
published with `rig recipe app publish --vendor/--slug/--version`.)

## Requirements

Latest CLI:

```bash
curl -fsSL https://rigbox.dev/install.sh | bash
```
