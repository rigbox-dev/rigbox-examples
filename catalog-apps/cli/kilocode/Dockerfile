FROM rigbox-base
# Bake Kilo Code's CLI into the image so deploys don't re-run npm install on
# every boot. @kilocode/cli is a multi-provider AI coding agent — 100+
# providers behind one binary, OpenRouter included. The base image already
# points npm's global prefix at ~/.npm-global, so the install lands at
# ~developer/.npm-global/bin/kilocode (older releases used `kilo`). We
# symlink whichever exists to /usr/local/bin so it's on the standard SSH PATH.
#
# The install mirrors the catalog's kilocode/install.sh so this image and the
# catalog-installed shape stay byte-compatible.

# 1. Install the CLI as the developer user.
RUN su - developer -s /bin/bash -c '\
      set -euo pipefail; \
      npm install -g --no-fund --silent @kilocode/cli; \
      command -v kilocode >/dev/null 2>&1 || command -v kilo >/dev/null 2>&1 \
    ' \
 && if [ -x /home/developer/.npm-global/bin/kilocode ]; then \
      ln -sfn /home/developer/.npm-global/bin/kilocode /usr/local/bin/kilocode ; \
    else \
      ln -sfn /home/developer/.npm-global/bin/kilo     /usr/local/bin/kilocode ; \
    fi

# 2. Force the baked provider active at every shell start (KILO_PROVIDER=
#    openai-compatible). The provider's base URL, key, and model live in the
#    config baked in step 3 — Kilo CLI 1.0 (an OpenCode fork) configures
#    providers in a file, not via the pre-1.0 KILO_* env vars.
COPY kilocode-routing.sh /etc/profile.d/kilocode-routing.sh
RUN chmod 644 /etc/profile.d/kilocode-routing.sh

# 3. Bake the managed-AI provider config (Kilo CLI 1.0 = OpenCode fork): an
#    openai-compatible provider pointed at the managed AI proxy, so `kilocode`
#    works on first SSH with no key to set. Owned by developer so the CLI can
#    read it (and cache beside it).
RUN install -d -o developer -g developer -m 755 /home/developer/.config/kilo
COPY --chown=developer:developer opencode.json /home/developer/.config/kilo/opencode.json
