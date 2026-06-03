# Managed by rigbox-examples (junie). Junie reads JUNIE_OPENROUTER_API_KEY
# first, then falls back to OPENROUTER_API_KEY. Translate the latter for users
# who set only the generic OpenRouter key at deploy time.
case ":${PATH}:" in
  *":${HOME:-/home/developer}/.npm-global/bin:"*) ;;
  *) export PATH="${HOME:-/home/developer}/.npm-global/bin:${PATH}" ;;
esac
if [ -n "${OPENROUTER_API_KEY:-}" ] && [ -z "${JUNIE_OPENROUTER_API_KEY:-}" ]; then
  export JUNIE_OPENROUTER_API_KEY="$OPENROUTER_API_KEY"
fi
