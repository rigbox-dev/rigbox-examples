// Tiny webhook receiver that verifies the X-Signature header on
// incoming POSTs. Demonstrates the three "secret-shaped" surfaces of
// rig.yaml end-to-end:
//
//   • secrets:  WEBHOOK_HMAC_KEY    forwarded from the operator's local shell
//   • credentials: session_secret    server-generated as CRED_SESSION_SECRET
//   • params:   signing_algorithm    typed select param as SIGNING_ALGORITHM
const http = require('http');
const crypto = require('crypto');

const port = Number(process.env.PORT || 5500);
const hmacKey = process.env.WEBHOOK_HMAC_KEY || '';
const sessionSecret = process.env.CRED_SESSION_SECRET || '';
const signingAlgo = process.env.SIGNING_ALGORITHM || 'hmac-sha256';

function digestNameFor(param) {
  return param === 'hmac-sha512' ? 'sha512' : 'sha256';
}

function status() {
  return {
    service: 'webhook-receiver',
    signing_algorithm: signingAlgo,
    hmac_key_set: hmacKey.length > 0,
    hmac_key_chars: hmacKey.length,
    session_secret_prefix: sessionSecret.slice(0, 6),
    hint: 'POST /webhook with header `X-Signature: <hex hmac of the body>`',
  };
}

function timingSafeEq(a, b) {
  const ab = Buffer.from(a, 'utf8');
  const bb = Buffer.from(b, 'utf8');
  if (ab.length !== bb.length) return false;
  return crypto.timingSafeEqual(ab, bb);
}

const server = http.createServer((req, res) => {
  if (req.url === '/healthz') {
    res.writeHead(200, { 'content-type': 'text/plain' });
    res.end('ok\n');
    return;
  }

  if (req.url === '/' || req.url === '/status') {
    res.writeHead(200, { 'content-type': 'application/json' });
    res.end(JSON.stringify(status(), null, 2) + '\n');
    return;
  }

  if (req.url === '/webhook' && req.method === 'POST') {
    let body = '';
    req.on('data', (c) => { body += c; });
    req.on('end', () => {
      const sigHeader = (req.headers['x-signature'] || '').replace(/^sha\d+=/, '');
      if (!hmacKey) {
        res.writeHead(500, { 'content-type': 'application/json' });
        res.end(JSON.stringify({ error: 'WEBHOOK_HMAC_KEY not configured' }) + '\n');
        return;
      }
      const expected = crypto
        .createHmac(digestNameFor(signingAlgo), hmacKey)
        .update(body)
        .digest('hex');
      if (!sigHeader || !timingSafeEq(sigHeader, expected)) {
        res.writeHead(401, { 'content-type': 'application/json' });
        res.end(JSON.stringify({ error: 'signature mismatch' }) + '\n');
        return;
      }
      let parsed = null;
      try { parsed = JSON.parse(body || 'null'); } catch (_) { parsed = body; }
      res.writeHead(200, { 'content-type': 'application/json' });
      res.end(JSON.stringify({ verified: true, algorithm: signingAlgo, body: parsed }, null, 2) + '\n');
    });
    return;
  }

  res.writeHead(404, { 'content-type': 'text/plain' });
  res.end('not found\n');
});

server.listen(port, '0.0.0.0', () => {
  console.log(`webhook-receiver listening on :${port} (algo=${signingAlgo}, hmac_key_set=${hmacKey.length > 0})`);
});
