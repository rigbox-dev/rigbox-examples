#!/usr/bin/env bash
# Materialize Open Terminal's config.toml from the rigbox-generated API key,
# then exec the API server. CRED_API_KEY is injected by rig.yaml's
# `credentials.api_key.generate: true` and stays stable across redeploys.
set -euo pipefail

CONFIG_DIR="/home/developer/.config/open-terminal"
CONFIG_FILE="$CONFIG_DIR/config.toml"

mkdir -p "$CONFIG_DIR"
chown -R developer:developer "$CONFIG_DIR"
chmod 700 "$CONFIG_DIR"

# Write the config every boot so a rotated CRED_API_KEY takes effect.
cat > "$CONFIG_FILE" <<EOF
api_key = "${CRED_API_KEY:?CRED_API_KEY is not set — rig.yaml must declare credentials.api_key.generate}"
EOF
chown developer:developer "$CONFIG_FILE"
chmod 600 "$CONFIG_FILE"

# OPENTERMINAL_WORKING_DIRECTORY comes from rig.yaml params (default
# /home/developer). The cwd is the directory open-terminal will read/write
# files under — clamp it here so the systemd unit doesn't drift.
exec /usr/local/bin/open-terminal run \
  --host 0.0.0.0 \
  --port 8000 \
  --config "$CONFIG_FILE" \
  --cwd "${OPENTERMINAL_WORKING_DIRECTORY:-/home/developer}"
