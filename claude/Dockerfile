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

# 2. Translate the workspace-level OPENROUTER_* env (forwarded from the
#    operator's shell via rig.yaml's `secrets:` block) into the ANTHROPIC_*
#    env Claude Code reads. Sourced by every interactive login shell, so
#    SSHing in is enough to activate the routing — no per-session `export`
#    dance. ANTHROPIC_API_KEY is deliberately cleared: when both AUTH_TOKEN
#    and API_KEY are set the CLI prefers API_KEY, silently bypassing routing.
COPY claude-routing.sh /etc/profile.d/claude-routing.sh
RUN chmod 644 /etc/profile.d/claude-routing.sh

# 3. Static landing page served by `python3 -m http.server`. The CLI lives on
#    SSH; the HTTP front door exists only to satisfy the health probe.
COPY landing/ /opt/landing/
RUN chmod -R a+r /opt/landing
