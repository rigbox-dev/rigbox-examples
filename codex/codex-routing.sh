# Managed by rigbox-examples (codex). Translates OPENROUTER_* -> OPENAI_*.
# Sourced by every interactive login shell so an SSH session sees `codex`
# already pointed at OpenRouter (or whatever OPENROUTER_BASE_URL points at).
if [ -n "${OPENROUTER_BASE_URL:-}" ]; then
  # OpenRouter speaks the OpenAI API at /v1; keep the path Codex needs.
  case "${OPENROUTER_BASE_URL}" in
    */v1|*/v1/) export OPENAI_BASE_URL="${OPENROUTER_BASE_URL%/}" ;;
    *)         export OPENAI_BASE_URL="${OPENROUTER_BASE_URL%/}/v1" ;;
  esac
elif [ -n "${OPENROUTER_API_KEY:-}" ]; then
  export OPENAI_BASE_URL="https://openrouter.ai/api/v1"
fi
if [ -n "${OPENROUTER_API_KEY:-}" ]; then
  export OPENAI_API_KEY="${OPENROUTER_API_KEY}"
fi
