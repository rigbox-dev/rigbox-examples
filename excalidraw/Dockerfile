FROM rigbox-base
# Excalidraw is a React app — the upstream repo is a monorepo, but the
# published `@excalidraw/excalidraw` npm package can be embedded into a
# tiny vite project and built to a static SPA. The catalog does this at
# install time on a live workspace; here we do it at image-build time so
# every deploy boots a frozen, prebuilt bundle.
ARG EXCALIDRAW_VERSION=0.17.6

WORKDIR /opt/excalidraw

# Minimal project scaffold (same shape as the catalog's install.sh).
RUN mkdir -p src \
 && printf '%s\n' \
      '{' \
      '  "name": "rigbox-excalidraw",' \
      '  "private": true,' \
      '  "type": "module",' \
      '  "scripts": { "build": "vite build" }' \
      '}' > package.json \
 && printf '%s\n' \
      'import { defineConfig } from "vite";' \
      'import react from "@vitejs/plugin-react";' \
      'export default defineConfig({' \
      '  plugins: [react()],' \
      '  define: { "process.env.IS_PREACT": JSON.stringify("false") },' \
      '  build: { outDir: "build" }' \
      '});' > vite.config.js \
 && printf '%s\n' \
      '<!DOCTYPE html>' \
      '<html lang="en">' \
      '<head>' \
      '  <meta charset="UTF-8" />' \
      '  <meta name="viewport" content="width=device-width, initial-scale=1.0" />' \
      '  <title>Excalidraw - Rigbox</title>' \
      '  <style>html,body,#root{margin:0;padding:0;width:100%;height:100%;overflow:hidden;}</style>' \
      '</head>' \
      '<body>' \
      '  <div id="root"></div>' \
      '  <script type="module" src="/src/main.jsx"></script>' \
      '</body>' \
      '</html>' > index.html \
 && printf '%s\n' \
      'import React from "react";' \
      'import { createRoot } from "react-dom/client";' \
      'import { Excalidraw } from "@excalidraw/excalidraw";' \
      'import "@excalidraw/excalidraw/index.css";' \
      'const root = createRoot(document.getElementById("root"));' \
      'root.render(<Excalidraw />);' > src/main.jsx

# Install deps + build the static SPA. `serve` stays in node_modules so the
# start command can find it at /opt/excalidraw/node_modules/.bin/serve.
RUN npm install --no-audit --no-fund \
      react react-dom \
      "@excalidraw/excalidraw@${EXCALIDRAW_VERSION}" \
      vite @vitejs/plugin-react \
      serve \
 && npx vite build \
 && npm cache clean --force
