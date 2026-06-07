# Managed by rigbox-examples (codex). Codex 0.137+ reads its provider from
# ~/.codex/config.toml (a custom provider pointed at the managed AI proxy over
# the Responses wire — see config.toml) and the API key from $OPENAI_API_KEY.
# Make sure that key is present by sourcing the managed proxy's env file, which
# every managed workspace ships. Sourced by every interactive login shell.
if [ -z "${OPENAI_API_KEY:-}" ] && [ -r "${HOME:-/home/developer}/.rigbox/proxy.env" ]; then
  . "${HOME:-/home/developer}/.rigbox/proxy.env"
fi
