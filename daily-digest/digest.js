// daily-digest — a background worker that writes a line to
// /home/developer/data/digest.log every TICK_SECONDS. Workers on
// Rigbox still need a port + health endpoint (the platform health-
// checks every app), so the same process serves a tiny HTTP surface
// that returns the last 50 log lines on GET / and 200 on /healthz.
//
// The interesting shape: the WORK is the loop, not the HTTP server.
// The HTTP server exists to make the platform happy and give you a
// browser-visible window into what the worker has been doing.

const http = require('http');
const fs = require('fs');
const path = require('path');

const port = Number(process.env.PORT || 5101);
const dataDir = process.env.DATA_DIR || '/home/developer/data';
const tickSeconds = Math.max(1, Number(process.env.TICK_SECONDS || 60));
const label = process.env.LOG_LABEL || 'digest';

fs.mkdirSync(dataDir, { recursive: true });
const logFile = path.join(dataDir, 'digest.log');

let tickCount = 0;
function tick() {
  tickCount += 1;
  const line = `[${new Date().toISOString()}] ${label} tick=${tickCount}\n`;
  fs.appendFileSync(logFile, line);
  console.log(line.trim());
}
tick(); // one immediate tick at boot so the demo isn't silent
setInterval(tick, tickSeconds * 1000);

function readRecentLines(n) {
  if (!fs.existsSync(logFile)) return '';
  const raw = fs.readFileSync(logFile, 'utf-8');
  const lines = raw.split('\n').filter(Boolean);
  return lines.slice(-n).join('\n');
}

http
  .createServer((req, res) => {
    if (req.url === '/healthz') {
      res.writeHead(200, { 'content-type': 'text/plain' });
      return res.end('ok\n');
    }
    if (req.url === '/' || req.url.startsWith('/?')) {
      const recent = readRecentLines(50);
      res.writeHead(200, { 'content-type': 'text/plain' });
      return res.end(
        `daily-digest worker — label="${label}" interval=${tickSeconds}s ticks=${tickCount}\n` +
          `log file: ${logFile}\n` +
          `\n--- last 50 lines ---\n${recent}\n`
      );
    }
    res.writeHead(404, { 'content-type': 'text/plain' });
    res.end('not found\n');
  })
  .listen(port, '0.0.0.0', () => {
    console.log(`[digest] worker started, tick every ${tickSeconds}s, /healthz on :${port}`);
  });
