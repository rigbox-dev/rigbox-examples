import os
import sqlite3
from datetime import datetime, timezone

import markdown
from flask import Flask, g, redirect, render_template, request, url_for
from markupsafe import Markup
from pygments.formatters import HtmlFormatter

PORT = int(os.environ.get("PORT", "8080"))
# DATA_DIR lives outside the rsync zone, so the SQLite DB survives every redeploy.
DATA_DIR = os.environ.get("DATA_DIR", "/home/developer/data")
DB_PATH = os.path.join(DATA_DIR, "markdown-notes.db")

# codehilite + fenced_code turn ```lang blocks into Pygments-classed HTML; we ship
# the matching stylesheet (below) so those classes actually render.
MD_EXTENSIONS = ["fenced_code", "codehilite", "tables", "sane_lists"]
PYGMENTS_CSS = HtmlFormatter().get_style_defs(".codehilite")

app = Flask(__name__)


def db():
    # One connection per request; Flask tears it down in close_db.
    if "db" not in g:
        g.db = sqlite3.connect(DB_PATH)
        g.db.row_factory = sqlite3.Row
    return g.db


@app.teardown_appcontext
def close_db(_exc):
    conn = g.pop("db", None)
    if conn is not None:
        conn.close()


def init_db():
    # mkdir because a fresh workspace won't have DATA_DIR yet.
    os.makedirs(DATA_DIR, exist_ok=True)
    with sqlite3.connect(DB_PATH) as conn:
        conn.execute(
            """
            CREATE TABLE IF NOT EXISTS notes (
                id         INTEGER PRIMARY KEY AUTOINCREMENT,
                title      TEXT NOT NULL,
                body       TEXT NOT NULL,
                created_at TEXT NOT NULL
            )
            """
        )


def render_markdown(text: str) -> Markup:
    # New converter per call so codehilite state doesn't leak between notes.
    html = markdown.markdown(text, extensions=MD_EXTENSIONS)
    return Markup(html)


@app.get("/healthz")
def healthz():
    return {"ok": True}


@app.get("/")
def index():
    rows = db().execute(
        "SELECT id, title, body, created_at FROM notes ORDER BY id DESC"
    ).fetchall()
    notes = [
        {
            "title": r["title"],
            "html": render_markdown(r["body"]),
            "created_at": r["created_at"],
        }
        for r in rows
    ]
    return render_template("index.html", notes=notes, pygments_css=PYGMENTS_CSS)


@app.post("/notes")
def create_note():
    title = (request.form.get("title") or "Untitled").strip() or "Untitled"
    body = request.form.get("body") or ""
    conn = db()
    conn.execute(
        "INSERT INTO notes (title, body, created_at) VALUES (?, ?, ?)",
        (title, body, datetime.now(timezone.utc).strftime("%Y-%m-%d %H:%M UTC")),
    )
    conn.commit()
    return redirect(url_for("index"))


# Initialize at import so it runs under gunicorn (which never executes __main__).
init_db()

if __name__ == "__main__":
    app.run(host="0.0.0.0", port=PORT)
