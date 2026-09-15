#!/usr/bin/env bash
set -euo pipefail
export N8N_USER_FOLDER="${RIGBOX_APP_DATA_DIR:?Rigbox app data directory is required}"
exec ./node_modules/.bin/n8n start
