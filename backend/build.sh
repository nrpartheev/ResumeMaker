#!/bin/bash
set -e

# Download tectonic (single-binary LaTeX engine) to bin/
# This avoids needing apt-get (which Render's Python env doesn't allow)
# Tectonic downloads LaTeX packages on demand at compile time.

echo "Installing tectonic..."
mkdir -p bin

# Detect architecture
ARCH=$(uname -m)
if [ "$ARCH" = "x86_64" ]; then
    TECTONIC_ARCH="x86_64-unknown-linux-musl"
elif [ "$ARCH" = "aarch64" ] || [ "$ARCH" = "arm64" ]; then
    TECTONIC_ARCH="aarch64-unknown-linux-musl"
else
    echo "Unsupported architecture: $ARCH"
    exit 1
fi

TECTONIC_URL="https://github.com/tectonic-typesetting/tectonic/releases/latest/download/tectonic-${TECTONIC_ARCH}.tar.gz"

echo "Downloading from $TECTONIC_URL"
curl -L "$TECTONIC_URL" | tar xz -C bin

chmod +x bin/tectonic
echo "Tectonic installed at bin/tectonic"
bin/tectonic --version

# Install Python dependencies
pip install -r requirements.txt

echo "Build complete."
