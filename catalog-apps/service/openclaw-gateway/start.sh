#!/usr/bin/env bash
# Boot wrapper for the OpenClaw gateway. Synthesizes per-VM config from env,
# then exec's the openclaw binary on the Rigbox-routed port.
#
# This file rsyncs in with the app, so gateway.js sits next to it — resolve it
# relative to this script rather than by absolute path.
set -euo pipefail
here="$(cd "$(dirname "$0")" && pwd)"
mkdir -p /home/developer/.openclaw/agents/main/agent /home/developer/.cache/nodejs
node "$here/gateway.js"
exec /home/developer/.npm-global/bin/openclaw gateway \
  --bind lan --port 18789 --allow-unconfigured
