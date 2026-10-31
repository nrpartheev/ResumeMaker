#!/bin/bash
set -e

# Download tectonic (single-binary LaTeX engine) to bin/
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

# The "continuous" release tag has versioned filenames, so we use the GitHub API
# to find the correct asset URL.
echo "Fetching download URL from GitHub API..."
DOWNLOAD_URL=$(curl -sL "https://api.github.com/repos/tectonic-typesetting/tectonic/releases" | \
    python3 -c "
import json, sys
data = json.load(sys.stdin)
for release in data:
    for a in release.get('assets', []):
        if '${TECTONIC_ARCH}' in a['name'] and a['name'].endswith('.tar.gz'):
            print(a['browser_download_url'])
            sys.exit(0)
print('NOT_FOUND')
" 2>/dev/null)

if [ "$DOWNLOAD_URL" = "NOT_FOUND" ] || [ -z "$DOWNLOAD_URL" ]; then
    echo "Failed to find tectonic binary for ${TECTONIC_ARCH}"
    exit 1
fi

echo "Downloading from $DOWNLOAD_URL"
curl -L "$DOWNLOAD_URL" | tar xz -C bin

chmod +x bin/tectonic
echo "Tectonic installed at $(pwd)/bin/tectonic"
bin/tectonic --version

# Install Python dependencies
pip install -r requirements.txt

echo "Build complete."
