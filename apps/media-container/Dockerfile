# Build Stage
FROM node:22-slim AS builder

WORKDIR /app
RUN npm install -g npm@latest
COPY package.json tsconfig.json ./
RUN npm install
COPY src ./src
RUN npm run build

# Runtime Image
FROM node:22-slim

RUN apt-get update && apt-get install -y --no-install-recommends \
    fuse \
    ca-certificates \
    curl \
    && rm -rf /var/lib/apt/lists/*

# Install tigrisfs (pinned version)
RUN ARCH=$(uname -m) && \
    if [ "$ARCH" = "x86_64" ]; then ARCH="amd64"; fi && \
    if [ "$ARCH" = "aarch64" ]; then ARCH="arm64"; fi && \
    curl -fL "https://github.com/tigrisdata/tigrisfs/releases/download/v1.2.1/tigrisfs_1.2.1_linux_${ARCH}.tar.gz" -o /tmp/tigrisfs.tar.gz && \
    tar -xzf /tmp/tigrisfs.tar.gz -C /usr/local/bin/ tigrisfs && \
    rm /tmp/tigrisfs.tar.gz && \
    chmod +x /usr/local/bin/tigrisfs

WORKDIR /app
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/node_modules ./node_modules

RUN printf '#!/bin/sh\nmkdir -p /mnt/r2\n/usr/local/bin/tigrisfs --endpoint "https://${R2_ACCOUNT_ID}.r2.cloudflarestorage.com" -f "${R2_BUCKET}" /mnt/r2 &\nsleep 3\nexec node /app/dist/index.js\n' > /entrypoint.sh && chmod +x /entrypoint.sh

EXPOSE 8080
ENTRYPOINT ["/entrypoint.sh"]
