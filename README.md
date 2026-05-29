# rigbox-examples

Small, deployable apps that map each Rigbox manifest surface to a working command. Two manifest formats, three deploy verbs:

| Manifest | Local-deploy verb | Registry-deploy verb |
|---|---|---|
| `rig.yaml` (one app) | `rig app deploy` | `rig recipe app install --ref ...` |
| `composition.yaml` (multi-app workspace) | `rig workspace deploy` | `rig recipe composition deploy --ref ...` |

You can also type `rig deploy` from a project directory — it auto-detects which manifest is present and routes to the right verb.

Every example here deploys in **one command** from a fresh clone. The manifests are pure deploy specs — no vendor identity baked in — so `rig app deploy` / `rig workspace deploy` work straight from the checkout. Publishing to the catalog is a separate, deliberate step (`rig recipe app|composition publish` with `--vendor/--slug/--version`).

## Single-app examples (`rig.yaml`)

### [`sample-node-app/`](./sample-node-app/)

Smallest valid `rig.yaml` — Node HTTP server on port 5000, `apt install nodejs` at install time. Reference for the minimum shape.

```bash
cd sample-node-app && rig app deploy --workspace <ws>
```

### [`ai-chat/`](./ai-chat/)

FastAPI passthrough chat showing `ai: managed: true`. The CLI injects `OPENAI_BASE_URL` + `OPENAI_API_KEY=managed-by-rigbox`, so the same code routes through the platform-managed OpenAI-compatible proxy without proxy-specific logic.

```bash
cd ai-chat && rig app deploy --workspace <ws>
```

### [`param-showcase/`](./param-showcase/)

Exercises every `ParamSpec` type (`string` / `number` / `boolean` / `secret` / `select` / `email` / `url` / `textarea`) and every notable attribute. Open the `rig.yaml` for the canonical reference page.

```bash
cd param-showcase && rig app deploy --workspace <ws>
```

### [`webhook-receiver/`](./webhook-receiver/)

Production-shape secret hygiene in one app: `secrets:` forwards a value from your shell, `credentials: { generate: true }` has the platform mint a random session secret, `params:` lets you flip the HMAC signing algorithm without redeploying.

```bash
export WEBHOOK_HMAC_KEY=$(openssl rand -hex 32)
cd webhook-receiver && rig app deploy --workspace <ws>
```

### [`portable-deploy/`](./portable-deploy/)

Git-source deploy: `source: { kind: git, repo: ... }` makes the VM clone the source at install time, so the deploy carries no local source.

```bash
cd portable-deploy && rig app deploy --workspace <ws>
```

### [`daily-digest/`](./daily-digest/)

Background worker on an interval — the canonical "I want this to run every N seconds" shape. Real work happens in a `setInterval` loop; a 30-line HTTP surface serves `/healthz` because the platform health-checks every app. `tick_seconds` param tunes the schedule.

```bash
cd daily-digest && rig app deploy --workspace <ws>
```

## Multi-app composition examples (`composition.yaml`)

### [`bluegreen-blog/`](./bluegreen-blog/)

Bluegreen + promote on a real-shape stateful app, with `dependsOn` as a true readiness gate. A markdown blog keeps posts on disk *outside* the rsync zone; a migrator sidecar ensures the data dir exists before the blog starts. Redesign as a bluegreen sibling, verify on live data, then atomically swap.

```bash
cd bluegreen-blog && rig workspace deploy --name blog-stack
# … write a post, then redesign:
rig app deploy --workspace blog-stack --app bg-blog --bluegreen v2
rig app deploy --workspace blog-stack --app bg-blog --bluegreen v2 --promote
```

### [`frontend-plus-api/`](./frontend-plus-api/)

A two-app composition: a tiny todo API plus a vanilla-JS frontend that talks to it on a sibling subdomain. Ships **two compositions side-by-side** for the two deploy modes — one source of truth for the app code.

| Variant | File | Deploy command | What it does |
|---|---|---|---|
| Registry-ref children | `composition.yaml` (root) | `cd frontend-plus-api && rig workspace deploy` | Children declared as `apps[].ref: @rigbox/fpa-*@x.y.z` — the deploy pulls those already-published recipes. The composition manifest itself carries no vendor; publish it deliberately with `rig recipe composition publish`. |
| Local path children | `dev/composition.yaml` | `cd frontend-plus-api/dev && rig workspace deploy` | Children declared as `apps[].path: ../backend` / `../frontend`. Each deploy rsyncs your working copy and re-installs in place. Iteration-friendly. |

## Layout convention

Each directory is self-contained. The shape depends on the manifest:

```
single-app-example/
├── rig.yaml          # what gets deployed
├── <source files>
└── README.md         # what it does and the curl that proves it

composition-example/
├── composition.yaml  # workspace blueprint
├── <child>/
│   ├── rig.yaml
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

`rig workspace deploy` and `rig deploy` require v0.12.7 or later; the other verbs work on v0.12.4+.
