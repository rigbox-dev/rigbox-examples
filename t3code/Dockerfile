FROM rigbox-base
# T3 Code — browser-based AI workspace that hosts Claude Code, Codex, and other
# coding agents behind a single web UI (https://github.com/OpenRouterTeam/spawn).
# Installed via `npm install -g t3` into a user-writable npm prefix so root is
# never required. The heavy install is frozen into the image so deploys don't
# re-run it.
#
# t3@0.0.23 ships a Node shebang but gates execution behind `import.meta.main`,
# which is a Bun-only thing — unset under Node. Patch that single line so the
# CLI actually starts the web server when systemd execs it.

RUN set -eu; \
    su - developer -s /bin/bash -c '\
      set -euo pipefail; \
      export NPM_CONFIG_PREFIX="$HOME/.npm-global"; \
      mkdir -p "$NPM_CONFIG_PREFIX/bin"; \
      export PATH="$NPM_CONFIG_PREFIX/bin:$PATH"; \
      npm install -g --no-fund --silent t3; \
      T3_DIST="$NPM_CONFIG_PREFIX/lib/node_modules/t3/dist/bin.mjs"; \
      python3 - "$T3_DIST" <<PY
from pathlib import Path
import sys
path = Path(sys.argv[1])
body = path.read_text()
old = "if (import.meta.main) Command.run(cli, { version })"
new = "if (true) Command.run(cli, { version })"
if old in body:
    path.write_text(body.replace(old, new, 1))
PY
      t3 --version >/dev/null; \
    '

# Systemd does not run a login shell, so source the workspace env file
# explicitly and translate provider envs into the shapes T3 reads
# (ANTHROPIC_*/OPENAI_*) before exec'ing the absolute binary.
RUN set -eu; \
    mkdir -p /home/developer/.local/bin; \
    cat > /home/developer/.local/bin/rigbox-t3code-start <<'EOF'
#!/usr/bin/env bash
set -euo pipefail

export HOME="${HOME:-/home/developer}"
export NPM_CONFIG_PREFIX="${NPM_CONFIG_PREFIX:-/home/developer/.npm-global}"
export PATH="${NPM_CONFIG_PREFIX}/bin:/home/developer/.local/bin:/usr/local/bin:/usr/bin:/bin"

set -a
[ -f /home/developer/.rigbox/.env ] && . /home/developer/.rigbox/.env
set +a

# Managed Rigbox proxy injection → OpenAI/OpenRouter env shapes.
proxy_base="${AI_PROXY_URL:-${RIGBOX_AI_PROXY_URL:-}}"
if [ -n "${proxy_base}" ]; then
  proxy_base="${proxy_base%/}"
  [ -z "${OPENAI_BASE_URL:-}" ]      && export OPENAI_BASE_URL="${proxy_base}/v1"
  [ -z "${OPENAI_API_KEY:-}" ]       && export OPENAI_API_KEY="managed-by-rigbox"
  [ -z "${OPENROUTER_BASE_URL:-}" ]  && export OPENROUTER_BASE_URL="${proxy_base}/v1"
  [ -z "${OPENROUTER_API_KEY:-}" ]   && export OPENROUTER_API_KEY="${OPENAI_API_KEY}"
fi

# OpenRouter key → ANTHROPIC_*/OPENAI_* shapes T3 also reads.
if [ -n "${OPENROUTER_API_KEY:-}" ]; then
  [ -z "${OPENAI_API_KEY:-}" ]  && export OPENAI_API_KEY="${OPENROUTER_API_KEY}"
  [ -z "${OPENAI_BASE_URL:-}" ] && export OPENAI_BASE_URL="${OPENROUTER_BASE_URL:-https://openrouter.ai/api/v1}"
  openrouter_base="${OPENROUTER_BASE_URL:-https://openrouter.ai/api/v1}"
  if [[ "${openrouter_base}" == https://openrouter.ai/* ]]; then
    [ -z "${ANTHROPIC_API_KEY:-}" ]  && export ANTHROPIC_API_KEY="${OPENROUTER_API_KEY}"
    [ -z "${ANTHROPIC_BASE_URL:-}" ] && export ANTHROPIC_BASE_URL="https://openrouter.ai/api"
  fi
fi

exec /home/developer/.npm-global/bin/t3 --port 3773 --host 0.0.0.0 --mode web --no-browser
EOF
    chmod 755 /home/developer/.local/bin/rigbox-t3code-start && \
    chown developer:developer /home/developer/.local/bin/rigbox-t3code-start
