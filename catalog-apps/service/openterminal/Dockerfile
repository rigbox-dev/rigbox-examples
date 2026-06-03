FROM rigbox-base
# Open Terminal is published as a Python package; the catalog installs it via
# pipx into an isolated venv. We do the same here at image-build time so the
# package is frozen into the image and every deploy boots from it.
#
# Debian python3 enforces PEP 668 (externally-managed-environment), so we
# install into a dedicated venv at /opt/openterminal rather than fight pip.
RUN python3 -m venv /opt/openterminal \
 && /opt/openterminal/bin/pip install --no-cache-dir --upgrade pip \
 && /opt/openterminal/bin/pip install --no-cache-dir open-terminal \
 && ln -sf /opt/openterminal/bin/open-terminal /usr/local/bin/open-terminal \
 && /usr/local/bin/open-terminal --help >/dev/null

# Bake the start wrapper at an absolute path. systemd's ExecStart needs an
# absolute path (a relative `./start.sh` is rejected), so rig.yaml's `start`
# points here rather than at the rsynced copy.
COPY start.sh /usr/local/bin/openterminal-start.sh
RUN chmod +x /usr/local/bin/openterminal-start.sh
