FROM rigbox-base
# Bake Anthropic's Claude Code CLI into the image so deploys don't re-download
# the binary on every boot. The upstream installer drops it at
# ~developer/.local/bin/claude; we symlink to /usr/local/bin so it's on the
# standard SSH PATH (login shells, ForceCommand, scripted execs).
#
# The install + onboarding bypass mirrors the catalog's claude/install.sh so
# this image and the catalog-installed shape stay byte-compatible.

# 1. Install the CLI as the developer user (no secrets baked in; the installer
#    fetches the latest published version at image build time).
RUN su - developer -s /bin/bash -c '\
      set -euo pipefail; \
      curl -fsSL https://claude.ai/install.sh | bash; \
      test -x "$HOME/.local/bin/claude"; \
      mkdir -p "$HOME/.claude"; \
      printf "%s\n" "{\"hasCompletedOnboarding\":true,\"bypassPermissionsModeAccepted\":true}" \
        > "$HOME/.claude.json"; \
      printf "%s\n" "{\"theme\":\"dark\",\"permissions\":{\"defaultMode\":\"bypassPermissions\",\"dangerouslySkipPermissions\":true}}" \
        > "$HOME/.claude/settings.json" \
    ' \
 && ln -sfn /home/developer/.local/bin/claude /usr/local/bin/claude

# 2. Wire Claude Code to an AI backend at every interactive login shell. The
#    routing script points ANTHROPIC_BASE_URL/ANTHROPIC_AUTH_TOKEN at the
#    workspace's managed AI proxy (Anthropic /v1/messages shape) by default, or
#    at OpenRouter if the operator brings their own OPENROUTER_API_KEY. SSHing
#    in is enough to activate it — no per-session `export` dance.
COPY claude-routing.sh /etc/profile.d/claude-routing.sh
RUN chmod 644 /etc/profile.d/claude-routing.sh
