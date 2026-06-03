FROM rigbox-base
# Bake JetBrains' Junie CLI into the image so deploys don't re-run npm install
# (and its postinstall JetBrains-bundle download) on every boot. The base
# image already points npm's global prefix at ~/.npm-global, so the install
# lands at ~developer/.npm-global/bin/junie. We symlink to /usr/local/bin so
# it's on the standard SSH PATH.
#
# The install mirrors the catalog's junie/install.sh so this image and the
# catalog-installed shape stay byte-compatible.

# 1. Install the CLI as the developer user.  --silent suppresses npm's
#    postinstall download progress so the image build log stays readable.
RUN su - developer -s /bin/bash -c '\
      set -euo pipefail; \
      export NPM_CONFIG_PREFIX="$HOME/.npm-global"; \
      mkdir -p "$NPM_CONFIG_PREFIX/bin"; \
      export PATH="$NPM_CONFIG_PREFIX/bin:$PATH"; \
      npm install -g --no-fund --silent @jetbrains/junie-cli; \
      "$NPM_CONFIG_PREFIX/bin/junie" --version >/dev/null \
    ' \
 && ln -sfn /home/developer/.npm-global/bin/junie /usr/local/bin/junie

# 2. Translate the workspace-level OPENROUTER_API_KEY into Junie's preferred
#    JUNIE_OPENROUTER_API_KEY (Junie reads the latter first, then falls back to
#    the generic name). Sourced by every interactive login shell, so SSHing in
#    is enough to activate the routing.
COPY junie-routing.sh /etc/profile.d/junie-routing.sh
RUN chmod 644 /etc/profile.d/junie-routing.sh
