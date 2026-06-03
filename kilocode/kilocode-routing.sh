# Managed by rigbox-examples (kilocode). Pins Kilo Code to the OpenRouter
# provider and maps the generic OPENROUTER_API_KEY into the Kilo-specific
# KILO_OPEN_ROUTER_API_KEY at every shell start.
export KILO_PROVIDER_TYPE="openrouter"
if [ -n "${OPENROUTER_API_KEY:-}" ]; then
  export KILO_OPEN_ROUTER_API_KEY="${OPENROUTER_API_KEY}"
fi
