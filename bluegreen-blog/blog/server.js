// Bluegreen-blog HTTP surface. Posts live as files outside the rsync
// zone (/home/developer/data/posts/<slug>.md) so they survive every
// redeploy. The migrator sidecar already created the data dir and the
// index file by the time this process starts (dependsOn).
//
// GET  /            → index of posts (renders via BUILD_FLAVOR template)
// GET  /post/:slug  → single post
// POST /admin/post  → create a post (title + body, no auth — demo only)
// GET  /healthz     → liveness probe
const http = require('http');
const fs = require('fs');
const path = require('path');
const { renderIndex, renderPost } = require('./views');

const port = Number(process.env.PORT || 5100);
const dataDir = process.env.DATA_DIR || '/home/developer/data';
const postsDir = path.join(dataDir, 'posts');
const indexFile = path.join(dataDir, 'posts.idx.json');
const siteTitle = process.env.SITE_TITLE || 'My Blog';
const flavor = process.env.BUILD_FLAVOR || 'classic';

function loadIndex() {
  try {
    return JSON.parse(fs.readFileSync(indexFile, 'utf-8'));
  } catch (_) {
    return { slugs: [] };
  }
}
function saveIndex(idx) {
  fs.writeFileSync(indexFile, JSON.stringify(idx, null, 2) + '\n');
}
function slugify(title) {
  return title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 60);
}
function readBody(req) {
  return new Promise((resolve) => {
    let buf = '';
    req.on('data', (c) => { buf += c; });
    req.on('end', () => { try { resolve(JSON.parse(buf || 'null')); } catch (_) { resolve(null); } });
  });
}

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, `http://${req.headers.host}`);

  if (url.pathname === '/healthz') {
    res.writeHead(200, { 'content-type': 'text/plain' });
    return res.end('ok\n');
  }

  if (url.pathname === '/') {
    const idx = loadIndex();
    const posts = idx.slugs.map((slug) => {
      const file = path.join(postsDir, `${slug}.md`);
      const raw = fs.existsSync(file) ? fs.readFileSync(file, 'utf-8') : '';
      const [titleLine, ...rest] = raw.split('\n');
      const title = titleLine.replace(/^#\s*/, '') || slug;
      return { slug, title, excerpt: rest.join('\n').trim().slice(0, 140) };
    });
    res.writeHead(200, { 'content-type': 'text/html' });
    return res.end(renderIndex({ siteTitle, flavor, posts }));
  }

  const postMatch = url.pathname.match(/^\/post\/([a-z0-9-]+)$/);
  if (postMatch) {
    const file = path.join(postsDir, `${postMatch[1]}.md`);
    if (!fs.existsSync(file)) {
      res.writeHead(404, { 'content-type': 'text/plain' });
      return res.end('not found\n');
    }
    const raw = fs.readFileSync(file, 'utf-8');
    const [titleLine, ...rest] = raw.split('\n');
    const title = titleLine.replace(/^#\s*/, '');
    const body = rest.join('\n').trim();
    res.writeHead(200, { 'content-type': 'text/html' });
    return res.end(renderPost({ siteTitle, flavor, title, body }));
  }

  if (url.pathname === '/admin/post' && req.method === 'POST') {
    const body = await readBody(req);
    if (!body || typeof body.title !== 'string' || typeof body.body !== 'string') {
      res.writeHead(400, { 'content-type': 'application/json' });
      return res.end(JSON.stringify({ error: 'title and body required' }) + '\n');
    }
    const slug = slugify(body.title);
    fs.writeFileSync(path.join(postsDir, `${slug}.md`), `# ${body.title}\n\n${body.body}\n`);
    const idx = loadIndex();
    if (!idx.slugs.includes(slug)) {
      idx.slugs.unshift(slug);
      saveIndex(idx);
    }
    res.writeHead(201, { 'content-type': 'application/json' });
    return res.end(JSON.stringify({ slug }) + '\n');
  }

  res.writeHead(404, { 'content-type': 'text/plain' });
  res.end('not found\n');
});

server.listen(port, '0.0.0.0', () => {
  console.log(`[blog] listening on :${port} (flavor=${flavor}, siteTitle="${siteTitle}")`);
});
