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

- Ruby + Sinatra, SQLite (`sqlite3` gem), Kramdown markdown, served by WEBrick.
- Single app, expressed in the **multi-app `workspace:`/`apps:`** rig.yaml shape so we
  can declare `visibility: public` and `workspace.resources`.
- Port **5100**, binds `0.0.0.0`, health at `/healthz`.
- Durable SQLite at `$DATA_DIR/blog.sqlite3` — survives every redeploy.

## Deploy

```bash
cd bluegreen-blog
rig deploy
```

No required env or secrets. Ruby isn't preinstalled on the base image (Python and
Node are), so `install:` apt-installs a lean `ruby`/`ruby-dev` and a handful of
**pure-Ruby** gems plus a precompiled `sqlite3` — no slow native builds, so it stays
comfortably under the deploy cap. `health.timeoutSeconds` is 90 to cover it.

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
# Stand up a green/staging copy alongside the live one.
rig deploy --bluegreen

# Try the staging URL, set its theme/param there, write a test post.
rig app param set build_flavor=aurora --app blog   # on the staging app

# When it looks right, promote staging in place (stable app_id + unit).
rig app promote <staging-app>
```

Posts live under `$DATA_DIR`, outside the rsynced app dir, so the promote/redeploy
keeps your content.

## Files

- `rig.yaml` — multi-app shape, one `blog` app, the `build_flavor` select param,
  `visibility: public`, 1024 MB / 1 vCPU.
- `app/app.rb` — the whole Sinatra app: SQLite setup, `/healthz`, post list/show/new/
  create, theme accent from the validated `BUILD_FLAVOR`.
- `app/views/` — ERB templates (`layout`, `index`, `show`, `new`) in the shared
  `rb-*` design language.
- `app/public/tokens.css` — byte-for-byte copy of `design/tokens.css`, served static
  and linked from the layout.
