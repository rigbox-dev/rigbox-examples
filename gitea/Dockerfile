FROM rigbox-base
# Freeze a pinned Gitea binary into the image so deploys don't re-download it.
# Gitea ships as a single static linux-amd64 binary — no Go toolchain needed.
ARG GITEA_VERSION=1.22.6
ARG GITEA_SHA256=fd77f1a0273c85a0950207c1cfa6753a9fa57604e4ab1382484b191cc919ce15
RUN curl -fsSL "https://dl.gitea.com/gitea/${GITEA_VERSION}/gitea-${GITEA_VERSION}-linux-amd64" \
      -o /usr/local/bin/gitea \
 && echo "${GITEA_SHA256}  /usr/local/bin/gitea" | sha256sum -c - \
 && chmod +x /usr/local/bin/gitea \
 && gitea --version

# Bake the headless-boot wrapper at an absolute path. systemd's ExecStart needs
# an absolute path (a relative `./start.sh` is rejected), so the rig.yaml `start`
# points here rather than at the rsynced copy.
COPY start.sh /usr/local/bin/gitea-start.sh
RUN chmod +x /usr/local/bin/gitea-start.sh
