FROM rigbox-base
# OpenClaw Gateway — the websocket gateway that powers the Clawd browser UI.
# Pinned to a known-good upstream release; bump and rebuild to upgrade.
ARG OPENCLAW_VERSION=2026.4.29

# Install openclaw globally into a user-writable npm prefix so root is never
# required at runtime. Frozen into the image so deploys don't re-install.
RUN set -eu; \
    su - developer -s /bin/bash -c "\
      set -euo pipefail; \
      mkdir -p \$HOME/.npm-global/bin \$HOME/.cache/nodejs \$HOME/.openclaw/bin \$HOME/.openclaw/agents/main/agent; \
      touch \$HOME/.openclaw/.env; \
      npm config set prefix \$HOME/.npm-global; \
      export PATH=\$HOME/.npm-global/bin:\$PATH; \
      export NODE_ENV=production; \
      npm install -g --no-fund --no-audit --omit=dev openclaw@${OPENCLAW_VERSION}; \
      openclaw --version; \
    "

# Wrapper that the rigbox subdomain layer routes to. It synthesizes
# ~/.openclaw/openclaw.json + ~/.openclaw/agents/main/agent/auth-profiles.json
# from environment, then exec's the openclaw binary on :18789.
COPY gateway.js /home/developer/.openclaw/bin/gateway.js
COPY rigbox-openclaw-gateway /home/developer/.openclaw/bin/rigbox-openclaw-gateway
RUN chmod +x /home/developer/.openclaw/bin/rigbox-openclaw-gateway \
 && chown -R developer:developer /home/developer/.openclaw /home/developer/.npm-global /home/developer/.cache/nodejs
