FROM rigbox-base
# Pi (https://www.npmjs.com/package/@mariozechner/pi-coding-agent) — an
# OpenRouter-native coding agent that runs interactively in your terminal.
# Pi has no web UI; the catalog item is CLI-shaped. We install the binary
# globally so it's on $PATH for both interactive SSH sessions and the
# `pi` wrapper symlink at /usr/local/bin/pi.
#
# Pi reads OPENROUTER_API_KEY directly — no profile.d env translation needed.
# The workspace env layer (managed proxy injection OR a real key set via
# `rig app secret set OPENROUTER_API_KEY=…`) carries it.

RUN set -eu; \
    su - developer -s /bin/bash -c '\
      set -euo pipefail; \
      export NPM_CONFIG_PREFIX="$HOME/.npm-global"; \
      mkdir -p "$NPM_CONFIG_PREFIX/bin"; \
      export PATH="$NPM_CONFIG_PREFIX/bin:$PATH"; \
      npm install -g --no-fund --silent @mariozechner/pi-coding-agent; \
      pi --version >/dev/null 2>&1 || [ -x "$NPM_CONFIG_PREFIX/bin/pi" ]; \
      # Persist PATH for interactive shells.
      for RC in "$HOME/.bashrc" "$HOME/.zshrc" "$HOME/.profile"; do \
        if [ -f "$RC" ] && ! grep -qF NPM_CONFIG_PREFIX "$RC"; then \
          printf "\n# Added by rigbox example (pi)\nexport NPM_CONFIG_PREFIX=\"\$HOME/.npm-global\"\nexport PATH=\"\$NPM_CONFIG_PREFIX/bin:\$PATH\"\n" >> "$RC"; \
        fi; \
      done; \
    '; \
    install -d -m 755 /usr/local/bin; \
    ln -sfn /home/developer/.npm-global/bin/pi /usr/local/bin/pi
