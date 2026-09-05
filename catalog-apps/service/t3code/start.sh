#!/usr/bin/env bash
# Boot wrapper for T3 Code. systemd does not run a login shell, so source the
# workspace env file explicitly and translate the provider envs the workspace
# injects into the shapes T3 reads (ANTHROPIC_*/OPENAI_*) before exec'ing the
# absolute binary.
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
