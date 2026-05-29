// Template module — the WHOLE point of this file is to demonstrate the
// bluegreen redesign workflow. `flavor: classic` is the prod look;
// `flavor: aurora` is the v2 redesign you stage as a bluegreen sibling
// before promoting it to prod.
//
// Swap the BUILD_FLAVOR env var between deploys (or pass `--bluegreen
// v2` after editing rig.yaml) and the same posts render under two
// totally different visual identities — the cleanest possible demo of
// "the data was untouched, only the presentation changed."

const css = {
  classic: `
    body { font-family: Georgia, serif; max-width: 640px; margin: 4rem auto; padding: 0 1rem; line-height: 1.7; color: #222; }
    h1 { font-weight: 400; letter-spacing: -0.5px; border-bottom: 2px solid #222; padding-bottom: 0.5rem; }
    h2 { font-weight: 400; }
    a { color: #1a5fb4; text-decoration: none; }
    a:hover { text-decoration: underline; }
    .post { padding: 1rem 0; border-bottom: 1px solid #ddd; }
    .meta { color: #888; font-size: 0.9rem; }
    .badge { font-family: ui-sans-serif, sans-serif; font-size: 0.7rem; background: #eee; color: #555; padding: 0.15rem 0.5rem; border-radius: 3px; }
  `,
  aurora: `
    :root { color-scheme: light dark; }
    body { font-family: ui-sans-serif, system-ui, -apple-system, sans-serif; max-width: 720px; margin: 3rem auto; padding: 0 1.25rem; line-height: 1.6; background: linear-gradient(135deg, #f0f4ff 0%, #fff5f7 100%); min-height: 100vh; }
    @media (prefers-color-scheme: dark) {
      body { background: linear-gradient(135deg, #1a1d2e 0%, #2a1d2e 100%); color: #e0e0e8; }
    }
    h1 { font-weight: 800; font-size: 2.5rem; background: linear-gradient(90deg, #6366f1, #ec4899); -webkit-background-clip: text; -webkit-text-fill-color: transparent; background-clip: text; }
    h2 { font-weight: 700; }
    a { color: #6366f1; text-decoration: none; }
    a:hover { text-decoration: underline; }
    .post { padding: 1.25rem; margin: 0.75rem 0; border-radius: 12px; background: rgba(255, 255, 255, 0.5); backdrop-filter: blur(8px); }
    @media (prefers-color-scheme: dark) { .post { background: rgba(0, 0, 0, 0.2); } }
    .meta { color: rgba(127, 127, 127, 0.8); font-size: 0.85rem; }
    .badge { font-size: 0.7rem; background: linear-gradient(90deg, #6366f1, #ec4899); color: white; padding: 0.2rem 0.6rem; border-radius: 999px; font-weight: 600; }
  `,
};

function layout({ siteTitle, flavor, content }) {
  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width,initial-scale=1" />
  <title>${siteTitle}</title>
  <style>${css[flavor] || css.classic}</style>
</head>
<body>
  <header>
    <h1>${siteTitle} <span class="badge">${flavor}</span></h1>
    <p class="meta"><a href="/">home</a></p>
  </header>
  ${content}
</body>
</html>`;
}

function renderIndex({ siteTitle, flavor, posts }) {
  const content = posts.length === 0
    ? `<p class="meta">No posts yet. POST to <code>/admin/post</code> with <code>{title, body}</code> to add one.</p>`
    : posts.map((p) => `
      <article class="post">
        <h2><a href="/post/${p.slug}">${p.title}</a></h2>
        <p>${p.excerpt}…</p>
      </article>`).join('\n');
  return layout({ siteTitle, flavor, content });
}

function renderPost({ siteTitle, flavor, title, body }) {
  const content = `<article class="post"><h2>${title}</h2><div>${body.replace(/\n\n/g, '</p><p>').replace(/^/, '<p>').concat('</p>')}</div></article>`;
  return layout({ siteTitle, flavor, content });
}

module.exports = { renderIndex, renderPost };
