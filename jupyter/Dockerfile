FROM rigbox-base
# Install JupyterLab on top of the rigbox base. The base ships Debian's
# python3 (3.11 at /usr/bin/python3); PEP 668 requires --break-system-packages
# to install into the system site-packages. The heavy pip install is frozen
# into the image so deploys don't re-run it.
RUN if [ -x /usr/local/bin/uv ]; then \
      /usr/local/bin/uv pip install --system --python /usr/bin/python3 \
        --break-system-packages jupyterlab ; \
    else \
      /usr/bin/pip3 install --break-system-packages jupyterlab ; \
    fi \
 && jupyter --version
