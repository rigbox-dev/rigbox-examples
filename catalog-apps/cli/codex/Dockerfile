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

# 2. Translate OPENROUTER_* -> OPENAI_* at shell start. Codex reads
#    OPENAI_BASE_URL + OPENAI_API_KEY (OpenRouter is OpenAI-API-compatible at
#    /v1, so a one-line rename is enough). Sourced by every interactive login
#    shell — SSHing in is enough to activate the routing.
COPY codex-routing.sh /etc/profile.d/codex-routing.sh
RUN chmod 644 /etc/profile.d/codex-routing.sh
