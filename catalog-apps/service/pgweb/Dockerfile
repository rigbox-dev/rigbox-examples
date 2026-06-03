FROM rigbox-base
# Freeze a pinned pgweb binary into the image so deploys don't re-download it.
# pgweb ships as a single static Linux binary inside a release .zip.
ARG PGWEB_VERSION=0.16.2
RUN ARCH=$(uname -m) \
 && case "$ARCH" in \
      x86_64|amd64) PGWEB_ARCH=linux_amd64 ;; \
      aarch64|arm64) PGWEB_ARCH=linux_arm64 ;; \
      *) echo "Unsupported architecture: $ARCH"; exit 1 ;; \
    esac \
 && curl -fsSL "https://github.com/sosedoff/pgweb/releases/download/v${PGWEB_VERSION}/pgweb_${PGWEB_ARCH}.zip" \
      -o /tmp/pgweb.zip \
 && unzip -o /tmp/pgweb.zip -d /tmp \
 && mv "/tmp/pgweb_${PGWEB_ARCH}" /usr/local/bin/pgweb \
 && chmod +x /usr/local/bin/pgweb \
 && rm -f /tmp/pgweb.zip \
 && /usr/local/bin/pgweb --version
