#!/usr/bin/env bash
set -euo pipefail
release_dir="$(CDPATH= cd -- "$(dirname -- "$0")" && pwd)"
exec "$release_dir/node_modules/.bin/codex" \
  -c 'model_provider="rigbox"' \
  -c 'model="rigbox/default"' \
  -c 'model_providers.rigbox.name="Rigbox Managed AI"' \
  -c 'model_providers.rigbox.base_url="http://172.16.0.1:9090/v1"' \
  -c 'model_providers.rigbox.env_key="OPENAI_API_KEY"' \
  -c 'model_providers.rigbox.wire_api="responses"' "$@"
