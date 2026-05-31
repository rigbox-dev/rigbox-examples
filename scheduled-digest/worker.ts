import http from "node:http";
import fs from "node:fs";
import path from "node:path";

const PORT = Number(process.env.PORT ?? 8080);
const DATA_DIR = process.env.DATA_DIR ?? "/home/developer/data";
const INTERVAL_MINUTES = Math.max(1, Number(process.env.INTERVAL_MINUTES ?? 5));
const INTERVAL_MS = INTERVAL_MINUTES * 60_000;

const LOG_PATH = path.join(DATA_DIR, "digest.log");
const TOKENS_PATH = path.join(import.meta.dirname, "static", "tokens.css");

fs.mkdirSync(DATA_DIR, { recursive: true });

let runCount = 0;
let lastRunAt: string | null = null;
let lastSummary: string | null = null;
let nextRunAt = Date.now() + INTERVAL_MS;

interface DigestEntry {
  ts: string;
  summary: string;
}

function runDigest(): void {
  runCount += 1;
  const now = new Date();
  // Computed "fake metric": a deterministic-ish synthetic gauge so the digest
  // shows movement run-to-run without any external dependency.
  const metric = (Math.sin(runCount / 3) * 50 + 50).toFixed(1);
  const summary = `digest #${runCount} · synthetic load ${metric}%`;
  const entry: DigestEntry = { ts: now.toISOString(), summary };

  fs.appendFileSync(LOG_PATH, JSON.stringify(entry) + "\n");

  lastRunAt = entry.ts;
  lastSummary = summary;
  nextRunAt = Date.now() + INTERVAL_MS;
  console.log(`[digest] ${entry.ts} ${summary} -> ${LOG_PATH}`);
}

function readRecentEntries(limit = 10): DigestEntry[] {
  if (!fs.existsSync(LOG_PATH)) return [];
  const lines = fs
    .readFileSync(LOG_PATH, "utf8")
    .split("\n")
    .filter((l) => l.trim().length > 0);
  const recent = lines.slice(-limit).reverse();
  const entries: DigestEntry[] = [];
  for (const line of recent) {
    try {
      entries.push(JSON.parse(line) as DigestEntry);
    } catch {
      // skip malformed line
    }
  }
  return entries;
}

function esc(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

function formatCountdown(ms: number): string {
  if (ms <= 0) return "due now";
  const total = Math.round(ms / 1000);
  const m = Math.floor(total / 60);
  const s = total % 60;
  return m > 0 ? `${m}m ${s}s` : `${s}s`;
}

function statusPage(): string {
  const entries = readRecentEntries(10);
  const countdown = formatCountdown(nextRunAt - Date.now());
  const lastRunLabel = lastRunAt ?? "no run yet";
  const healthPill = lastRunAt
    ? `<span class="rb-pill rb-pill-ok">healthy · ${runCount} run${runCount === 1 ? "" : "s"}</span>`
    : `<span class="rb-pill rb-pill-warn">warming up</span>`;

  const rows =
    entries.length === 0
      ? `<p class="rb-muted">No digest entries yet — the first run lands within ${esc(String(INTERVAL_MINUTES))} minute(s).</p>`
      : `<ul class="digest-list rb-stack">${entries
          .map(
            (e) =>
              `<li class="digest-entry"><span class="rb-mono rb-muted">${esc(e.ts)}</span><span>${esc(e.summary)}</span></li>`,
          )
          .join("")}</ul>`;

  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<meta http-equiv="refresh" content="15" />
<title>Scheduled Digest · Rigbox example</title>
<link rel="stylesheet" href="/tokens.css" />
<style>
  .digest-list { list-style: none; margin: 0; padding: 0; }
  .digest-entry {
    display: flex; flex-direction: column; gap: 2px;
    padding: var(--rb-s3); border: 1px solid var(--rb-border);
    border-radius: var(--rb-radius-sm); background: var(--rb-surface-2);
  }
  .stat-grid { display: flex; gap: var(--rb-s5); flex-wrap: wrap; }
  .stat { display: flex; flex-direction: column; gap: var(--rb-s1); }
  .stat .value { font-size: 1.4rem; font-weight: 600; }
</style>
</head>
<body>
<header class="rb-header">
  <span class="rb-title">Scheduled Digest</span>
  <span class="rb-badge">Rigbox example</span>
</header>

<main class="rb-container">
  <div class="rb-card rb-stack">
    <div class="rb-row">
      <h1 style="margin:0">Background digest worker</h1>
      ${healthPill}
    </div>
    <p class="rb-muted">
      One process runs an interval loop and serves this page. Every
      <strong>${esc(String(INTERVAL_MINUTES))}</strong> minute(s) it appends a digest entry
      to a log under <span class="rb-mono">DATA_DIR</span>, which survives redeploys.
    </p>

    <div class="stat-grid">
      <div class="stat">
        <span class="rb-label">Interval</span>
        <span class="value"><span class="rb-pill">every ${esc(String(INTERVAL_MINUTES))} min</span></span>
      </div>
      <div class="stat">
        <span class="rb-label">Next run in</span>
        <span class="value rb-mono">${esc(countdown)}</span>
      </div>
      <div class="stat">
        <span class="rb-label">Last run</span>
        <span class="value rb-mono">${esc(lastRunLabel)}</span>
      </div>
    </div>
  </div>

  <div class="rb-card rb-stack">
    <h2>Recent digest entries</h2>
    ${rows}
  </div>
</main>

<footer class="rb-footer">
  A Rigbox example · built with <em>TypeScript on Node 22</em> ·
  <a href="https://rigbox.dev">rigbox.dev</a>
</footer>
</body>
</html>`;
}

const server = http.createServer((req, res) => {
  const url = req.url ?? "/";

  if (url === "/healthz") {
    res.writeHead(200, { "content-type": "application/json" });
    res.end(
      JSON.stringify({
        status: "ok",
        runCount,
        lastRunAt,
        lastSummary,
        intervalMinutes: INTERVAL_MINUTES,
        nextRunInSeconds: Math.max(0, Math.round((nextRunAt - Date.now()) / 1000)),
      }),
    );
    return;
  }

  if (url === "/tokens.css") {
    fs.readFile(TOKENS_PATH, (err, buf) => {
      if (err) {
        res.writeHead(404).end("not found");
        return;
      }
      res.writeHead(200, { "content-type": "text/css; charset=utf-8" });
      res.end(buf);
    });
    return;
  }

  if (url === "/" || url.startsWith("/?")) {
    res.writeHead(200, { "content-type": "text/html; charset=utf-8" });
    res.end(statusPage());
    return;
  }

  res.writeHead(404, { "content-type": "text/plain" });
  res.end("not found");
});

server.listen(PORT, "0.0.0.0", () => {
  console.log(`[scheduled-digest] listening on 0.0.0.0:${PORT}`);
  console.log(`[scheduled-digest] interval=${INTERVAL_MINUTES}m log=${LOG_PATH}`);
});

setInterval(runDigest, INTERVAL_MS);
