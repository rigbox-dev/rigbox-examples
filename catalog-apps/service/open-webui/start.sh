#!/usr/bin/env bash
set -euo pipefail

: "${CRED_ADMIN_PASSWORD:?admin_password credential is required}"
export WEBUI_ADMIN_EMAIL="${WEBUI_ADMIN_EMAIL:-admin@example.com}"
export WEBUI_ADMIN_PASSWORD="$CRED_ADMIN_PASSWORD"
unset CRED_ADMIN_PASSWORD

exec /home/developer/.open-webui/venv/bin/open-webui serve --host 0.0.0.0 --port 8080
