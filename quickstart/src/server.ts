import { readFileSync } from "node:fs";
import { hostname } from "node:os";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { serve } from "@hono/node-server";
import { Hono } from "hono";

const PORT = Number(process.env.PORT ?? 8080);
const HOST = "0.0.0.0";
const BOOTED_AT = Date.now();

const here = dirname(fileURLToPath(import.meta.url));
const tokensCss = readFileSync(join(here, "..", "public", "tokens.css"), "utf8");

function uptime(): string {
  const total = Math.floor((Date.now() - BOOTED_AT) / 1000);
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = total % 60;
  return [h ? `${h}h` : "", m ? `${m}m` : "", `${s}s`].filter(Boolean).join(" ");
}

function status() {
  return {
    status: "running",
    node: process.version,
    hostname: hostname(),
    uptimeSeconds: Math.floor((Date.now() - BOOTED_AT) / 1000),
    pid: process.pid,
  };
}

const app = new Hono();

app.get("/healthz", (c) => c.json({ status: "ok", uptimeSeconds: status().uptimeSeconds }));

app.get("/tokens.css", (c) => c.body(tokensCss, 200, { "Content-Type": "text/css; charset=utf-8" }));

app.get("/", (c) => {
  const s = status();
  return c.html(page(s));
});

function escapeHtml(value: string): string {
  return value.replace(/[&<>"']/g, (ch) =>
    ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[ch] as string,
  );
}

function page(s: ReturnType<typeof status>): string {
  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>Quickstart · Rigbox example</title>
  <link rel="stylesheet" href="/tokens.css" />
</head>
<body>
  <header class="rb-header">
    <span class="rb-title">Quickstart</span>
    <span class="rb-badge">Rigbox example</span>
  </header>

  <main class="rb-container">
    <div class="rb-card rb-stack">
      <div class="rb-row">
        <h1 style="margin:0">Live status</h1>
        <span class="rb-pill rb-pill-ok">running</span>
      </div>
      <p class="rb-muted">
        This is the hello-world Rigbox app — the smallest thing that shows the shape of
        a single-app deploy: a process bound to <span class="rb-mono">0.0.0.0:${PORT}</span>,
        a <span class="rb-mono">/healthz</span> the platform gates on, and a
        <span class="rb-mono">rig.yaml</span> with <span class="rb-mono">install</span> +
        <span class="rb-mono">start</span>. Copy it as a starting point.
      </p>

      <div class="rb-row" style="align-items:stretch;flex-wrap:wrap">
        ${stat("Node version", escapeHtml(s.node))}
        ${stat("Hostname", escapeHtml(s.hostname))}
        ${stat("Uptime", escapeHtml(uptime()))}
        ${stat("PID", String(s.pid))}
      </div>
    </div>

    <div class="rb-card rb-stack">
      <h2 style="margin:0">Endpoints</h2>
      <p class="rb-muted" style="margin:0">
        <span class="rb-mono">GET /</span> — this page ·
        <span class="rb-mono">GET /healthz</span> — JSON 200, the platform health probe ·
        <span class="rb-mono">GET /tokens.css</span> — the shared design tokens.
      </p>
      <div class="rb-row">
        <a class="rb-btn rb-btn-ghost" href="/healthz">View /healthz</a>
      </div>
    </div>
  </main>

  <footer class="rb-footer">
    A Rigbox example · built with <em>Node 22 · TypeScript · Hono</em> ·
    <a href="https://rigbox.dev">rigbox.dev</a>
  </footer>
</body>
</html>`;
}

function stat(label: string, value: string): string {
  return `<div style="flex:1 1 160px;min-width:140px;border:1px solid var(--rb-border);border-radius:var(--rb-radius-sm);padding:var(--rb-s3) var(--rb-s4);background:var(--rb-surface-2)">
    <div class="rb-muted" style="font-size:.78rem;text-transform:uppercase;letter-spacing:.04em">${label}</div>
    <div class="rb-mono" style="font-size:1.05rem;margin-top:2px">${value}</div>
  </div>`;
}

serve({ fetch: app.fetch, hostname: HOST, port: PORT }, (info) => {
  console.log(`quickstart listening on http://${HOST}:${info.port}`);
});
