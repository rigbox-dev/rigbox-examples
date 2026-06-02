#!/usr/bin/env bash
# Boot Gitea headless on 0.0.0.0:8080 with SQLite + repos under $DATA_DIR.
#
# The raw gitea binary does NOT read GITEA__SECTION__KEY env vars (only the
# upstream Docker image's entrypoint translates those via environment-to-ini),
# so we generate an app.ini ourselves. INSTALL_LOCK skips the setup wizard, and
# the SECRET_KEY / INTERNAL_TOKEN are minted once and persisted in app.ini under
# $DATA_DIR, so they survive redeploys.
set -euo pipefail

DATA_DIR="${DATA_DIR:-/home/developer/data}"
GITEA_WORK_DIR="${GITEA_WORK_DIR:-$DATA_DIR/gitea}"
CONF_DIR="$GITEA_WORK_DIR/custom/conf"
APP_INI="$CONF_DIR/app.ini"

mkdir -p "$CONF_DIR" "$GITEA_WORK_DIR/data" "$GITEA_WORK_DIR/log" "$DATA_DIR/repositories"

if [ ! -f "$APP_INI" ]; then
  cat > "$APP_INI" <<EOF
APP_NAME = Gitea on Rigbox
RUN_MODE = prod

[server]
HTTP_ADDR = 0.0.0.0
HTTP_PORT = 8080
DISABLE_SSH = true

[database]
DB_TYPE = sqlite3
PATH = $DATA_DIR/gitea.db

[repository]
ROOT = $DATA_DIR/repositories

[security]
INSTALL_LOCK = true
SECRET_KEY = $(gitea generate secret SECRET_KEY)
INTERNAL_TOKEN = $(gitea generate secret INTERNAL_TOKEN)

[session]
PROVIDER = file

[log]
ROOT_PATH = $GITEA_WORK_DIR/log
EOF
fi

exec gitea web --config "$APP_INI" --work-path "$GITEA_WORK_DIR"
