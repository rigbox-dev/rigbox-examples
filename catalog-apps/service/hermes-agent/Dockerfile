FROM rigbox-base
# Hermes Agent (NousResearch/hermes-agent) — self-improving AI agent with a web
# dashboard and a separate multi-platform messaging gateway (Telegram, Discord,
# Slack, WhatsApp, Signal). The upstream installer pulls uv, Python 3.11,
# Node 22, Playwright + Chromium, and a fairly large npm tree to pre-build the
# Vite SPA bundle; freeze it all into the image once so deploys don't re-run it.
#
# `--skip-setup` keeps the installer non-interactive. Curl|bash is non-tty so
# the upstream script also auto-detects non-interactive mode.
ARG HERMES_HOME=/home/developer/.hermes

RUN set -eu; \
    su - developer -s /bin/bash -c '\
      set -euo pipefail; \
      export HERMES_HOME='"$HERMES_HOME"'; \
      mkdir -p "$HERMES_HOME"; \
      curl -fsSL https://raw.githubusercontent.com/NousResearch/hermes-agent/main/scripts/install.sh \
        | bash -s -- --skip-setup; \
      # Pre-build the dashboard SPA — `hermes dashboard` would otherwise run
      # `npm ci && npm run build` lazily on the first request, blowing the
      # readiness probe.
      WEB_DIR="$HERMES_HOME/hermes-agent/web"; \
      DIST_DIR="$HERMES_HOME/hermes-agent/hermes_cli/web_dist"; \
      if [ -d "$WEB_DIR" ] && [ ! -f "$DIST_DIR/index.html" ]; then \
        cd "$WEB_DIR"; \
        npm ci --silent || npm install --silent; \
        npm run build --silent; \
        rm -rf "$WEB_DIR/node_modules" "$HOME/.npm/_cacache"; \
      fi; \
      test -f "$DIST_DIR/index.html"; \
      # Trim install-only caches that the upstream installer leaves behind.
      rm -rf "$HOME/.cache/ms-playwright" "$HOME/.cache/camoufox" \
             "$HOME/.cache/huggingface" "$HOME/.cache/pip" "$HOME/.cache/uv" \
             "$HOME/.npm/_cacache" /tmp/camoufox-* /tmp/playwright-* 2>/dev/null || true; \
      # Ensure ~/.local/bin/hermes is the canonical launcher (the upstream
      # installer occasionally truncates it after dirty-exiting on slow disks).
      VENV_HERMES="$HERMES_HOME/hermes-agent/venv/bin/hermes"; \
      if [ ! -s "$HOME/.local/bin/hermes" ] && [ -x "$VENV_HERMES" ]; then \
        mkdir -p "$HOME/.local/bin"; \
        printf "%s\n" "#!/usr/bin/env bash" "unset PYTHONPATH" "unset PYTHONHOME" \
          "exec $VENV_HERMES \"\$@\"" > "$HOME/.local/bin/hermes"; \
        chmod +x "$HOME/.local/bin/hermes"; \
      fi; \
      touch "$HERMES_HOME/.env"; \
      chmod 600 "$HERMES_HOME/.env"; \
    '
