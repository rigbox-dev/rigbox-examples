FROM rigbox-base
# Bake OpenCode (https://opencode.ai) into the image so deploys don't re-run
# the upstream installer on every boot. OpenCode is a Go-based TUI agent —
# the installer drops a single static binary at $HOME/.opencode/bin/opencode
# (earlier releases used $HOME/.local/bin). We accept either, then symlink
# whichever exists to /usr/local/bin so it's on the standard SSH PATH.
#
# The install mirrors the catalog's opencode/install.sh so this image and the
# catalog-installed shape stay byte-compatible.

# 1. Install the CLI as the developer user.
RUN su - developer -s /bin/bash -c '\
      set -euo pipefail; \
      curl -fsSL https://opencode.ai/install | bash; \
      [ -x "$HOME/.opencode/bin/opencode" ] || [ -x "$HOME/.local/bin/opencode" ] \
    ' \
 && if [ -x /home/developer/.opencode/bin/opencode ]; then \
      ln -sfn /home/developer/.opencode/bin/opencode /usr/local/bin/opencode ; \
    else \
      ln -sfn /home/developer/.local/bin/opencode  /usr/local/bin/opencode ; \
    fi

# 2. Make ~/.opencode/bin and ~/.local/bin reachable from non-interactive
#    login shells too (catalog scripts, sshd ForceCommand, ...) so a fresh SSH
#    session sees `opencode` on PATH without depending on per-user rc state.
#    The AI backend is configured in the baked config (step 3), not via env.
COPY opencode-routing.sh /etc/profile.d/opencode-routing.sh
RUN chmod 644 /etc/profile.d/opencode-routing.sh

# 3. Bake the managed-AI provider config so `opencode` works on first SSH with
#    no key to set: a custom OpenAI-compatible provider pointed at the managed
#    AI proxy. Owned by developer so the CLI can read it (and cache beside it).
RUN install -d -o developer -g developer -m 755 /home/developer/.config/opencode
COPY --chown=developer:developer opencode.json /home/developer/.config/opencode/opencode.json
