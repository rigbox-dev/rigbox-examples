# rigbox-examples

Small, deployable apps that map each Rigbox manifest surface to a working command. Every example — single-app or multi-app — is described by **one root `rig.yaml`** and deploys with `rig deploy` from the project directory:

| Project | Root `rig.yaml` shape | Deploy |
|---|---|---|
| Single-app | top-level `name`/`port`/`start`/`install`/… | `cd <example> && rig deploy` |
| Multi-app | optional `workspace:` block + an `apps:` map | `cd <example> && rig deploy` |

For a multi-app project, each entry under `apps:` carries its spec inline (`port`, `start`, `install`, `env`, `health`, `params`, `dependsOn`) plus a `path: ./dir` pointing at that app's code. `rig deploy` rsyncs and installs each app's `path` and brings them up in `dependsOn` order; `rig deploy --app <name>` redeploys just one.

Every example here deploys in **one command** from a fresh clone. The manifests are pure deploy specs — no vendor identity baked in. Single-app recipes can be published deliberately with `rig recipe app publish --vendor/--slug/--version`; publishing a multi-app project as a workspace-definition is a work-in-progress follow-up and not available yet.

## Single-app examples (`rig.yaml`)

### [`sample-node-app/`](./sample-node-app/)

Smallest valid `rig.yaml` — Node HTTP server on port 5000, `apt install nodejs` at install time. Reference for the minimum shape.

```bash
cd sample-node-app && rig deploy --workspace <ws>
```

### [`ai-chat/`](./ai-chat/)

FastAPI passthrough chat showing `ai: managed: true`. The CLI injects `OPENAI_BASE_URL` + `OPENAI_API_KEY=managed-by-rigbox`, so the same code routes through the platform-managed OpenAI-compatible proxy without proxy-specific logic.

```bash
cd ai-chat && rig deploy --workspace <ws>
```

### [`param-showcase/`](./param-showcase/)

Exercises every `ParamSpec` type (`string` / `number` / `boolean` / `secret` / `select` / `email` / `url` / `textarea`) and every notable attribute. Open the `rig.yaml` for the canonical reference page.

```bash
cd param-showcase && rig deploy --workspace <ws>
```

### [`webhook-receiver/`](./webhook-receiver/)

Production-shape secret hygiene in one app: `secrets:` forwards a value from your shell, `credentials: { generate: true }` has the platform mint a random session secret, `params:` lets you flip the HMAC signing algorithm without redeploying.

```bash
export WEBHOOK_HMAC_KEY=$(openssl rand -hex 32)
cd webhook-receiver && rig deploy --workspace <ws>
```

### [`portable-deploy/`](./portable-deploy/)

Git-source deploy: `source: { kind: git, repo: ... }` makes the VM clone the source at install time, so the deploy carries no local source.

```bash
cd portable-deploy && rig deploy --workspace <ws>
```

### [`daily-digest/`](./daily-digest/)

Background worker on an interval — the canonical "I want this to run every N seconds" shape. Real work happens in a `setInterval` loop; a 30-line HTTP surface serves `/healthz` because the platform health-checks every app. `tick_seconds` param tunes the schedule.

```bash
cd daily-digest && rig deploy --workspace <ws>
```

## Multi-app projects (one root `rig.yaml` + `apps:`)

### [`bluegreen-blog/`](./bluegreen-blog/)

Bluegreen + promote on a real-shape stateful app, with `dependsOn` as a true readiness gate. A markdown blog keeps posts on disk *outside* the rsync zone; a migrator sidecar ensures the data dir exists before the blog starts. Redesign as a bluegreen sibling, verify on live data, then atomically swap.

```bash
cd bluegreen-blog && rig deploy --name blog-stack
# … write a post, then redesign:
rig deploy --workspace blog-stack --app blog --bluegreen v2
rig deploy --workspace blog-stack --app blog --bluegreen v2 --promote
```

### [`frontend-plus-api/`](./frontend-plus-api/)

A two-app project: a tiny todo API plus a vanilla-JS frontend that talks to it on a sibling subdomain. One root `rig.yaml` holds a `workspace:` block and an `apps:` map — `api` (`path: ./backend`, port 5100) and `web` (`path: ./frontend`, port 5101, `dependsOn: [api]`). Each deploy rsyncs the local working copy of every app's `path` and reinstalls in place.

```bash
cd frontend-plus-api && rig deploy
# Redeploy just the frontend:
rig deploy --app web
```

## Layout convention

Each directory is self-contained. Both shapes use a single root `rig.yaml`:

```
single-app-example/
├── rig.yaml          # what gets deployed
├── <source files>
└── README.md         # what it does and the curl that proves it

multi-app-example/
├── rig.yaml          # workspace: block + apps: map (every app spec inline)
├── <app-name>/       # one dir per app — code only, no per-app manifest
│   └── <source>
└── README.md
```

`rig.yaml`'s `install:` block installs whatever runtime the example needs at first boot — no extra `package.json` / `requirements.txt`. Single-purpose by design: the file you read top-to-bottom is the whole picture.

## Requirements

Latest CLI:

```bash
curl -fsSL https://rigbox.dev/install.sh | bash
rig --version
```

`rig deploy` requires v0.12.7 or later.
