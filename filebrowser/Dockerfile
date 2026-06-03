FROM rigbox-base
# Freeze the File Browser binary into the image so deploys don't re-download it.
# File Browser ships as a single static Go binary — no toolchain needed.
ARG FB_VERSION=v2.32.0
RUN ARCH=$(uname -m) \
 && case "$ARCH" in \
        x86_64|amd64)  FB_ARCH="linux-amd64"  ;; \
        aarch64|arm64) FB_ARCH="linux-arm64"  ;; \
        *) echo "Unsupported arch: $ARCH" >&2 ; exit 1 ;; \
    esac \
 && curl -fsSL "https://github.com/filebrowser/filebrowser/releases/download/${FB_VERSION}/${FB_ARCH}-filebrowser.tar.gz" \
      | tar -xz -C /usr/local/bin/ filebrowser \
 && chmod +x /usr/local/bin/filebrowser \
 && /usr/local/bin/filebrowser version
