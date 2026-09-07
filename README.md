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
| [`todo-app/`](./todo-app/) | Next.js (React/TS) + TS API | multi-app **loopback service discovery** (`dependsOn`) + public/private visibility + volume-backed SQLite |
| [`bluegreen-blog/`](./bluegreen-blog/) | Ruby · Sinatra | **bluegreen + promote**, and theme selection via a server-validated `select` param (not a raw env var) |
| [`webhook-receiver/`](./webhook-receiver/) | Python · Flask | `secrets:` + a server-generated `credentials:` + a `select` param for the signing algorithm |
| [`scheduled-digest/`](./scheduled-digest/) | TypeScript | a background worker loop + `/healthz` + a `number` param for the schedule |
| [`url-shortener/`](./url-shortener/) | Python · Django | the **full validated param set** (url/string/number/boolean/select/email/secret/textarea) + SQLite migrations |
| [`markdown-notes/`](./markdown-notes/) | Python · Flask | **workspace volume-backed SQLite persistence** + Markdown rendering |

Every example deploys with the same command — `rig deploy`. All of them rsync
code and describe their environment with `install:`. Several also set
`reproducible: true`, which makes `rig deploy` **freeze the result of `install:`
into an image** and boot from it (see **Reproducible deploys & the hybrid model**
below). No Dockerfile anywhere — the flag is the signal.

### Established products, run reproducibly

These run real, recognizable self-hosted products on Rigbox via a
`reproducible: true` `install:` script that installs the product on top of the
Rigbox base. `rig deploy` runs the script once in a builder VM, freezes the
result as an image, then reuses it. (Upstream Docker images like `postgres:16`
can't be booted — they lack the rigbox agent + init — so each installs the
product on the rigbox base instead.)

| Example | Product | What it shows |
|---|---|---|
| [`code-server/`](./code-server/) | **code-server** (VS Code) | run an established product via a reproducible `install:`; settings/extensions persist under `$DATA_DIR` |
| [`gitea/`](./gitea/) | **Gitea** (Git hosting) | a headless single-binary service (install wizard locked) with SQLite + repos under `$DATA_DIR` |
| [`n8n/`](./n8n/) | **n8n** (workflow automation) | freeze a heavy `npm install` into the image; workflows persist under `$DATA_DIR` |

## Catalog apps

Standalone reproductions of every app in the [Rigbox catalog](https://docs.rigbox.dev/), kept in [`catalog-apps/`](./catalog-apps/) so they don't crowd the curated example suite. Each is a regular `rig deploy`-able example you can fork, modify, and run on its own — see [`catalog-apps/README.md`](./catalog-apps/README.md) for the full index.

- [`catalog-apps/service/`](./catalog-apps/service/) — 12 examples that expose a port + health probe (jupyter, marimo, streamlit, pgweb, excalidraw, filebrowser, openterminal, firecrawl, hermes-agent, t3code, open-webui, openclaw-gateway).
- [`catalog-apps/cli/`](./catalog-apps/cli/) — 6 SSH-first CLI examples (claude, codex, opencode, junie, kilocode, pi). Each declares `kind: cli` so there's no port, start, or health probe — the value is the CLI on SSH.

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
- **Persistence** uses a `workspace.volumes` declaration plus explicit app
  `volumes: [data]` opt-in. Apps write durable data under
  `DATA_DIR=/home/developer/data`, so SQLite DBs and files survive every redeploy
  and bluegreen cut-over.
- **Visibility** is declared in `rig.yaml` (`visibility: public` / `private` /
  `{ emails: [...] }`) so a redeploy keeps it — only an app's front door is public;
  siblings reach private apps over loopback via `dependsOn`.

## Reproducible deploys & the hybrid model

Every example installs its runtime with `install:`. By default that script runs
on the workspace VM on each deploy. The established products —
**`code-server`**, **`gitea`**, **`n8n`**, and every [`catalog-apps/`](./catalog-apps/)
example — add one line, `reproducible: true`, which makes the same `install:`
**freeze into an image** instead. The command is the same — `rig deploy`:

- the **first** deploy boots a throwaway builder VM from the `base` image, runs
  `install:` inside it, snapshots the rootfs as a content-addressed image, boots
  the workspace from that frozen image, and rsyncs the code;
- **later** deploys reuse the cached image when the build inputs (`install:`
  script, base image, lockfiles) are unchanged and **only rsync the changed
  code** — no rebuild, no re-install.

That's the hybrid: build the slow, stable environment once; ride fast-changing
code over it with rsync. `install:` runs as `developer` (with passwordless
`sudo`) in an **empty** deploy dir inside the builder — so it must be
self-contained (inline any config it needs via heredocs) and idempotent, since
the exact same script runs on the workspace VM when `reproducible` is off.
Runtime wrappers (`start.sh`) still rsync in with the code: `start: bash start.sh`.

> **Builder sizing.** The builder VM boots with 1GB RAM / 1 vCPU and inherits
> the app's `workspace.resources.diskSizeMb` (3GB default, 16GB ceiling), so a
> heavy install just needs that value set high enough to hold it. The heavier
> examples (`n8n`, `firecrawl`, `open-webui`, `hermes-agent`, `excalidraw`) size
> themselves in `rig.yaml` and note their footprint in their README.

See [`design/CONTRACT.md`](./design/CONTRACT.md) → *Reproducible builds* for the
full rules and when to pick which.

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

## Deploy from your browser

Fork an example, connect your Rigbox account, and choose a new or existing workspace. Configure it or deploy with defaults. Each target uses a dedicated deployment branch; pushing to that branch redeploys only its workspace. Existing-workspace deployment requires explicit root-filesystem replacement confirmation and retains persistent volumes.

| Example | Deploy |
| --- | --- |
| [ai-chat](./ai-chat/) | [Deploy to Rigbox](https://rigbox.dev/deploy?repo=rigbox-dev%2Frigbox-examples&ref=main&path=ai-chat%2Frig.yaml) |
| [bluegreen-blog](./bluegreen-blog/) | [Deploy to Rigbox](https://rigbox.dev/deploy?repo=rigbox-dev%2Frigbox-examples&ref=main&path=bluegreen-blog%2Frig.yaml) |
| [catalog-apps/cli/claude](./catalog-apps/cli/claude/) | [Deploy to Rigbox](https://rigbox.dev/deploy?repo=rigbox-dev%2Frigbox-examples&ref=main&path=catalog-apps%2Fcli%2Fclaude%2Frig.yaml) |
| [catalog-apps/cli/codex](./catalog-apps/cli/codex/) | [Deploy to Rigbox](https://rigbox.dev/deploy?repo=rigbox-dev%2Frigbox-examples&ref=main&path=catalog-apps%2Fcli%2Fcodex%2Frig.yaml) |
| [catalog-apps/cli/junie](./catalog-apps/cli/junie/) | [Deploy to Rigbox](https://rigbox.dev/deploy?repo=rigbox-dev%2Frigbox-examples&ref=main&path=catalog-apps%2Fcli%2Fjunie%2Frig.yaml) |
| [catalog-apps/cli/kilocode](./catalog-apps/cli/kilocode/) | [Deploy to Rigbox](https://rigbox.dev/deploy?repo=rigbox-dev%2Frigbox-examples&ref=main&path=catalog-apps%2Fcli%2Fkilocode%2Frig.yaml) |
| [catalog-apps/cli/opencode](./catalog-apps/cli/opencode/) | [Deploy to Rigbox](https://rigbox.dev/deploy?repo=rigbox-dev%2Frigbox-examples&ref=main&path=catalog-apps%2Fcli%2Fopencode%2Frig.yaml) |
| [catalog-apps/cli/pi](./catalog-apps/cli/pi/) | [Deploy to Rigbox](https://rigbox.dev/deploy?repo=rigbox-dev%2Frigbox-examples&ref=main&path=catalog-apps%2Fcli%2Fpi%2Frig.yaml) |
| [catalog-apps/service/excalidraw](./catalog-apps/service/excalidraw/) | [Deploy to Rigbox](https://rigbox.dev/deploy?repo=rigbox-dev%2Frigbox-examples&ref=main&path=catalog-apps%2Fservice%2Fexcalidraw%2Frig.yaml) |
| [catalog-apps/service/filebrowser](./catalog-apps/service/filebrowser/) | [Deploy to Rigbox](https://rigbox.dev/deploy?repo=rigbox-dev%2Frigbox-examples&ref=main&path=catalog-apps%2Fservice%2Ffilebrowser%2Frig.yaml) |
| [catalog-apps/service/firecrawl](./catalog-apps/service/firecrawl/) | [Deploy to Rigbox](https://rigbox.dev/deploy?repo=rigbox-dev%2Frigbox-examples&ref=main&path=catalog-apps%2Fservice%2Ffirecrawl%2Frig.yaml) |
| [catalog-apps/service/hermes-agent](./catalog-apps/service/hermes-agent/) | [Deploy to Rigbox](https://rigbox.dev/deploy?repo=rigbox-dev%2Frigbox-examples&ref=main&path=catalog-apps%2Fservice%2Fhermes-agent%2Frig.yaml) |
| [catalog-apps/service/jupyter](./catalog-apps/service/jupyter/) | [Deploy to Rigbox](https://rigbox.dev/deploy?repo=rigbox-dev%2Frigbox-examples&ref=main&path=catalog-apps%2Fservice%2Fjupyter%2Frig.yaml) |
| [catalog-apps/service/marimo](./catalog-apps/service/marimo/) | [Deploy to Rigbox](https://rigbox.dev/deploy?repo=rigbox-dev%2Frigbox-examples&ref=main&path=catalog-apps%2Fservice%2Fmarimo%2Frig.yaml) |
| [catalog-apps/service/open-webui](./catalog-apps/service/open-webui/) | [Deploy to Rigbox](https://rigbox.dev/deploy?repo=rigbox-dev%2Frigbox-examples&ref=main&path=catalog-apps%2Fservice%2Fopen-webui%2Frig.yaml) |
| [catalog-apps/service/openclaw-gateway](./catalog-apps/service/openclaw-gateway/) | [Deploy to Rigbox](https://rigbox.dev/deploy?repo=rigbox-dev%2Frigbox-examples&ref=main&path=catalog-apps%2Fservice%2Fopenclaw-gateway%2Frig.yaml) |
| [catalog-apps/service/openterminal](./catalog-apps/service/openterminal/) | [Deploy to Rigbox](https://rigbox.dev/deploy?repo=rigbox-dev%2Frigbox-examples&ref=main&path=catalog-apps%2Fservice%2Fopenterminal%2Frig.yaml) |
| [catalog-apps/service/pgweb](./catalog-apps/service/pgweb/) | [Deploy to Rigbox](https://rigbox.dev/deploy?repo=rigbox-dev%2Frigbox-examples&ref=main&path=catalog-apps%2Fservice%2Fpgweb%2Frig.yaml) |
| [catalog-apps/service/streamlit](./catalog-apps/service/streamlit/) | [Deploy to Rigbox](https://rigbox.dev/deploy?repo=rigbox-dev%2Frigbox-examples&ref=main&path=catalog-apps%2Fservice%2Fstreamlit%2Frig.yaml) |
| [catalog-apps/service/t3code](./catalog-apps/service/t3code/) | [Deploy to Rigbox](https://rigbox.dev/deploy?repo=rigbox-dev%2Frigbox-examples&ref=main&path=catalog-apps%2Fservice%2Ft3code%2Frig.yaml) |
| [code-server](./code-server/) | [Deploy to Rigbox](https://rigbox.dev/deploy?repo=rigbox-dev%2Frigbox-examples&ref=main&path=code-server%2Frig.yaml) |
| [gitea](./gitea/) | [Deploy to Rigbox](https://rigbox.dev/deploy?repo=rigbox-dev%2Frigbox-examples&ref=main&path=gitea%2Frig.yaml) |
| [markdown-notes](./markdown-notes/) | [Deploy to Rigbox](https://rigbox.dev/deploy?repo=rigbox-dev%2Frigbox-examples&ref=main&path=markdown-notes%2Frig.yaml) |
| [mixed-app](./mixed-app/) | [Deploy to Rigbox](https://rigbox.dev/deploy?repo=rigbox-dev%2Frigbox-examples&ref=main&path=mixed-app%2Frig.yaml) |
| [multi-app](./multi-app/) | [Deploy to Rigbox](https://rigbox.dev/deploy?repo=rigbox-dev%2Frigbox-examples&ref=main&path=multi-app%2Frig.yaml) |
| [n8n](./n8n/) | [Deploy to Rigbox](https://rigbox.dev/deploy?repo=rigbox-dev%2Frigbox-examples&ref=main&path=n8n%2Frig.yaml) |
| [quickstart](./quickstart/) | [Deploy to Rigbox](https://rigbox.dev/deploy?repo=rigbox-dev%2Frigbox-examples&ref=main&path=quickstart%2Frig.yaml) |
| [scheduled-digest](./scheduled-digest/) | [Deploy to Rigbox](https://rigbox.dev/deploy?repo=rigbox-dev%2Frigbox-examples&ref=main&path=scheduled-digest%2Frig.yaml) |
| [todo-app](./todo-app/) | [Deploy to Rigbox](https://rigbox.dev/deploy?repo=rigbox-dev%2Frigbox-examples&ref=main&path=todo-app%2Frig.yaml) |
| [url-shortener](./url-shortener/) | [Deploy to Rigbox](https://rigbox.dev/deploy?repo=rigbox-dev%2Frigbox-examples&ref=main&path=url-shortener%2Frig.yaml) |
| [webhook-receiver](./webhook-receiver/) | [Deploy to Rigbox](https://rigbox.dev/deploy?repo=rigbox-dev%2Frigbox-examples&ref=main&path=webhook-receiver%2Frig.yaml) |

See the [deploy-button guide](https://docs.rigbox.dev/guides/deploy-button) for forks, runtime secrets, configuration, and retries.
