// Static-file server that proxies /api to the sibling backend.
//
// Rigbox injects RIGBOX_FRONTEND_API_URL=http://127.0.0.1:<port> into this
// app's environment because rig.yaml declares `dependsOn: [frontend-api]` —
// co-located apps share the workspace VM's loopback interface, so the
// backend is reachable at 127.0.0.1 regardless of its (private) external
// visibility. We proxy /api server-side, so the browser only ever talks to
// this same origin: no CORS, and the API never needs to be made public.
//
// The localhost fallback makes `node server.js` work in local dev too,
// where the platform var isn't set.
const http = require('http');
const fs = require('fs');
const path = require('path');

const port = Number(process.env.PORT || 5101);
const apiTarget = process.env.RIGBOX_FRONTEND_API_URL || 'http://127.0.0.1:5100';
const publicDir = path.join(__dirname, 'public');

const mime = {
  '.html': 'text/html',
  '.js': 'application/javascript',
  '.css': 'text/css',
  '.json': 'application/json',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.ico': 'image/x-icon',
};

// Forward /api/* to the backend over loopback, streaming both ways.
function proxyToApi(req, res) {
  const target = new URL(req.url, apiTarget);
  const headers = { ...req.headers, host: target.host };
  const upstream = http.request(
    target,
    { method: req.method, headers },
    (up) => {
      res.writeHead(up.statusCode || 502, up.headers);
      up.pipe(res);
    },
  );
  upstream.on('error', () => {
    res.writeHead(502, { 'content-type': 'application/json' });
    res.end(JSON.stringify({ error: 'backend unreachable', target: apiTarget }));
  });
  req.pipe(upstream);
}

const server = http.createServer((req, res) => {
  const urlPath = (req.url || '/').split('?')[0];

  if (urlPath === '/healthz') {
    res.writeHead(200, { 'content-type': 'text/plain' });
    return res.end('ok\n');
  }

  if (urlPath === '/api' || urlPath.startsWith('/api/')) {
    return proxyToApi(req, res);
  }

  if (urlPath === '/' || urlPath === '/index.html') {
    const html = fs.readFileSync(path.join(publicDir, 'index.html'), 'utf-8');
    res.writeHead(200, { 'content-type': 'text/html' });
    return res.end(html);
  }

  const filePath = path.join(publicDir, urlPath);
  if (!filePath.startsWith(publicDir + path.sep) || !fs.existsSync(filePath)) {
    res.writeHead(404, { 'content-type': 'text/plain' });
    return res.end('not found\n');
  }

  const type = mime[path.extname(filePath).toLowerCase()] || 'application/octet-stream';
  res.writeHead(200, { 'content-type': type });
  fs.createReadStream(filePath).pipe(res);
});

server.listen(port, '0.0.0.0', () => {
  console.log(`frontend listening on :${port} (proxying /api -> ${apiTarget})`);
});
