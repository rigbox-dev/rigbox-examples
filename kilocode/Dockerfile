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

# 2. Pin Kilo to the OpenRouter provider and map OPENROUTER_API_KEY into Kilo's
#    KILO_OPEN_ROUTER_API_KEY at every shell start. OPENROUTER_API_KEY stays
#    set as well so Kilo's secondary fallback also resolves it.
COPY kilocode-routing.sh /etc/profile.d/kilocode-routing.sh
RUN chmod 644 /etc/profile.d/kilocode-routing.sh

# 3. Static landing page served by `python3 -m http.server`. The CLI lives on
#    SSH; the HTTP front door exists only to satisfy the health probe.
COPY landing/ /opt/landing/
RUN chmod -R a+r /opt/landing
