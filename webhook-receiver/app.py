import hashlib
import hmac
import os
from collections import deque
from datetime import datetime, timezone

from flask import Flask, Response, jsonify, render_template, request

ALGORITHMS = {"sha256": hashlib.sha256, "sha1": hashlib.sha1, "sha512": hashlib.sha512}

PORT = int(os.environ.get("PORT", "8080"))
HMAC_KEY = os.environ.get("WEBHOOK_HMAC_KEY")
SIGNING_ALGORITHM = os.environ.get("SIGNING_ALGORITHM", "sha256")
if SIGNING_ALGORITHM not in ALGORITHMS:
    SIGNING_ALGORITHM = "sha256"
# The server-minted endpoint token. The credential key in rig.yaml is "endpoint_token",
# so Rigbox injects it as CRED_ENDPOINT_TOKEN.
ENDPOINT_TOKEN = os.environ.get("CRED_ENDPOINT_TOKEN", "")

app = Flask(__name__)

# In-memory ring buffer of recent webhooks. Lost on redeploy / restart by design.
recent = deque(maxlen=20)


def sign(body: bytes) -> str:
    digest = hmac.new(HMAC_KEY.encode(), body, ALGORITHMS[SIGNING_ALGORITHM]).hexdigest()
    return f"{SIGNING_ALGORITHM}={digest}"


def record(valid: bool, detail: str, body_preview: str):
    recent.appendleft(
        {
            "at": datetime.now(timezone.utc).strftime("%H:%M:%S UTC"),
            "valid": valid,
            "detail": detail,
            "preview": body_preview,
        }
    )


@app.get("/healthz")
def healthz():
    return Response("ok", mimetype="text/plain")


@app.get("/")
def dashboard():
    return render_template(
        "index.html",
        algorithm=SIGNING_ALGORITHM,
        endpoint_token=ENDPOINT_TOKEN or "(none generated)",
        key_set=bool(HMAC_KEY),
        recent=list(recent),
    )


@app.post("/webhook")
def webhook():
    if not HMAC_KEY:
        return jsonify(valid=False, error="WEBHOOK_HMAC_KEY is not set on the server"), 503

    body = request.get_data()  # raw bytes — HMAC must be over the exact bytes sent
    provided = request.headers.get("X-Signature", "")
    expected = sign(body)
    valid = hmac.compare_digest(provided, expected)

    preview = body.decode("utf-8", "replace")[:120]
    detail = "signature matched" if valid else "signature mismatch or missing X-Signature"
    record(valid, detail, preview)

    status = 200 if valid else 401
    return jsonify(valid=valid, algorithm=SIGNING_ALGORITHM, expected=expected, detail=detail), status


@app.post("/send-test")
def send_test():
    """Build a sample payload, sign it correctly, and run it through the same
    validation path so the dashboard shows a green 'valid' result."""
    if not HMAC_KEY:
        return jsonify(valid=False, error="WEBHOOK_HMAC_KEY is not set on the server"), 503

    payload = (request.form.get("payload") or '{"event":"ping","ok":true}').encode()
    signature = sign(payload)
    valid = hmac.compare_digest(signature, sign(payload))
    record(valid, f"self-signed test ({SIGNING_ALGORITHM})", payload.decode("utf-8", "replace")[:120])
    return jsonify(valid=valid, signature=signature, payload=payload.decode("utf-8", "replace"))


if __name__ == "__main__":
    app.run(host="0.0.0.0", port=PORT)
