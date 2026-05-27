"""Passthrough chat — POSTs the user's message to an OpenAI-compatible
chat completions endpoint with a small system prompt, returns the reply.

When deployed via `rig app deploy` with `ai: managed: true` in
rig.yaml, the systemd unit gets OPENAI_BASE_URL pointed at the
workspace's managed AI proxy, so this code doesn't need to know
anything about it — the standard `openai` env vars Just Work.
"""

import os
from urllib.request import Request, urlopen
from urllib.error import HTTPError, URLError
import json

from fastapi import FastAPI, HTTPException
from pydantic import BaseModel


SYSTEM_PROMPT = (
    "You are a passthrough chat assistant running inside a Rigbox VM. "
    "Keep replies short (1–3 sentences). When asked what you are, "
    "explain you're a tiny FastAPI app routing through the managed "
    "Rigbox AI proxy."
)

OPENAI_BASE_URL = os.environ.get("OPENAI_BASE_URL", "https://api.openai.com/v1")
OPENAI_API_KEY = os.environ.get("OPENAI_API_KEY", "")
MODEL = os.environ.get("MODEL", "openai/gpt-4o-mini")


app = FastAPI()


class ChatRequest(BaseModel):
    message: str


@app.get("/")
def index():
    return {
        "service": "ai-chat-sample",
        "model": MODEL,
        "proxy": OPENAI_BASE_URL,
        "usage": "POST /chat { message: '...' }",
    }


@app.get("/healthz")
def healthz():
    return {"ok": True}


@app.post("/chat")
def chat(req: ChatRequest):
    if not req.message.strip():
        raise HTTPException(status_code=400, detail="message is empty")

    payload = json.dumps(
        {
            "model": MODEL,
            "messages": [
                {"role": "system", "content": SYSTEM_PROMPT},
                {"role": "user", "content": req.message},
            ],
            "temperature": 0.7,
        }
    ).encode("utf-8")

    request = Request(
        f"{OPENAI_BASE_URL}/chat/completions",
        data=payload,
        headers={
            "Content-Type": "application/json",
            "Authorization": f"Bearer {OPENAI_API_KEY}",
        },
        method="POST",
    )

    try:
        with urlopen(request, timeout=60) as resp:
            body = json.loads(resp.read())
    except HTTPError as e:
        err_body = e.read().decode("utf-8", errors="replace")
        raise HTTPException(
            status_code=e.code,
            detail=f"upstream {e.code}: {err_body[:500]}",
        ) from e
    except URLError as e:
        raise HTTPException(status_code=502, detail=f"upstream unreachable: {e.reason}") from e

    try:
        reply = body["choices"][0]["message"]["content"]
    except (KeyError, IndexError) as e:
        raise HTTPException(
            status_code=502,
            detail=f"unexpected upstream shape: {body}",
        ) from e

    return {"reply": reply, "model": body.get("model", MODEL)}
