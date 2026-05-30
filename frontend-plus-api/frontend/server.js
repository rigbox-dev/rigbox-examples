// Static-file server with one templating trick: injects the API
// URL (read from process.env.RIGBOX_API_URL) into index.html as
// window.RIGBOX_API_URL so the page knows where to reach the backend
// without baking the address into the HTML at build time.
const http = require('http');
const fs = require('fs');
const path = require('path');

const port = Number(process.env.PORT || 5101);
// When RIGBOX_API_URL is set (e.g. the frontend-web app's `params.api_url`
// override), inject it into index.html as window.RIGBOX_API_URL.
// Otherwise leave the page to derive the URL from window.location —
// see public/index.html's deriveApiUrl() — so the default case
// "talk to my sibling frontend-api app on the same workspace" works
// without any per-deploy templating.
const apiUrl = process.env.RIGBOX_API_URL || '';
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

const server = http.createServer((req, res) => {
  const urlPath = (req.url || '/').split('?')[0];

  if (urlPath === '/healthz') {
    res.writeHead(200, { 'content-type': 'text/plain' });
    return res.end('ok\n');
  }

  if (urlPath === '/' || urlPath === '/index.html') {
    const html = fs.readFileSync(path.join(publicDir, 'index.html'), 'utf-8');
    // Only inject when there's a real override — otherwise the page's
    // deriveApiUrl() picks up the sibling backend automatically.
    const out = apiUrl
      ? html.replace('</head>', `<script>window.RIGBOX_API_URL = ${JSON.stringify(apiUrl)};</script>\n</head>`)
      : html;
    res.writeHead(200, { 'content-type': 'text/html' });
    return res.end(out);
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
  console.log(`frontend listening on :${port} (api_url=${apiUrl})`);
});
