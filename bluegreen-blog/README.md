# Bluegreen Blog — Rigbox example

A tiny markdown blog on **Ruby (Sinatra)** — SQLite, Kramdown for rendering. It
exists to demonstrate **one** thing:

> **A validated `select` param replaces a raw env var for theme selection** — and
> the bluegreen staging → in-place promote flow that rides on top of it.

The theme isn't a free-form `BUILD_FLAVOR=...` string you can set to anything. It's
a server-validated `select` param with a fixed option set (`classic` / `aurora`).
The server rejects any value outside that set, then injects the chosen value as the
`BUILD_FLAVOR` env var the layout reads. The validated options win over a raw env
var — that's the whole point.

The current theme is shown as a pill on the post list, so the capability is legible
at a glance.

## Stack / shape

- Ruby + Sinatra, a pure-Ruby JSON file store, Kramdown markdown, served by WEBrick.
- Single app, expressed in the **multi-app `workspace:`/`apps:`** rig.yaml shape so we
  can declare `visibility: public` and `workspace.resources`.
- Port **5100**, binds `0.0.0.0`, health at `/healthz`.
- Durable posts at `$DATA_DIR/posts.json` — outside the rsync zone, so they survive
  every redeploy and bluegreen cut-over. (SQLite is shown by `todo-app` /
  `url-shortener`; here a JSON file keeps the install dependency-free.)

## Deploy

```bash
cd bluegreen-blog
rig deploy                       # open blog (no admin token)
rig deploy --stage production    # gated: loads ADMIN_TOKEN from .env.production
```

No *required* env. Ruby isn't preinstalled on the base image (Python and Node are),
so `install:` apt-installs a lean `ruby` and a handful of **pure-Ruby** gems — no
native builds, so it stays comfortably under the deploy cap. `health.timeoutSeconds`
is 90 to cover it.

### Optional secret + per-stage `.env` (pairs with bluegreen)

The blog has one **optional** secret, `ADMIN_TOKEN`. When present, publishing a
post requires a matching token (the new-post form grows a token field and the
header pill reads `admin: token required`); when absent, the blog is open.

Supply it from a `.env` file via `--stage` rather than exporting:

```bash
rig deploy --stage production    # loads .env.production → ADMIN_TOKEN=prod-…
```

`--stage <s>` loads `.env.<s>` (plus `.env.local`, `.env`). Precedence, highest
wins: **real env > `.env.<s>.local` > `.env.local` > `.env.<s>` > `.env`** — an
exported var always beats the file, and only names in `secrets:` reach the deploy.
This is the natural partner to bluegreen: give the live app and its staging sibling
**different** stages, so they carry different tokens (`.env.production` vs
`.env.staging`) and a staging cut-over can never publish with the prod token. Copy
`.env.example` for your own; real secrets go in `.env.local` (gitignored), not the
committed demo files.

## What to look at after deploy

1. Open the app URL. You land on the post list with a `theme: classic` pill.
2. Click **New post**, publish some Markdown — headings, code fences, links all
   render. Reload: the post persists.

### Flip the theme via the validated param (the headline)

```bash
# Valid — server accepts it, injects BUILD_FLAVOR=aurora, app re-themes to teal.
rig app param set build_flavor=aurora

# Bogus — REJECTED server-side. The validated option set wins; you cannot set a
# theme the app doesn't know about (this is what the old raw env var couldn't do).
rig app param set build_flavor=bogus      # → error: not an allowed value
```

After the `aurora` set, reload — the accent re-tints and the pill reads
`theme: aurora`. Posts are untouched (theme is presentation only).

### Bluegreen staging → in-place promote

Same capability, exercised through a staging sibling instead of a live param flip:

```bash
# Stand up a green/staging sibling — with the STAGING token, not the prod one.
rig deploy --stage staging --bluegreen v2

# Try the staging URL, set its theme there, publish a test post using the
# staging admin token from .env.staging.
rig app param set build_flavor=aurora --app blog   # on the staging app

# When it looks right, promote staging in place (stable app_id + unit).
rig app promote <staging-app>
```

Posts live under `$DATA_DIR`, outside the rsynced app dir, so the promote/redeploy
keeps your content.

## Files

- `rig.yaml` — multi-app shape, one `blog` app, the `build_flavor` select param,
  the optional `ADMIN_TOKEN` secret, `visibility: public`, 1024 MB / 1 vCPU.
- `app/app.rb` — the whole Sinatra app: JSON store, `/healthz`, post list/show/new/
  create, theme accent from the validated `BUILD_FLAVOR`, write-gating on `ADMIN_TOKEN`.
- `app/views/` — ERB templates (`layout`, `index`, `show`, `new`) in the shared
  `rb-*` design language.
- `app/public/tokens.css` — byte-for-byte copy of `design/tokens.css`, served static
  and linked from the layout.
- `.env.example` — template documenting `ADMIN_TOKEN` (never loaded).
- `.env.production` / `.env.staging` — demo per-stage tokens loaded by
  `rig deploy --stage <stage>`.
