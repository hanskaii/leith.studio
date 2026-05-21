# Build Stage
FROM rust:1.85-slim AS builder

RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /usr/src/stitcher

# Cache dependency build layer
COPY Cargo.toml .
RUN mkdir src && echo "fn main() {}" > src/main.rs
RUN cargo build --release
RUN rm -f target/release/deps/stitcher*

# Build actual binary
COPY src src
RUN cargo build --release

# Runtime Image
FROM debian:bookworm-slim

RUN apt-get update && apt-get install -y --no-install-recommends \
    ffmpeg \
    ca-certificates \
    fuse \
    curl \
    && rm -rf /var/lib/apt/lists/*

# Install tigrisfs (pinned version to avoid GitHub API rate limits during build)
RUN ARCH=$(uname -m) && \
    if [ "$ARCH" = "x86_64" ]; then ARCH="amd64"; fi && \
    if [ "$ARCH" = "aarch64" ]; then ARCH="arm64"; fi && \
    curl -fL "https://github.com/tigrisdata/tigrisfs/releases/download/v1.2.1/tigrisfs_1.2.1_linux_${ARCH}.tar.gz" -o /tmp/tigrisfs.tar.gz && \
    tar -xzf /tmp/tigrisfs.tar.gz -C /usr/local/bin/ tigrisfs && \
    rm /tmp/tigrisfs.tar.gz && \
    chmod +x /usr/local/bin/tigrisfs

COPY --from=builder /usr/src/stitcher/target/release/stitcher /usr/local/bin/stitcher

RUN printf '#!/bin/sh\nmkdir -p /mnt/r2\n/usr/local/bin/tigrisfs --endpoint "https://${R2_ACCOUNT_ID}.r2.cloudflarestorage.com" -f "${R2_BUCKET}" /mnt/r2 &\nsleep 3\nexec /usr/local/bin/stitcher\n' > /entrypoint.sh && chmod +x /entrypoint.sh

EXPOSE 8080
ENTRYPOINT ["/entrypoint.sh"]
