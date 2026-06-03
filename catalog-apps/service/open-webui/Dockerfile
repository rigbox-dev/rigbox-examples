FROM rigbox-base
# Open WebUI (https://docs.openwebui.com/) — a full-featured chat UI for
# OpenAI-compatible model endpoints. Pinned to a version that's known to boot
# clean on the Rigbox base; bump APP_VERSION and rebuild to upgrade.
#
# Open WebUI pins its torch wheel to cp312, so we use uv to materialize a
# Python 3.12 venv (the base image ships 3.11) and install the CPU torch
# wheel + open-webui from PyPI into it. Everything frozen into the image —
# deploys never re-run pip.
ARG APP_HOME=/home/developer/.open-webui
ARG APP_VERSION=0.9.4
ARG TORCH_CPU_WHEEL_URL=https://download.pytorch.org/whl/cpu/torch-2.9.1%2Bcpu-cp312-cp312-manylinux_2_28_x86_64.whl

RUN set -eu; \
    mkdir -p "$APP_HOME" "$APP_HOME/data" "$APP_HOME/tmp"; \
    chown -R developer:developer "$APP_HOME"; \
    su - developer -s /bin/sh -c "\
      set -eu; \
      export UV_CACHE_DIR='$APP_HOME/.uv-cache'; \
      export UV_PYTHON_INSTALL_DIR='/home/developer/.local/share/uv/python'; \
      export TMPDIR='$APP_HOME/tmp'; \
      /usr/local/bin/uv python install 3.12; \
      /usr/local/bin/uv venv --clear --python 3.12 '$APP_HOME/venv'; \
      /usr/local/bin/uv pip install --no-cache --python '$APP_HOME/venv/bin/python' \
        '$TORCH_CPU_WHEEL_URL' 'open-webui==$APP_VERSION'; \
    "; \
    rm -rf "$APP_HOME/.uv-cache" "$APP_HOME/tmp" /root/.cache/uv \
           /home/developer/.cache/uv; \
    mkdir -p "$APP_HOME/tmp"; \
    chown -R developer:developer "$APP_HOME"

# A tiny entrypoint so we exec the open-webui binary out of the venv — no shell
# rc files, no PATH munging at boot.
RUN set -eu; \
    cat > /home/developer/.open-webui/start.sh <<'EOF'
#!/usr/bin/env sh
set -eu
exec /home/developer/.open-webui/venv/bin/open-webui serve --host 0.0.0.0 --port 8080
EOF
    chmod +x /home/developer/.open-webui/start.sh && \
    chown developer:developer /home/developer/.open-webui/start.sh
