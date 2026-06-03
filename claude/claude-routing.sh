# Managed by rigbox-examples (claude). Translates OPENROUTER_* -> ANTHROPIC_*.
# Sourced by every interactive login shell so an SSH session sees `claude`
# already pointed at the workspace's managed AI proxy.
case ":${PATH}:" in
  *":${HOME:-/home/developer}/.local/bin:"*) ;;
  *) export PATH="${HOME:-/home/developer}/.local/bin:${PATH}" ;;
esac
if [ -n "${OPENROUTER_BASE_URL:-}" ]; then
  _rb_base="${OPENROUTER_BASE_URL%/v1}"
  _rb_base="${_rb_base%/}"
  export ANTHROPIC_BASE_URL="${_rb_base}"
  unset _rb_base
elif [ -n "${OPENROUTER_API_KEY:-}" ]; then
  export ANTHROPIC_BASE_URL="https://openrouter.ai/api"
fi
if [ -n "${OPENROUTER_API_KEY:-}" ]; then
  export ANTHROPIC_AUTH_TOKEN="${OPENROUTER_API_KEY}"
  # When both AUTH_TOKEN and API_KEY are set Claude Code prefers API_KEY,
  # which would silently bypass our routing — clear it explicitly.
  export ANTHROPIC_API_KEY=""
fi
export CLAUDE_CODE_SKIP_ONBOARDING=1
export CLAUDE_CODE_ENABLE_TELEMETRY=0
