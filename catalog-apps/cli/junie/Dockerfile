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

# 2. Select the baked managed-AI profile at every shell start
#    (JUNIE_MODEL=custom:rigbox) and keep the npm-global bin on PATH. Junie
#    ignores the generic OPENAI_* env, so the actual backend is the custom LLM
#    profile baked in step 3.
COPY junie-routing.sh /etc/profile.d/junie-routing.sh
RUN chmod 644 /etc/profile.d/junie-routing.sh

# 3. Bake the managed-AI custom LLM profile so `junie` works on first SSH with
#    no key to set: an OpenAI-compatible profile pointed at the managed AI
#    proxy. junie-routing.sh selects it via JUNIE_MODEL=custom:rigbox. The
#    filename (minus .json) is the profile id. Owned by developer to read.
RUN install -d -o developer -g developer -m 755 /home/developer/.junie/models
COPY --chown=developer:developer rigbox.json /home/developer/.junie/models/rigbox.json
