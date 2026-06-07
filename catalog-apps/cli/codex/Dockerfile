FROM rigbox-base
# Bake OpenAI's Codex CLI into the image so deploys don't re-run `npm install`
# on every boot. @openai/codex publishes a global CLI; the base image already
# points npm's global prefix at ~/.npm-global, so the install lands at
# ~developer/.npm-global/bin/codex. We symlink to /usr/local/bin so it's on
# the standard SSH PATH (login shells, ForceCommand, scripted execs).
#
# The install mirrors the catalog's codex/install.sh so this image and the
# catalog-installed shape stay byte-compatible.

# 1. Install the CLI as the developer user.
RUN su - developer -s /bin/bash -c '\
      set -euo pipefail; \
      npm install -g --no-fund --silent @openai/codex; \
      command -v codex >/dev/null 2>&1 \
    ' \
 && ln -sfn /home/developer/.npm-global/bin/codex /usr/local/bin/codex

# 2. Codex 0.137+ reads its provider from ~/.codex/config.toml (not env), so the
#    routing script only makes sure $OPENAI_API_KEY (the proxy placeholder) is
#    present for the config's env_key. Sourced by every interactive login shell.
COPY codex-routing.sh /etc/profile.d/codex-routing.sh
RUN chmod 644 /etc/profile.d/codex-routing.sh

# 3. Bake the managed-AI provider config so `codex` works on first SSH with no
#    key to set: a custom provider over the Responses wire pointed at the managed
#    AI proxy (plain HTTP — no websocket). Owned by developer so the CLI reads it.
RUN install -d -o developer -g developer -m 755 /home/developer/.codex
COPY --chown=developer:developer config.toml /home/developer/.codex/config.toml
