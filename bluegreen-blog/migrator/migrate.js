// One-shot schema sidecar for bluegreen-blog. Runs once when the
// workspace deploys (rig deploy), ensures the data directory + post
// index exist, then sits on /healthz so the platform's readiness check
// passes and the dependsOn'd blog app is allowed to start.
//
// The "schema" is intentionally trivial — a directory and a JSON
// index — so the example stays free of native npm deps. Reading this
// file should make the dependsOn lesson obvious without a sqlite or
// postgres distraction.
const http = require('http');
const fs = require('fs');
const path = require('path');

const port = Number(process.env.PORT || 5099);
const dataDir = process.env.DATA_DIR || '/home/developer/data';
const postsDir = path.join(dataDir, 'posts');
const indexFile = path.join(dataDir, 'posts.idx.json');

function migrate() {
  fs.mkdirSync(postsDir, { recursive: true });
  if (!fs.existsSync(indexFile)) {
    fs.writeFileSync(indexFile, JSON.stringify({ slugs: [] }, null, 2) + '\n');
    console.log(`[migrator] created ${indexFile}`);
  } else {
    console.log(`[migrator] ${indexFile} already exists, nothing to do`);
  }
}

migrate();

http
  .createServer((req, res) => {
    if (req.url === '/healthz') {
      res.writeHead(200, { 'content-type': 'text/plain' });
      return res.end('migrated\n');
    }
    res.writeHead(404, { 'content-type': 'text/plain' });
    res.end('migrator only serves /healthz\n');
  })
  .listen(port, '0.0.0.0', () => {
    console.log(`[migrator] migration complete, healthz on :${port}`);
  });
