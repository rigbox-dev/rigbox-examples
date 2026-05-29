# bluegreen-blog

A two-app composition demonstrating **bluegreen + promote** against a real-shape stateful app, with **`dependsOn` as a true readiness gate** via a migrator sidecar.

The point: redesign your UI without risking your prod data. Bluegreen stages a parallel build at a sibling subdomain, you verify it on the live data, then atomically swap.

## Apps

| App | Port | Role |
|---|---|---|
| `migrator/` | 5099 | One-shot schema sidecar — creates `/home/developer/data/posts/` + index file, then sits on `/healthz` so the platform considers it ready |
| `blog/` | 5100 | Markdown blog — `dependsOn: [migrator]`, reads/writes posts as files under `/home/developer/data/posts/`. Posts survive every redeploy because that path is **outside** the rsync working directory. |

## Walk through the bluegreen workflow

### 1. Initial deploy

```bash
cd bluegreen-blog
rig workspace deploy --name blog-stack
```

The migrator runs once, creates the data dir + index, then the blog comes up. Visit the blog and create a post:

```bash
BLOG=https://bg-blog-<workspace-id>.rigbox.dev
curl "$BLOG"                                                    # empty index
curl -X POST -H 'content-type: application/json' \
  -d '{"title":"Hello world","body":"My first post."}' \
  "$BLOG/admin/post"
curl "$BLOG"                                                    # post appears
```

You're now serving the `classic` flavor — Georgia serif on a white background. The header shows a `classic` badge.

### 2. Redesign as a bluegreen sibling

Edit `bluegreen-blog/blog/rig.yaml` and change `BUILD_FLAVOR: classic` → `BUILD_FLAVOR: aurora`. That's the entire "v2" — same code, different template.

Stage it as a sibling deploy:

```bash
rig app deploy --workspace blog-stack --app bg-blog --bluegreen v2
```

The CLI deploys `bg-blog` as a parallel app at `bg-blog-v2.<workspace-id>.rigbox.dev`. **Prod (`bg-blog.<workspace-id>`) is untouched** — users on the existing URL still see the classic look.

Verify the staged build sees your real post:

```bash
BLOG_V2=https://bg-blog-v2-<workspace-id>.rigbox.dev
curl "$BLOG_V2"     # same "Hello world" post, aurora gradient UI
curl "$BLOG"        # still classic
```

This is the safety story: a stateful redesign on live data, with prod untouched until you say so.

### 3. Promote

When you're happy:

```bash
rig app deploy --workspace blog-stack --app bg-blog --bluegreen v2 --promote
```

The platform swaps the subdomain pointer atomically. `bg-blog.<workspace-id>` now serves the aurora flavor; the previous `-v2` URL collapses on the next deploy.

## Why this works

Two things compound:

1. **The data directory lives outside the rsync zone.** `rig app deploy` only rsyncs the app's source into `<DEPLOY_ROOT>/<slug>`. Anything you write to `/home/developer/data/` survives — and is **shared between** the prod and bluegreen builds because they're both processes on the same VM disk.
2. **`dependsOn: [migrator]` is a real gate.** The blog can't start until the migrator is healthy. The first deploy initializes the data dir; subsequent deploys are no-ops because the index file already exists.

If your "redesign" involves schema changes, the right pattern is to write a forward-compatible migration in `migrator/` and run it BEFORE deploying the bluegreen sibling — same `dependsOn` chain protects you.

## Layout

```
bluegreen-blog/
├── composition.yaml
├── migrator/
│   ├── rig.yaml          # port 5099, dependsOn'd by blog
│   └── migrate.js        # creates data dir + index, then 200s on /healthz
└── blog/
    ├── rig.yaml          # port 5100, BUILD_FLAVOR env flips the template
    ├── server.js         # GET /, GET /post/:slug, POST /admin/post
    └── views.js          # classic + aurora templates
```

## Verify

```bash
# Index page (classic OR aurora depending on BUILD_FLAVOR)
curl https://bg-blog-<workspace-id>.rigbox.dev

# Post a new entry
curl -X POST -H 'content-type: application/json' \
  -d '{"title":"Bluegreen rules","body":"redesign without fear"}' \
  https://bg-blog-<workspace-id>.rigbox.dev/admin/post

# Read a single post
curl https://bg-blog-<workspace-id>.rigbox.dev/post/bluegreen-rules

# Migrator's healthz (visible during initial deploy, hidden after)
curl https://bg-blog-migrator-<workspace-id>.rigbox.dev/healthz
```

## What this example teaches

- **Bluegreen + promote** — the headline feature, demonstrated on a stateful app where the safety story matters.
- **`dependsOn` as a readiness gate** — migrator must report healthy before the blog is started, not just "boot order."
- **State survival across redeploys** — anything outside `<DEPLOY_ROOT>` persists. Use this for SQLite files, generated assets, accumulated data.

## Requirements

Latest CLI (v0.12.10+):

```bash
curl -fsSL https://rigbox.dev/install.sh | bash
```
