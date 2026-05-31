"""Rigbox example — AI chat over the managed AI proxy.

The headline capability: this app never holds a real API key. With
`ai: { managed: true }` in rig.yaml, Rigbox injects an OpenAI-compatible
endpoint (OPENAI_BASE_URL) and a sentinel key (OPENAI_API_KEY=managed-by-rigbox).
The proxy authenticates, meters, and forwards to a real provider — the guest
just talks to the OpenAI chat-completions API with a portable model alias.
"""

import os
from pathlib import Path

import httpx
from fastapi import FastAPI
from fastapi.responses import HTMLResponse
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel

OPENAI_BASE_URL = os.environ.get("OPENAI_BASE_URL", "").rstrip("/")
OPENAI_API_KEY = os.environ.get("OPENAI_API_KEY", "managed-by-rigbox")
MODEL = os.environ.get("MODEL", "rigbox/default")

STATIC_DIR = Path(__file__).parent / "static"

app = FastAPI(title="AI Chat — Rigbox example")
app.mount("/static", StaticFiles(directory=str(STATIC_DIR)), name="static")


class ChatRequest(BaseModel):
    message: str


class ChatReply(BaseModel):
    reply: str
    model: str


@app.get("/healthz")
def healthz():
    return {"ok": True}


@app.post("/chat", response_model=ChatReply)
async def chat(req: ChatRequest):
    message = (req.message or "").strip()
    if not message:
        return ChatReply(reply="(say something first)", model=MODEL)

    if not OPENAI_BASE_URL:
        return ChatReply(
            reply=(
                "The managed AI proxy isn't wired up. This app expects "
                "OPENAI_BASE_URL + OPENAI_API_KEY injected by Rigbox "
                "(ai: { managed: true } in rig.yaml)."
            ),
            model=MODEL,
        )

    payload = {
        "model": MODEL,
        "messages": [
            {
                "role": "system",
                "content": "You are a concise, friendly assistant running inside a Rigbox sandbox.",
            },
            {"role": "user", "content": message},
        ],
    }
    headers = {"Authorization": f"Bearer {OPENAI_API_KEY}"}

    try:
        async with httpx.AsyncClient(timeout=60.0) as client:
            resp = await client.post(
                f"{OPENAI_BASE_URL}/chat/completions",
                json=payload,
                headers=headers,
            )
            resp.raise_for_status()
            data = resp.json()
        reply = data["choices"][0]["message"]["content"].strip()
    except httpx.HTTPStatusError as exc:
        reply = f"Proxy returned {exc.response.status_code}: {exc.response.text[:300]}"
    except Exception as exc:  # noqa: BLE001 — surface any transport error to the UI
        reply = f"Could not reach the AI proxy: {exc}"

    return ChatReply(reply=reply, model=MODEL)


@app.get("/", response_class=HTMLResponse)
def index():
    return INDEX_HTML.replace("__MODEL__", MODEL)


INDEX_HTML = """<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<title>AI Chat — Rigbox example</title>
<link rel="stylesheet" href="/static/tokens.css" />
<style>
  .chat-log {
    display: flex; flex-direction: column; gap: var(--rb-s3);
    min-height: 220px; max-height: 50vh; overflow-y: auto;
    padding: var(--rb-s2);
  }
  .msg { max-width: 80%; padding: 9px 13px; border-radius: var(--rb-radius);
         border: 1px solid var(--rb-border); white-space: pre-wrap; }
  .msg-user { align-self: flex-end; background: var(--rb-accent-soft);
              border-color: transparent; }
  .msg-bot { align-self: flex-start; background: var(--rb-surface-2); }
  .chat-empty { color: var(--rb-muted); align-self: center; margin: auto 0; }
  .chat-form { display: flex; gap: var(--rb-s3); align-items: flex-end; }
  .chat-form .rb-input { flex: 1; }
</style>
</head>
<body>
<header class="rb-header">
  <span class="rb-title">AI Chat</span>
  <span class="rb-badge">Rigbox example</span>
</header>

<main class="rb-container">
  <div class="rb-card rb-stack">
    <div class="rb-row" style="justify-content: space-between;">
      <h1 style="margin:0;">Chat over the managed AI proxy</h1>
      <span class="rb-pill rb-pill-ok" id="model-pill">__MODEL__</span>
    </div>
    <p class="rb-muted">
      No API key lives in this VM. Rigbox injects an OpenAI-compatible endpoint
      and authenticates + meters each call. The model is a portable alias —
      flip it with <span class="rb-mono">rig app param set model=&lt;alias&gt;</span>.
    </p>

    <div class="chat-log" id="log">
      <div class="chat-empty" id="empty">Ask the assistant anything to start.</div>
    </div>

    <form class="chat-form" id="form">
      <input class="rb-input" id="input" placeholder="Type a message…" autocomplete="off" />
      <button class="rb-btn" id="send" type="submit">Send</button>
    </form>
  </div>
</main>

<footer class="rb-footer">
  A Rigbox example · built with <em>Python · FastAPI</em> ·
  <a href="https://rigbox.dev">rigbox.dev</a>
</footer>

<script>
  const log = document.getElementById("log");
  const empty = document.getElementById("empty");
  const form = document.getElementById("form");
  const input = document.getElementById("input");
  const send = document.getElementById("send");

  function bubble(text, who) {
    if (empty) empty.remove();
    const el = document.createElement("div");
    el.className = "msg msg-" + who;
    el.textContent = text;
    log.appendChild(el);
    log.scrollTop = log.scrollHeight;
    return el;
  }

  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    const message = input.value.trim();
    if (!message) return;
    bubble(message, "user");
    input.value = "";
    input.disabled = send.disabled = true;
    const pending = bubble("…", "bot");
    try {
      const resp = await fetch("/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message }),
      });
      const data = await resp.json();
      pending.textContent = data.reply;
      if (data.model) document.getElementById("model-pill").textContent = data.model;
    } catch (err) {
      pending.textContent = "Request failed: " + err;
    } finally {
      input.disabled = send.disabled = false;
      input.focus();
    }
  });
</script>
</body>
</html>"""
