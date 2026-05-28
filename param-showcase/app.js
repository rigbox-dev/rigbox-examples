// Reads every param value from process.env and surfaces them at /params.
// The names match the keys declared in rig.yaml — the CLI projects each
// param key into an env var with the same name (unless envVar: is set).
const http = require('http');

const port = Number(process.env.PORT || 5500);

function paramSnapshot() {
  return {
    greeting:         process.env.GREETING        || null,
    max_items:        process.env.MAX_ITEMS       || null,
    enable_metrics:   process.env.ENABLE_METRICS  || null,
    api_secret:       process.env.API_SECRET
      ? '*'.repeat(Math.min(8, process.env.API_SECRET.length))
      : null,
    log_level:        process.env.LOG_LEVEL       || null,
    contact_email:    process.env.CONTACT_EMAIL   || null,
    dashboard_url:    process.env.DASHBOARD_URL   || null,
    welcome_message:  process.env.WELCOME_MESSAGE || null,
  };
}

const server = http.createServer((req, res) => {
  const url = new URL(req.url, `http://${req.headers.host}`);

  if (url.pathname === '/healthz') {
    res.writeHead(200, { 'content-type': 'text/plain' });
    res.end('ok\n');
    return;
  }

  if (url.pathname === '/params' || url.pathname === '/') {
    res.writeHead(200, { 'content-type': 'application/json' });
    res.end(JSON.stringify(paramSnapshot(), null, 2) + '\n');
    return;
  }

  res.writeHead(404, { 'content-type': 'text/plain' });
  res.end('not found\n');
});

server.listen(port, '0.0.0.0', () => {
  console.log(`param-showcase listening on :${port}`);
});
