const http = require('http');
const fs = require('fs');
const path = require('path');

const REQUIRED_ENV = ['PORT', 'APP_NAME'];
const missingEnv = REQUIRED_ENV.filter((k) => !process.env[k]);
if (missingEnv.length) {
  console.error(`missing required env vars: ${missingEnv.join(', ')} (configure in rig.yaml)`);
  process.exit(1);
}

const port = process.env.PORT;
const appName = process.env.APP_NAME;
const startedAtMs = Date.now();
const startedAtIso = new Date(startedAtMs).toISOString();
const startedShort = new Date(startedAtMs).toUTCString().slice(17, 22) + ' UTC';
const PUBLIC_DIR = path.resolve(__dirname, 'public');

const MAX_RECENT = 40;
const SPARK_BUCKETS = 60;
const PATH_WINDOW_MS = 5 * 60 * 1000;
const PATH_HISTORY_MAX = 2000;
const TOP_PATHS_LIMIT = 8;
let totalRequests = 0;
let reqIdSeq = 0;
const recent = [];
const pathHistory = [];
const buckets = new Array(SPARK_BUCKETS).fill(0);
let bucketEpochSec = Math.floor(startedAtMs / 1000);

function normalizePath(url) {
  const q = url.indexOf('?');
  return q < 0 ? url : url.slice(0, q);
}

function topPaths() {
  const cutoff = Date.now() - PATH_WINDOW_MS;
  let lo = 0, hi = pathHistory.length;
  while (lo < hi) {
    const mid = (lo + hi) >>> 1;
    if (pathHistory[mid].ts < cutoff) lo = mid + 1;
    else hi = mid;
  }
  const counts = new Map();
  for (let i = lo; i < pathHistory.length; i++) {
    const p = pathHistory[i].path;
    counts.set(p, (counts.get(p) || 0) + 1);
  }
  const arr = [];
  for (const [path, count] of counts) arr.push({ path, count });
  arr.sort((a, b) => b.count - a.count);
  return arr.slice(0, TOP_PATHS_LIMIT);
}

function advanceBuckets(nowMs) {
  const nowSec = Math.floor(nowMs / 1000);
  const advance = nowSec - bucketEpochSec;
  if (advance <= 0) return;
  if (advance >= SPARK_BUCKETS) {
    buckets.fill(0);
  } else {
    for (let i = 0; i < advance; i++) {
      buckets.shift();
      buckets.push(0);
    }
  }
  bucketEpochSec = nowSec;
}

function clientIp(req) {
  const xff = req.headers['x-forwarded-for'];
  if (xff) return String(xff).split(',')[0].trim();
  let ip = (req.socket && req.socket.remoteAddress) || '';
  if (ip.startsWith('::ffff:')) ip = ip.slice(7);
  return ip;
}

const SENSITIVE_HEADERS = new Set(['cookie', 'authorization', 'proxy-authorization', 'set-cookie']);
function filterHeaders(h) {
  const out = {};
  for (const k of Object.keys(h)) {
    out[k] = SENSITIVE_HEADERS.has(k.toLowerCase()) ? '<redacted>' : h[k];
  }
  return out;
}

function record(req, status, latency) {
  if (req.url === '/api/stats' || req.url === '/api/stream') return;
  const now = Date.now();
  advanceBuckets(now);
  buckets[SPARK_BUCKETS - 1]++;
  totalRequests++;
  const entry = {
    id: ++reqIdSeq,
    ts: now,
    method: req.method,
    path: req.url,
    status,
    latency,
    ip: clientIp(req),
    httpVersion: req.httpVersion,
    headers: filterHeaders(req.headers),
  };
  recent.unshift(entry);
  if (recent.length > MAX_RECENT) recent.length = MAX_RECENT;
  pathHistory.push({ ts: now, path: normalizePath(req.url) });
  if (pathHistory.length > PATH_HISTORY_MAX) {
    pathHistory.splice(0, pathHistory.length - PATH_HISTORY_MAX);
  }
  sseBroadcast('request', { entry, totalRequests });
}

const sseClients = new Set();

function sseBroadcast(event, data) {
  const msg = `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`;
  for (const res of sseClients) {
    try { res.write(msg); } catch (_) { /* close handler will clean up */ }
  }
}

function percentile(sortedAsc, p) {
  if (!sortedAsc.length) return 0;
  const idx = Math.min(sortedAsc.length - 1, Math.floor((p / 100) * sortedAsc.length));
  return sortedAsc[idx];
}

function computeLatencyStats() {
  if (!recent.length) return { p50: 0, p95: 0, p99: 0 };
  const sorted = recent.map((r) => r.latency).sort((a, b) => a - b);
  return {
    p50: percentile(sorted, 50),
    p95: percentile(sorted, 95),
    p99: percentile(sorted, 99),
  };
}

function computeStatusMix() {
  const mix = { s2: 0, s3: 0, s4: 0, s5: 0, total: recent.length };
  for (const r of recent) {
    if (r.status >= 500) mix.s5++;
    else if (r.status >= 400) mix.s4++;
    else if (r.status >= 300) mix.s3++;
    else mix.s2++;
  }
  return mix;
}

function snapshot() {
  advanceBuckets(Date.now());
  const last10 = buckets.slice(-10);
  const rps = last10.reduce((a, b) => a + b, 0) / last10.length;
  return {
    appName,
    port: Number(port),
    pid: process.pid,
    nodeVersion: process.version,
    totalRequests,
    rps: Math.round(rps * 10) / 10,
    uptimeMs: Date.now() - startedAtMs,
    startedAt: startedAtIso,
    startedShort,
    spark: buckets.slice(),
    recent,
    latencyStats: computeLatencyStats(),
    statusMix: computeStatusMix(),
    topPaths: topPaths(),
  };
}

const CONTENT_TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.css':  'text/css; charset=utf-8',
  '.js':   'application/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg':  'image/svg+xml',
  '.png':  'image/png',
  '.ico':  'image/x-icon',
};

function serveStatic(req, res, finish) {
  const urlPath = req.url === '/' ? '/index.html' : req.url.split('?')[0];
  const resolved = path.resolve(PUBLIC_DIR, '.' + urlPath);
  if (resolved !== PUBLIC_DIR && !resolved.startsWith(PUBLIC_DIR + path.sep)) {
    res.writeHead(403, { 'Content-Type': 'text/plain' });
    res.end('Forbidden\n');
    finish(403);
    return;
  }
  fs.readFile(resolved, (err, data) => {
    if (err) {
      res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
      res.end('Not found: ' + req.url + '\n');
      finish(404);
      return;
    }
    const ext = path.extname(resolved).toLowerCase();
    res.writeHead(200, { 'Content-Type': CONTENT_TYPES[ext] || 'application/octet-stream' });
    res.end(data);
    finish(200);
  });
}

const server = http.createServer((req, res) => {
  const t0 = process.hrtime.bigint();
  const finish = (status) => {
    const latency = Number(process.hrtime.bigint() - t0) / 1e6;
    record(req, status, latency < 1 ? Math.round(latency * 10) / 10 : Math.round(latency));
  };

  if (req.url === '/healthz') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ ok: true, started: startedAtIso, uptimeMs: Date.now() - startedAtMs }));
    finish(200);
    return;
  }

  if (req.url === '/api/stats') {
    res.writeHead(200, { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' });
    res.end(JSON.stringify(snapshot()));
    return;
  }

  if (req.url === '/api/stream') {
    res.writeHead(200, {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache, no-transform',
      'Connection': 'keep-alive',
      'X-Accel-Buffering': 'no',
    });
    res.write(`event: snapshot\ndata: ${JSON.stringify(snapshot())}\n\n`);
    sseClients.add(res);
    req.on('close', () => sseClients.delete(res));
    return;
  }

  if (req.url === '/favicon.ico') {
    res.writeHead(204);
    res.end();
    finish(204);
    return;
  }

  const parsed = new URL(req.url, 'http://x');

  if (parsed.pathname === '/slow') {
    const ms = Math.min(10000, Math.max(0, parseInt(parsed.searchParams.get('ms'), 10) || 1000));
    setTimeout(() => {
      res.writeHead(200, { 'Content-Type': 'text/plain' });
      res.end(`slept ${ms}ms\n`);
      finish(200);
    }, ms);
    return;
  }

  if (parsed.pathname === '/error') {
    const raw = parseInt(parsed.searchParams.get('code'), 10);
    const code = raw >= 400 && raw <= 599 ? raw : 500;
    res.writeHead(code, { 'Content-Type': 'text/plain' });
    res.end(`HTTP ${code}\n`);
    finish(code);
    return;
  }

  if (parsed.pathname === '/redirect') {
    const to = parsed.searchParams.get('to') || '/';
    res.writeHead(302, { Location: to });
    res.end();
    finish(302);
    return;
  }

  if (parsed.pathname === '/random') {
    const codes = [200, 200, 200, 200, 201, 204, 301, 304, 400, 401, 403, 404, 418, 500, 502, 503];
    const code = codes[Math.floor(Math.random() * codes.length)];
    res.writeHead(code, { 'Content-Type': 'text/plain' });
    res.end(`random ${code}\n`);
    finish(code);
    return;
  }

  serveStatic(req, res, finish);
});

setInterval(() => {
  if (!sseClients.size) return;
  advanceBuckets(Date.now());
  const last10 = buckets.slice(-10);
  const rps = last10.reduce((a, b) => a + b, 0) / last10.length;
  sseBroadcast('tick', {
    rps: Math.round(rps * 10) / 10,
    uptimeMs: Date.now() - startedAtMs,
    spark: buckets.slice(),
    latencyStats: computeLatencyStats(),
    statusMix: computeStatusMix(),
    topPaths: topPaths(),
  });
}, 1000);

setInterval(() => {
  for (const res of sseClients) {
    try { res.write(': hb\n\n'); } catch (_) {}
  }
}, 15000);

server.listen(port, '0.0.0.0', () => {
  console.log(`${appName} listening on 0.0.0.0:${port}`);
});
