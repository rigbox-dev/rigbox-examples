# Build contract for the Rigbox examples

This is the technical contract every example in this repo follows so it deploys
reliably on a Rigbox `base` VM and looks like part of one family. Read this
alongside `STYLE.md` (visual rules) and `tokens.css` (the design tokens).

## Runtime environment (Rigbox `base` image, Debian 12)

Preinstalled: `python3.11` + `pip`, `node22` + `npm`, `sqlite3`, `build-essential`,
`git`, `rsync`. **NOT preinstalled:** Ruby (install it in the app's `install:`),
global TypeScript (use a local devDependency + `npx`).

PEP 668 is in effect → Python installs **must** use
`pip install --break-system-packages`. Node installs use `npm ci` (or `npm install`
when there's no lockfile). Ruby: `sudo apt-get install -y ruby-full` then `gem`/
`bundle`.

The `install:` block runs once per deploy from the app's synced directory. The
`start:` command runs as the long-lived process under systemd. Build steps
(`npm run build`, `bundle install`, `pip install`, Django `migrate`) go in
`install:`, not `start:`.

## The health contract (non-negotiable — the platform gates on it)

1. The process **must bind `0.0.0.0:<port>`** (never `127.0.0.1` / `localhost`),
   where `<port>` matches the `port:` in rig.yaml.
2. It **must serve `GET /healthz` → 2xx** quickly. Set `health.path: /healthz` and a
   generous `health.timeoutSeconds` (30 for fast apps; 60–90 if `install:` is heavy
   like a Next.js or Rails build). If health never goes green the deploy is marked
   failed and rolled back.

## Persistence (survives redeploys)

The synced app directory is **wiped and re-rsynced on every deploy** — never store
data there. Durable state lives under `DATA_DIR=/home/developer/data` (set it via
`env:`), which is outside the rsync zone. SQLite DBs, uploaded files, logs → under
`$DATA_DIR`. Create the dir at startup (`mkdir -p`) since it may not exist on a
fresh workspace.

## rig.yaml — single-app shape

```yaml
name: my-app
port: 8080
start: <command that binds 0.0.0.0:8080>
install: |
  <one-time setup>
health:
  path: /healthz
  timeoutSeconds: 30
env:
  DATA_DIR: /home/developer/data
```

## rig.yaml — multi-app shape

```yaml
workspace:
  image: base
  resources: { ramMb: 1024, vcpuCount: 1, diskSizeMb: 3072 }   # tune per app
apps:
  api:
    path: ./api
    port: 5100
    start: …
    install: …
    health: { path: /healthz, timeoutSeconds: 30 }
  web:
    path: ./web
    port: 5101
    start: …
    install: …
    dependsOn: [api]          # → injects RIGBOX_API_URL=http://127.0.0.1:5100 into web
    visibility: public        # only the front door is public; api stays private
    health: { path: /healthz, timeoutSeconds: 60 }
```

`dependsOn: [api]` makes Rigbox inject `RIGBOX_API_URL` (UPPER_SNAKE of the sibling
app name) into the dependent's env, pointing at the sibling over loopback. Boot
order follows the dependency graph.

## Reproducible builds — Dockerfile + the hybrid deploy

Most examples install their runtime with `install:`, which runs on the booted VM
on every deploy. An example can instead **freeze its environment into an image**
with a Dockerfile and deploy reproducibly:

```yaml
name: my-app
port: 8080
build:
  dockerfile: Dockerfile        # local path; no source: block needed
start: <command that binds 0.0.0.0:8080>
health: { path: /healthz, timeoutSeconds: 30 }
```

```dockerfile
# Dockerfile — MUST be FROM rigbox-base. The platform asserts the rigbox agent
# + systemd are present and rejects any other base at build time, so you keep
# the platform's opinions while adding your own dependencies on top.
FROM rigbox-base
RUN pip install --break-system-packages --no-cache-dir flask gunicorn
```

Deploy with `rig deploy --reproducible`:

- **First deploy** builds the image from the local `Dockerfile` — the CLI uploads
  the project directory as the build context, so **no git repo is required** —
  boots the workspace from that frozen image, then rsyncs the app code.
- **Later deploys** reuse the cached image when the build inputs (the Dockerfile,
  declared deps/lockfiles, base image) are unchanged and **only rsync the changed
  code**: no rebuild, no re-install. Edit the Dockerfile or a lockfile and the
  next deploy rebuilds the image.

That's the **hybrid model**: the slow, stable environment is built once and
frozen; fast-changing app code rides over it via rsync. It fits interpreted
runtimes — deps install to **system paths** (e.g. pip `--break-system-packages`),
so the rsynced code finds them. Keep your app's own source **out** of the image;
it arrives by rsync.

When to use which:

- `install:` (no Dockerfile) — simple apps with fast installs. The default.
- `build: { dockerfile }` + `rig deploy --reproducible` — heavier or slower
  environments you want frozen and byte-identical across deploys.

Examples on the Dockerfile path: **`ai-chat`** and **`markdown-notes`**. The rest
use `install:`.

## Resources

Defaults are 1024 MB / 1 vCPU / 3072 MB disk. Free-tier ceiling is **2048 MB /
2 vCPU / 10240 MB disk total**. Bump `workspace.resources` only when a build needs
it (Next.js build → 2048 MB; Rails → 1536 MB is comfortable).

## Visibility

Absent → **private** (gateway auth-gates every request; a private app health-checks
fine and returns 302→login for anonymous browsers — that's expected). `public` →
open to the world. `{ emails: [...] }` → owner + allow-list. Declare it in rig.yaml
(not via `rig app share`) so redeploys keep it.

## Params (server-validated config) — prefer over ad-hoc env for chosen values

A value picked from a known set (theme, mode, algorithm) is a `type: select` param,
**not** a free env var. The server validates it and it's live-editable with
`rig app param set <key>=<value>`. Param types: `string`, `number`, `boolean`,
`secret`, `select`, `email`, `url`, `textarea`.

```yaml
params:
  - key: build_flavor
    type: select
    label: Theme
    description: Visual theme for the site.
    group: Display
    default: classic
    envVar: BUILD_FLAVOR          # REQUIRED to reach the process; without it the
    options:                      # value only lands in metadata, not the env
      - { value: classic, label: "Classic" }
      - { value: aurora,  label: "Aurora" }
  - key: contact_email
    type: email
    label: Contact email
    envVar: CONTACT_EMAIL
  - key: rate_limit
    type: number
    label: Requests per minute
    default: "60"
    envVar: RATE_LIMIT
  - key: slug_pattern
    type: string
    label: Slug
    validationPattern: "^[a-z0-9-]{3,32}$"   # server re-enforces at param-set time
    envVar: SLUG
```

Rules: every param the running app reads **must** set `envVar` (typically
UPPER_SNAKE of `key`). `select` requires `options:` with `{value,label}`. `boolean`
defaults are the strings `"true"`/`"false"`. `number` defaults are quoted strings.

## Secrets & credentials

- `secrets: [{ name: API_KEY }]` — a user-supplied secret read from the local env
  at deploy time and injected. Add `optional: true` to skip cleanly if unset.
- `credentials: [{ generate: true }]` — the server mints a random value on first
  deploy, injected as `CRED_<UPPER_KEY>`. Stable across redeploys.

## Design integration per stack

- **TypeScript / Node**: serve `tokens.css` as a static file (or inline its contents
  in a `<style>`). Keep a copy of the file in the app dir at build time.
- **Next.js (React/TS)**: copy `tokens.css` into the app and import it once in the
  root layout (`app/layout.tsx`) as a global stylesheet.
- **FastAPI / Flask / Django**: copy `tokens.css` into the app's static dir and
  `<link rel="stylesheet">` it from the HTML template.
- **Rails**: copy `tokens.css` into `app/assets/stylesheets/` (or `public/`) and
  link it from the layout.

In all cases the copy must be **identical** to `design/tokens.css`. Use the page
skeleton + `rb-*` classes from STYLE.md.

## README per example

Each example's `README.md`: one-paragraph "what this is", the **single capability**
it demonstrates, `cd <dir> && rig deploy`, what to look at after deploy (the URL /
the pill / the param to flip), and any required env (e.g. `export WEBHOOK_HMAC_KEY=…`
before deploy). Keep it tight.
