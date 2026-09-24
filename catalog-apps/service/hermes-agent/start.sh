#!/usr/bin/env bash
set -euo pipefail

: "${CRED_DASHBOARD_PASSWORD:?dashboard_password credential is required}"
: "${CRED_DASHBOARD_SESSION_SECRET:?dashboard_session_secret credential is required}"

export HERMES_DASHBOARD_BASIC_AUTH_USERNAME="${DASHBOARD_USERNAME:-admin}"
export HERMES_DASHBOARD_BASIC_AUTH_SECRET="$CRED_DASHBOARD_SESSION_SECRET"
HERMES_DASHBOARD_BASIC_AUTH_PASSWORD_HASH="$(
  cd "${HERMES_HOME:-/home/developer/.hermes}/hermes-agent"
  ./venv/bin/python - <<'PY'
import os
from plugins.dashboard_auth.basic import hash_password

print(hash_password(os.environ["CRED_DASHBOARD_PASSWORD"]))
PY
)"
export HERMES_DASHBOARD_BASIC_AUTH_PASSWORD_HASH
unset CRED_DASHBOARD_PASSWORD CRED_DASHBOARD_SESSION_SECRET

exec /home/developer/.local/bin/hermes dashboard --host 0.0.0.0 --port 9119 --no-open
