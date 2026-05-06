# Chrome Web Store asset sources

These HTML files are the source for two sets of Chrome Web Store assets:

- **Marketing screenshots** — 1280×800, used as listing screenshots.
- **Promotional tiles** — 440×280, used as the small promo tile (category
  cards, search results, featured-placement candidates).

## Files

| Source | Output | Locale | Size |
|---|---|---|---|
| `main-en.html`  | `../main-en.png`  | English | 1280×800 |
| `main-ko.html`  | `../main-ko.png`  | 한국어  | 1280×800 |
| `main-ja.html`  | `../main-ja.png`  | 日本語  | 1280×800 |
| `promo-en.html` | `../promo-en.png` | English | 440×280  |
| `promo-ko.html` | `../promo-ko.png` | 한국어  | 440×280  |
| `promo-ja.html` | `../promo-ja.png` | 日本語  | 440×280  |
| `build.sh`      | (driver script)   | —       | —        |

`main-*.html` embeds the corresponding UI screenshot from a local copy
(`preview-{en,ko,ja}.png`), kept in sync with the originals at
`../../preview*.png`. `promo-*.html` embeds the app icon from a local copy
(`icon128.png`), kept in sync with `../../../output/icons/icon128.png`. Both
copies make this folder self-contained and previewable directly in any
browser.

## Re-rendering — automated (recommended)

```bash
./build.sh                # rebuild everything (main + promo, all locales)
./build.sh en             # rebuild all assets for a single locale
./build.sh main           # rebuild only main screenshots, all locales
./build.sh promo          # rebuild only promo tiles, all locales
./build.sh main en        # rebuild a single main screenshot
./build.sh promo en       # rebuild a single promo tile
```

`build.sh` performs the sync + render steps for you:

1. Copies the latest `../../preview*.png` into this folder as
   `preview-{en,ko,ja}.png` (used by `main-*.html`).
2. Copies the latest `../../../output/icons/icon128.png` into this folder
   as `icon128.png` (used by `promo-*.html`).
3. Renders each HTML at the right size (1280×800 for main, 440×280 for
   promo) via headless Chrome and verifies output dimensions.

The script can be run from any working directory; paths are resolved relative
to the script itself.

## Re-rendering — manual fallback

If `build.sh` won't run for some reason, you can render a single locale by
hand:

```bash
/Applications/Google\ Chrome.app/Contents/MacOS/Google\ Chrome \
  --headless --disable-gpu --hide-scrollbars \
  --window-size=1280,800 \
  --screenshot=../main-en.png \
  "file://$(pwd)/main-en.html"
```

Make sure `preview-en.png` in this folder is up to date first
(`cp ../../preview.en.png preview-en.png`).

## Editing

- Copy / colors / layout: edit the `<style>` and content in the HTML directly,
  then run `./build.sh <locale>` to regenerate that locale.
- Underlying UI screenshot: update `../../preview*.png` (the originals shared
  with the README), then run `./build.sh` — it will sync the local copies and
  re-render automatically.
- After editing, re-render with the command above.

## Design notes

- Palette: Catppuccin Mocha (matches the extension's dark theme).
- Accent blue `#89b4fa`, accent green `#a6e3a1`, surface `#1e1e2e`.
- Typography stack defaults to system sans-serif per locale.
