// Express-ish backend (using raw http to avoid an npm install) — the
// `api` half of the frontend-plus-api composition. Surfaces a tiny
// in-memory todo list at /api/todos so the frontend has something to
// render and mutate.
const http = require('http');

const port = Number(process.env.PORT || 5100);
const enableMetrics = (process.env.ENABLE_METRICS || 'false') === 'true';

let nextId = 1;
const todos = new Map();

// Sibling frontend lives on a different subdomain (fpa-web-<ws> vs
// fpa-api-<ws>) so every request from the browser is cross-origin
// and POST/DELETE trigger a preflight. We answer * because the API
// has no auth or cookies — if you fork this and add either, lock
// the origin down.
const CORS_HEADERS = {
  'access-control-allow-origin': '*',
  'access-control-allow-methods': 'GET, POST, DELETE, OPTIONS',
  'access-control-allow-headers': 'content-type',
  'access-control-max-age': '86400',
};

function json(res, status, body) {
  res.writeHead(status, { 'content-type': 'application/json', ...CORS_HEADERS });
  res.end(JSON.stringify(body) + '\n');
}

function readBody(req) {
  return new Promise((resolve) => {
    let buf = '';
    req.on('data', (c) => { buf += c; });
    req.on('end', () => {
      try { resolve(JSON.parse(buf || 'null')); } catch (_) { resolve(null); }
    });
  });
}

const server = http.createServer(async (req, res) => {
  // Preflight: 204 No Content per the CORS spec — strictly no body,
  // strictly no content-type. Stricter browsers reject preflight
  // responses that violate this.
  if (req.method === 'OPTIONS') {
    res.writeHead(204, CORS_HEADERS);
    return res.end();
  }
  const url = new URL(req.url, `http://${req.headers.host}`);

  if (url.pathname === '/healthz') {
    res.writeHead(200, { 'content-type': 'text/plain', ...CORS_HEADERS });
    return res.end('ok\n');
  }

  if (enableMetrics && url.pathname === '/metrics') {
    res.writeHead(200, { 'content-type': 'text/plain', ...CORS_HEADERS });
    return res.end(`# HELP todos_total Current number of todos\n# TYPE todos_total gauge\ntodos_total ${todos.size}\n`);
  }

  if (url.pathname === '/api/todos') {
    if (req.method === 'GET') {
      return json(res, 200, { todos: Array.from(todos.values()) });
    }
    if (req.method === 'POST') {
      const body = await readBody(req);
      if (!body || typeof body.title !== 'string' || !body.title.trim()) {
        return json(res, 400, { error: 'title required' });
      }
      const todo = { id: nextId++, title: body.title.trim(), done: false };
      todos.set(todo.id, todo);
      return json(res, 201, todo);
    }
  }

  const m = url.pathname.match(/^\/api\/todos\/(\d+)$/);
  if (m) {
    const id = Number(m[1]);
    if (req.method === 'DELETE') {
      todos.delete(id);
      return json(res, 204, {});
    }
  }

  json(res, 404, { error: 'not found' });
});

server.listen(port, '0.0.0.0', () => {
  console.log(`api listening on :${port} (metrics=${enableMetrics})`);
});
