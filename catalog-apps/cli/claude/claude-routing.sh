# Managed by rigbox-examples (claude). Wires Claude Code to an AI backend at
# every interactive login shell, so SSHing in is enough to activate routing.
# Claude Code reads ANTHROPIC_BASE_URL + ANTHROPIC_AUTH_TOKEN.
case ":${PATH}:" in
  *":${HOME:-/home/developer}/.local/bin:"*) ;;
  *) export PATH="${HOME:-/home/developer}/.local/bin:${PATH}" ;;
esac
if [ -n "${OPENROUTER_API_KEY:-}" ]; then
  # Bring-your-own-key: route straight at OpenRouter (Anthropic /v1/messages
  # shape). ANTHROPIC_BASE_URL must omit the trailing /v1 — Claude Code appends
  # /v1/messages itself.
  _rb_base="${OPENROUTER_BASE_URL:-https://openrouter.ai/api}"
  _rb_base="${_rb_base%/v1}"
  export ANTHROPIC_BASE_URL="${_rb_base%/}"
  export ANTHROPIC_AUTH_TOKEN="${OPENROUTER_API_KEY}"
  unset _rb_base
elif [ -r "${HOME:-/home/developer}/.rigbox/proxy.env" ]; then
  # Managed AI: every managed workspace gets ~/.rigbox/proxy.env exporting
  # OPENAI_BASE_URL=<proxy>/v1 and OPENAI_API_KEY=<placeholder>. Strip the /v1
  # to get the proxy root Claude Code's Anthropic client expects.
  . "${HOME:-/home/developer}/.rigbox/proxy.env"
  export ANTHROPIC_BASE_URL="${OPENAI_BASE_URL%/v1}"
  export ANTHROPIC_AUTH_TOKEN="${OPENAI_API_KEY}"
fi
if [ -n "${ANTHROPIC_AUTH_TOKEN:-}" ]; then
  # When both AUTH_TOKEN and API_KEY are set Claude Code prefers API_KEY, which
  # would silently bypass our routing — clear it explicitly.
  export ANTHROPIC_API_KEY=""
fi
export CLAUDE_CODE_SKIP_ONBOARDING=1
export CLAUDE_CODE_ENABLE_TELEMETRY=0
