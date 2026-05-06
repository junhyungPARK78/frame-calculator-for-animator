#!/usr/bin/env bash
#
# Rebuild all Chrome Web Store screenshots (assets/store/main-*.png) from the
# HTML sources in this folder.
#
# What it does:
#   1. Sync local preview copies (preview-{en,ko,ja}.png) from the originals
#      at ../../preview*.png so the HTML always uses up-to-date UI shots.
#   2. Render each main-*.html to a 1280x800 PNG using headless Chrome.
#
# Run from anywhere; paths resolve relative to this script.
#
# Usage:
#   ./build.sh             # rebuild all locales
#   ./build.sh en          # rebuild a single locale (en | ko | ja)

set -euo pipefail

# Resolve script directory (works regardless of where it's invoked from).
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
STORE_DIR="$(cd "${SCRIPT_DIR}/.." && pwd)"
ASSETS_DIR="$(cd "${STORE_DIR}/.." && pwd)"

CHROME="/Applications/Google Chrome.app/Contents/MacOS/Google Chrome"
if [[ ! -x "$CHROME" ]]; then
  echo "✗ Google Chrome not found at: $CHROME" >&2
  exit 1
fi

# Source mapping: locale → original-preview-filename.
# (ko uses preview.png — no .ko suffix — for legacy-compat; en/ja use preview.<locale>.png)
src_for() {
  case "$1" in
    en) echo "preview.en.png" ;;
    ko) echo "preview.png" ;;
    ja) echo "preview.ja.png" ;;
    *)  echo "✗ unknown locale: $1" >&2; exit 1 ;;
  esac
}

LOCALES=("en" "ko" "ja")
if [[ $# -ge 1 ]]; then
  LOCALES=("$1")
fi

for L in "${LOCALES[@]}"; do
  SRC_FILE="${ASSETS_DIR}/$(src_for "$L")"
  LOCAL_COPY="${SCRIPT_DIR}/preview-${L}.png"
  HTML="${SCRIPT_DIR}/main-${L}.html"
  OUT="${STORE_DIR}/main-${L}.png"

  if [[ ! -f "$SRC_FILE" ]]; then
    echo "✗ Source not found: $SRC_FILE" >&2
    exit 1
  fi

  echo "→ [$L] sync $(basename "$SRC_FILE") → $(basename "$LOCAL_COPY")"
  cp "$SRC_FILE" "$LOCAL_COPY"

  echo "→ [$L] render $(basename "$HTML") → $(basename "$OUT")"
  "$CHROME" \
    --headless --disable-gpu --hide-scrollbars \
    --window-size=1280,800 \
    --screenshot="$OUT" \
    "file://${HTML}" \
    >/dev/null 2>&1

  # Sanity check: confirm 1280x800 output.
  DIMS="$(sips -g pixelWidth -g pixelHeight "$OUT" 2>/dev/null \
          | awk '/pixelWidth|pixelHeight/ {print $2}' | paste -sd x -)"
  echo "  ✓ $OUT (${DIMS})"
done

echo ""
echo "Done."
