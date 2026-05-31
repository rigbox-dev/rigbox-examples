# todo-app — multi-app loopback + public/private visibility

A two-app to-do list. **todo-web** (Next.js, App Router) is the public SPA + API
front door; **todo-api** (Hono + `better-sqlite3`) is a private service that stores
todos in SQLite. The browser only ever talks to its own origin — todo-web reaches
todo-api **server-side over loopback**, so the API never needs a public subdomain.

## The capability this demonstrates

Multi-app **loopback service discovery** with split visibility:

- `todo-web` declares `dependsOn: [todo-api]`, so Rigbox injects
  `RIGBOX_TODO_API_URL=http://127.0.0.1:5100` into todo-web's env and boots the API
  first.
- `todo-web` is `visibility: public`; `todo-api` declares **no** visibility, so it
  stays **private** (no public subdomain, not internet-reachable).
- Next.js route handlers (`app/api/todos/*`) proxy the browser's same-origin
  requests to the private API over loopback. The home page is server-rendered and
  fetches the initial list over the same loopback path; the page footer shows the
  live `RIGBOX_TODO_API_URL` value so you can see the wiring.

## Deploy

```bash
cd todo-app && rig deploy
```

No env or secrets required.

## What to look at after deploy

- Open the **todo-web** public URL. Add tasks, toggle them done, delete them.
- The pill near the title reads **"todo-api connected"** — that turns green only
  because the server-side loopback fetch to the private API succeeded at render time.
- The muted note at the bottom of the card shows the injected
  `RIGBOX_TODO_API_URL=http://127.0.0.1:5100` — proof the front-end is proxying to a
  private loopback sibling, not a public API.
- The **todo-api** app has no public URL; hitting its subdomain (if any) auth-gates.
  It is only reachable from todo-web over `127.0.0.1`.
- Todos persist in SQLite at `$DATA_DIR/todos.db`
  (`/home/developer/data/todos.db`) and survive redeploys.

## Param to flip

`list_limit` (a validated `select`, default 50) caps how many todos the API
returns. Live-edit it without redeploying:

```bash
rig app param set list_limit=20 --app todo-api
```

## Stack notes

- todo-api: Hono + `@hono/node-server`, run via `tsx` (no global TypeScript). Binds
  `0.0.0.0:5100`, serves `GET /healthz`, `GET/POST /todos`,
  `POST /todos/:id/toggle`, `DELETE /todos/:id`.
- todo-web: Next.js 15 + React 19. `install: npm ci && npm run build`;
  `start: npx next start -H 0.0.0.0 -p 5101`. The Next build is memory-hungry, so
  the workspace runs at 2048 MB / 2 vCPU and todo-web's health timeout is 90s.
- Both apps ship a byte-identical copy of `design/tokens.css`; todo-web imports it
  once in `app/layout.tsx`.

Expected first deploy: a few minutes (the Next.js production build dominates).
