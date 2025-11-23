#!/usr/bin/env bash

# Download Chrome Extension Script
# Downloads the extension from GitHub releases and extracts it

set -e

EXTENSION_DIR="${HOME}/.ai-live-log-bridge-extension"
REPO="Ami3466/ai-live-log-bridge"
DOWNLOAD_URL="https://github.com/${REPO}/releases/latest/download/ai-live-log-bridge-extension.zip"

echo "🔍 Downloading Chrome extension..."
echo "   From: ${DOWNLOAD_URL}"
echo "   To: ${EXTENSION_DIR}"
echo ""

# Create temp directory
TMP_DIR=$(mktemp -d)
ZIP_FILE="${TMP_DIR}/extension.zip"

# Download
if command -v curl &> /dev/null; then
    curl -L -o "${ZIP_FILE}" "${DOWNLOAD_URL}"
elif command -v wget &> /dev/null; then
    wget -O "${ZIP_FILE}" "${DOWNLOAD_URL}"
else
    echo "❌ Error: Neither curl nor wget found"
    echo "   Please install curl or wget and try again"
    exit 1
fi

# Extract
echo "📦 Extracting extension..."
rm -rf "${EXTENSION_DIR}"
mkdir -p "${EXTENSION_DIR}"
unzip -q "${ZIP_FILE}" -d "${EXTENSION_DIR}"

# Cleanup
rm -rf "${TMP_DIR}"

echo ""
echo "✅ Extension downloaded successfully!"
echo ""
echo "Next steps:"
echo "  1. Open Chrome: chrome://extensions/"
echo "  2. Enable 'Developer mode' (top right)"
echo "  3. Click 'Load unpacked'"
echo "  4. Select: ${EXTENSION_DIR}"
echo "  5. Copy the Extension ID"
echo "  6. Run: npm run update-extension-id <YOUR_EXTENSION_ID>"
echo ""
