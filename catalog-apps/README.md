# Catalog apps

Standalone reproductions of every app in the [Rigbox catalog](https://docs.rigbox.dev/) — same product the catalog installs, but shipped as a regular `rig deploy`-able example you can fork, modify, and run on its own.

These live in their own subtree so they don't crowd the [curated example suite](../README.md) at the repo root (todo-app, quickstart, ai-chat, bluegreen-blog, …). Each catalog app uses the same `FROM rigbox-base` Dockerfile pattern as `gitea/`, `n8n/`, `code-server/`.

## Service apps — [`service/`](./service/)

Apps that expose a port + health probe, accessed in a browser at the workspace's auto-issued subdomain.

| Example | Product | One-line capability |
|---|---|---|
| [`service/jupyter/`](./service/jupyter/) | **JupyterLab** | reproducible notebook server; notebooks persist under `$DATA_DIR` |
| [`service/marimo/`](./service/marimo/) | **Marimo** | reactive (git-friendly `.py` cells) Python notebook |
| [`service/streamlit/`](./service/streamlit/) | **Streamlit** | framework frozen in the image; edit `app.py` and redeploy without re-running pip |
| [`service/pgweb/`](./service/pgweb/) | **pgweb** | single Go binary frontend for *any* external Postgres (secret `database_url` param) |
| [`service/excalidraw/`](./service/excalidraw/) | **Excalidraw** | virtual whiteboard, vite-built static SPA frozen into the image |
| [`service/filebrowser/`](./service/filebrowser/) | **File Browser** | pinned single Go binary serving `$DATA_DIR` over a web UI |
| [`service/openterminal/`](./service/openterminal/) | **Open Terminal** | sandboxed REST API for shell + filesystem, designed for AI agents; key materialised on boot |
| [`service/firecrawl/`](./service/firecrawl/) | **Firecrawl** | self-hosted web-scraping API — Postgres-17 + Redis + RabbitMQ + Chromium frozen in a 12GB ext4 image |
| [`service/hermes-agent/`](./service/hermes-agent/) | **Hermes Agent** | self-improving agent + a separate user-bus messaging gateway bridging Telegram/Discord/Slack/WhatsApp/Signal |
| [`service/t3code/`](./service/t3code/) | **T3 Code** | multiple browser-tabbed coding agents (Claude Code, Codex, …) behind one web UI |
| [`service/open-webui/`](./service/open-webui/) | **Open WebUI** | full-featured chat UI fronted by the Rigbox managed AI proxy — every chat metered against workspace credits |
| [`service/openclaw-gateway/`](./service/openclaw-gateway/) | **OpenClaw Gateway** | WebSocket control-plane gateway that powers the Clawd browser dashboard |

## CLI apps — [`cli/`](./cli/)

AI coding CLIs/TUIs accessed by SSHing into the workspace. The catalog ships each as `AppKind::Cli` (no port, no health probe) but `rig.yaml` requires a port and health gate today, so every CLI example serves a small `python3 -m http.server` landing page on `:8080` that explains the SSH workflow. The value is the CLI on SSH.

| Example | Product | One-line capability |
|---|---|---|
| [`cli/claude/`](./cli/claude/) | **Claude Code** | Anthropic's coding agent, `OPENROUTER_* → ANTHROPIC_*` env translation |
| [`cli/codex/`](./cli/codex/) | **Codex CLI** | OpenAI's Codex CLI with one-rename `OPENROUTER_* → OPENAI_*` shim (OpenRouter is OpenAI-compatible at `/v1`) |
| [`cli/opencode/`](./cli/opencode/) | **OpenCode** | OSS Go-based TUI from sst/opencode with **native** `OPENROUTER_API_KEY` (no translation shim) |
| [`cli/junie/`](./cli/junie/) | **Junie** | JetBrains' AI agent with a heavy postinstall archive frozen into the image once |
| [`cli/kilocode/`](./cli/kilocode/) | **Kilo Code** | multi-provider CLI (100+ providers) pinned at image-build time to OpenRouter |
| [`cli/pi/`](./cli/pi/) | **Pi** | OpenRouter-native CLI coding agent (`@mariozechner/pi-coding-agent`); SSH in and run `pi` |

## Deploy

Same as every other example in this repo:

```bash
cd catalog-apps/<group>/<name>
rig deploy
```
