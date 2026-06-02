# rigbox-examples

A suite of small, recognizable products — each a **different stack**, each with a
**minimal UI in one shared design language**, each demonstrating **one Rigbox
capability** with the proper platform primitive. Every example is described by a
single root `rig.yaml` and deploys in one command from a fresh clone:

```bash
cd <example> && rig deploy
```

## The suite

| Example | Stack | Capability it shows |
|---|---|---|
| [`quickstart/`](./quickstart/) | TypeScript (Hono) | the canonical single-app `rig.yaml`, and **both** deploy sources — local rsync vs `source: { kind: git }` |
| [`ai-chat/`](./ai-chat/) | Python · FastAPI | the **managed AI proxy** (`ai: managed: true`) + a portable model alias as a validated `select` param |
| [`todo-app/`](./todo-app/) | Next.js (React/TS) + TS API | multi-app **loopback service discovery** (`dependsOn`) + public/private visibility + SQLite |
| [`bluegreen-blog/`](./bluegreen-blog/) | Ruby · Sinatra | **bluegreen + promote**, and theme selection via a server-validated `select` param (not a raw env var) |
| [`webhook-receiver/`](./webhook-receiver/) | Python · Flask | `secrets:` + a server-generated `credentials:` + a `select` param for the signing algorithm |
| [`scheduled-digest/`](./scheduled-digest/) | TypeScript | a background worker loop + `/healthz` + a `number` param for the schedule |
| [`url-shortener/`](./url-shortener/) | Python · Django | the **full validated param set** (url/string/number/boolean/select/email/secret/textarea) + SQLite migrations |
| [`markdown-notes/`](./markdown-notes/) | Python · Flask | a **Dockerfile reproducible build** (deps frozen into the image) + SQLite persistence — deploy with `rig deploy --reproducible` |

Most examples deploy with `rig deploy` (rsync + `install:` on the VM). Two —
[`ai-chat/`](./ai-chat/) and [`markdown-notes/`](./markdown-notes/) — freeze their
environment into an image with a `Dockerfile` and deploy with
`rig deploy --reproducible` (see **Docker builds & the hybrid deploy** below).

Single-app examples use the top-level `name`/`port`/`start`/`install`/`health`
shape. Multi-app examples use a `workspace:` block + an `apps:` map, where each app
carries its spec inline (`port`, `start`, `install`, `env`, `health`, `params`,
`dependsOn`, `visibility`) plus a `path: ./dir` pointing at its code. `rig deploy`
rsyncs and installs each app's `path` and brings them up in `dependsOn` order;
`rig deploy --app <name>` redeploys just one.

## Shared design language

All of them look like one product family. That comes entirely from
[`design/`](./design/):

- [`design/tokens.css`](./design/tokens.css) — the design tokens (iris accent,
  light + dark, `rb-*` utility classes: card / btn / input / select / pill /
  header / footer / badge). Every app ships a byte-identical copy and wires it up
  per stack (Next imports it globally; Django/Flask/Sinatra `<link>` it; the TS
  apps serve it static).
- [`design/STYLE.md`](./design/STYLE.md) — the page skeleton + component rules.
- [`design/CONTRACT.md`](./design/CONTRACT.md) — the technical contract every
  example follows (base-image runtime, the `0.0.0.0` + `/healthz` health gate, the
  rig.yaml schema, params/secrets/credentials, `DATA_DIR` persistence).

## Proper primitives

The point of the suite is to model the *right* primitive for each job:

- **Validated config** is a `param` with a fixed option set (`type: select`), not a
  free-form env var — the server validates it and it's live-editable with
  `rig app param set <key>=<value>`. Fixed infra (paths, base URLs) stays in `env:`.
- **Persistence** lives under `DATA_DIR=/home/developer/data`, *outside* the rsync
  zone, so SQLite DBs and files survive every redeploy and bluegreen cut-over.
- **Visibility** is declared in `rig.yaml` (`visibility: public` / `private` /
  `{ emails: [...] }`) so a redeploy keeps it — only an app's front door is public;
  siblings reach private apps over loopback via `dependsOn`.

## Docker builds & the hybrid deploy

Most examples install their runtime on the VM with `install:` and deploy with
`rig deploy`. **`ai-chat`** and **`markdown-notes`** instead **freeze their
environment into an image** with a `Dockerfile` (`FROM rigbox-base`) and deploy
with `rig deploy --reproducible`:

- the **first** deploy builds the image from the local Dockerfile (the CLI uploads
  the project dir as the build context — no git repo needed), boots from that
  frozen image, and rsyncs the code;
- **later** deploys reuse the cached image when the Dockerfile/deps are unchanged
  and **only rsync the changed code** — no rebuild, no re-install.

That's the hybrid: build the slow, stable environment once; ride fast-changing
code over it with rsync. See [`design/CONTRACT.md`](./design/CONTRACT.md) →
*Reproducible builds* for the full rules and when to pick which.

## Layout convention

Each directory is self-contained:

```
single-app-example/
├── rig.yaml          # the whole deploy spec, top to bottom
├── <source files>
└── README.md         # what it is + what to look at after deploy

multi-app-example/
├── rig.yaml          # workspace: block + apps: map (every app spec inline)
├── <app-name>/       # one dir per app — code only, no per-app manifest
└── README.md
```

`rig.yaml`'s `install:` provisions whatever runtime the example needs at deploy
time. The base VM ships `python3`, `node`, `sqlite3`, and `build-essential`; Ruby
is `apt`-installed by the blog. Each example's own `README.md` covers what it
demonstrates, the deploy command, what to look at afterward, and any required env.

## Requirements

Latest CLI:

```bash
curl -fsSL https://rigbox.dev/install.sh | bash
rig --version
```
