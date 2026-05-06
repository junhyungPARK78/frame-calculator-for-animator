#!/usr/bin/env bash
#
# Rebuild Chrome Web Store assets from the HTML sources in this folder:
#   - Marketing screenshots: assets/store/main-{en,ko,ja}.png  (1280x800)
#   - Promotional tiles:     assets/store/promo-{en,ko,ja}.png (440x280)
#
# What it does:
#   1. Sync local preview copies (preview-{en,ko,ja}.png) from the originals
#      at ../../preview*.png so the main-*.html always uses up-to-date UI shots.
#   2. Sync local icon copy (icon128.png) from ../../../output/icons/icon128.png
#      so the promo-*.html always uses the up-to-date app icon.
#   3. Render each HTML to a PNG at the right size using headless Chrome.
#
# Run from anywhere; paths resolve relative to this script.
#
# Usage:
#   ./build.sh                   # rebuild everything (main + promo, all locales)
#   ./build.sh en                # rebuild a single locale (en | ko | ja)
#   ./build.sh main              # rebuild only main screenshots, all locales
#   ./build.sh promo             # rebuild only promo tiles, all locales
#   ./build.sh main en           # rebuild only main screenshot for one locale
#   ./build.sh promo en          # rebuild only promo tile for one locale

set -euo pipefail

# Resolve script directory (works regardless of where it's invoked from).
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
STORE_DIR="$(cd "${SCRIPT_DIR}/.." && pwd)"
ASSETS_DIR="$(cd "${STORE_DIR}/.." && pwd)"
REPO_DIR="$(cd "${ASSETS_DIR}/.." && pwd)"

CHROME="/Applications/Google Chrome.app/Contents/MacOS/Google Chrome"
if [[ ! -x "$CHROME" ]]; then
  echo "✗ Google Chrome not found at: $CHROME" >&2
  exit 1
fi

# Source mapping: locale → original-preview-filename (assets/preview.<locale>.png).
src_for() {
  case "$1" in
    en) echo "preview.en.png" ;;
    ko) echo "preview.ko.png" ;;
    ja) echo "preview.ja.png" ;;
    *)  echo "✗ unknown locale: $1" >&2; exit 1 ;;
  esac
}

# Argument parsing.
TARGETS=("main" "promo")
LOCALES=("en" "ko" "ja")

if [[ $# -ge 1 ]]; then
  case "$1" in
    main|promo) TARGETS=("$1") ;;
    en|ko|ja)   LOCALES=("$1"); shift $(( $# > 0 ? 0 : 0 )) ;;
    *) echo "✗ unknown argument: $1" >&2; exit 1 ;;
  esac
fi
if [[ $# -ge 2 ]]; then
  case "$2" in
    en|ko|ja) LOCALES=("$2") ;;
    *) echo "✗ unknown locale: $2" >&2; exit 1 ;;
  esac
fi

# Sync icon (only needed for promo, but cheap and idempotent).
ICON_SRC="${REPO_DIR}/output/icons/icon128.png"
ICON_DST="${SCRIPT_DIR}/icon128.png"
if [[ -f "$ICON_SRC" ]]; then
  cp "$ICON_SRC" "$ICON_DST"
fi

render() {
  local kind="$1"   # main | promo
  local locale="$2"
  local html="${SCRIPT_DIR}/${kind}-${locale}.html"
  local out="${STORE_DIR}/${kind}-${locale}.png"
  local size

  case "$kind" in
    main)  size="1280,800" ;;
    promo) size="440,280" ;;
  esac

  if [[ ! -f "$html" ]]; then
    echo "✗ HTML source not found: $html" >&2
    exit 1
  fi

  echo "→ [${kind}/${locale}] render $(basename "$html") → $(basename "$out") (${size})"
  "$CHROME" \
    --headless --disable-gpu --hide-scrollbars \
    --window-size="$size" \
    --screenshot="$out" \
    "file://${html}" \
    >/dev/null 2>&1

  local dims
  dims="$(sips -g pixelWidth -g pixelHeight "$out" 2>/dev/null \
          | awk '/pixelWidth|pixelHeight/ {print $2}' | paste -sd x -)"
  echo "  ✓ $out (${dims})"
}

for T in "${TARGETS[@]}"; do
  for L in "${LOCALES[@]}"; do
    if [[ "$T" == "main" ]]; then
      # Sync UI preview into local copy used by main-*.html.
      SRC_FILE="${ASSETS_DIR}/$(src_for "$L")"
      LOCAL_COPY="${SCRIPT_DIR}/preview-${L}.png"
      if [[ ! -f "$SRC_FILE" ]]; then
        echo "✗ Source not found: $SRC_FILE" >&2
        exit 1
      fi
      echo "→ [main/${L}] sync $(basename "$SRC_FILE") → $(basename "$LOCAL_COPY")"
      cp "$SRC_FILE" "$LOCAL_COPY"
    fi
    render "$T" "$L"
  done
done

echo ""
echo "Done."
