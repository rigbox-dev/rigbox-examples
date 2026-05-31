// Static-file server that proxies /api to the sibling backend, with a
// runtime toggle between two routes:
//
//   private  (default) — proxy to the sibling over the VM's loopback
//     interface (RIGBOX_FRONTEND_API_URL, injected from `dependsOn`). Fast,
//     never leaves the VM, never metered, and frontend-api stays private.
//
//   internet — proxy to the sibling's PUBLIC subdomain over the internet,
//     through the gateway. Because frontend-api is private, we authenticate
//     the call with `X-Rigbox-Key: <RIGBOX_API_KEY>` — an opt-in secret the
//     workspace owner sets at deploy. The key stays server-side here; it is
//     never sent to the browser.
//
// The browser always talks to THIS origin (`/api`); server.js decides which
// upstream to use from the `x-demo-route` header the page sets per request.
const http = require('http');
const https = require('https');
const fs = require('fs');
const path = require('path');

const port = Number(process.env.PORT || 5101);
const loopbackTarget = process.env.RIGBOX_FRONTEND_API_URL || 'http://127.0.0.1:5100';
// Optional secret (rig.yaml `secrets: [{ name: RIGBOX_API_KEY, optional: true }]`).
// Empty/unset → the internet toggle is disabled and the UI explains how to set it.
const apiKey = process.env.RIGBOX_API_KEY || '';
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

// Derive the sibling's public origin from our own deployed hostname:
// frontend-web-<ws>.rigbox.dev -> https://frontend-api-<ws>.rigbox.dev
// Returns null when not running under that hostname (e.g. local dev).
function publicApiOrigin(host) {
  if (host && host.startsWith('frontend-web-')) {
    return 'https://' + host.replace(/^frontend-web-/, 'frontend-api-');
  }
  return null;
}

function sendJson(res, status, body) {
  res.writeHead(status, { 'content-type': 'application/json' });
  res.end(JSON.stringify(body));
}

// Stream a proxied request to `target` (a URL), optionally adding headers,
// over http or https depending on the protocol.
function forward(req, res, target, extraHeaders) {
  const client = target.protocol === 'https:' ? https : http;
  const headers = { ...req.headers, host: target.host, ...extraHeaders };
  const upstream = client.request(target, { method: req.method, headers }, (up) => {
    res.writeHead(up.statusCode || 502, up.headers);
    up.pipe(res);
  });
  upstream.on('error', () =>
    sendJson(res, 502, { error: 'backend_unreachable', target: target.origin }));
  req.pipe(upstream);
}

function proxyApi(req, res) {
  const mode = req.headers['x-demo-route'] === 'internet' ? 'internet' : 'private';

  if (mode === 'internet') {
    const origin = publicApiOrigin(req.headers.host);
    if (!origin) {
      return sendJson(res, 400, {
        error: 'internet_unavailable',
        message: 'Internet routing only works on the deployed frontend-web-<ws>.rigbox.dev host.',
      });
    }
    if (!apiKey) {
      return sendJson(res, 400, {
        error: 'missing_api_key',
        message: 'No API key set, so the internet route can\'t authenticate to the private API.',
        howto: 'export RIGBOX_API_KEY=rb_...   then   rig deploy   (or make the API public: rig app share --app frontend-api --public)',
      });
    }
    return forward(req, res, new URL(req.url, origin), { 'x-rigbox-key': apiKey });
  }

  // private (default): loopback, no key, never leaves the VM.
  return forward(req, res, new URL(req.url, loopbackTarget));
}

const server = http.createServer((req, res) => {
  const urlPath = (req.url || '/').split('?')[0];

  if (urlPath === '/healthz') {
    res.writeHead(200, { 'content-type': 'text/plain' });
    return res.end('ok\n');
  }

  // Lets the page know, on load, whether the internet toggle is usable.
  if (urlPath === '/__route_status') {
    return sendJson(res, 200, {
      apiKeyConfigured: apiKey.length > 0,
      deployed: publicApiOrigin(req.headers.host) !== null,
    });
  }

  if (urlPath === '/api' || urlPath.startsWith('/api/')) {
    return proxyApi(req, res);
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
  const key = apiKey ? 'set' : 'unset';
  console.log(`frontend on :${port} — loopback ${loopbackTarget}, internet key ${key}`);
});
