# Managed by rigbox-examples (junie). Junie ignores the generic OPENAI_* env, so
# the AI backend is a baked custom LLM profile at ~/.junie/models/rigbox.json
# (OpenAI-compatible, pointed at the workspace's managed AI proxy). Select it at
# every login and keep the npm-global bin on PATH for non-interactive shells.
case ":${PATH}:" in
  *":${HOME:-/home/developer}/.npm-global/bin:"*) ;;
  *) export PATH="${HOME:-/home/developer}/.npm-global/bin:${PATH}" ;;
esac
export JUNIE_MODEL="custom:rigbox"
