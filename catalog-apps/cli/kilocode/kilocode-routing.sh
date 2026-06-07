# Managed by rigbox-examples (kilocode). Kilo CLI 1.0 is an OpenCode fork: the
# provider, base URL, key, and model all live in the baked
# ~/.config/kilo/opencode.json (an openai-compatible provider pointed at the
# workspace's managed AI proxy). The pre-1.0 KILO_PROVIDER_TYPE /
# KILO_OPEN_ROUTER_API_KEY env vars no longer exist. We force the configured
# provider active so a stray interactive selection can't shadow it.
export KILO_PROVIDER="openai-compatible"
