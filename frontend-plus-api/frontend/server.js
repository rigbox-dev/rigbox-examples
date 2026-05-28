// Static-file server with one templating trick: injects the API
// URL (read from process.env.RIGBOX_API_URL) into index.html as
// window.RIGBOX_API_URL so the page knows where to reach the backend
// without baking the address into the HTML at build time.
const http = require('http');
const fs = require('fs');
const path = require('path');

const port = Number(process.env.PORT || 5101);
const apiUrl = process.env.RIGBOX_API_URL || '/api';
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
    const inject = `<script>window.RIGBOX_API_URL = ${JSON.stringify(apiUrl)};</script>`;
    res.writeHead(200, { 'content-type': 'text/html' });
    return res.end(html.replace('</head>', `${inject}\n</head>`));
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
