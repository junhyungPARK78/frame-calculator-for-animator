# Chrome Web Store screenshot sources

These HTML files are the source for the 1280×800 marketing screenshots used on
the Chrome Web Store listing.

## Files

| Source | Output | Locale |
|---|---|---|
| `main-en.html` | `../main-en.png` | English |
| `main-ko.html` | `../main-ko.png` | 한국어 |
| `main-ja.html` | `../main-ja.png` | 日本語 |
| `build.sh`     | (driver script) | rebuild all locales |

Each HTML embeds the corresponding UI screenshot from a local copy
(`preview-{en,ko,ja}.png`) so the folder is self-contained and previews
correctly when opened directly in any browser. The local copies are kept in
sync with the originals at `../../preview*.png`.

## Re-rendering — automated (recommended)

Whenever the README screenshots at `../../preview*.png` change, just run:

```bash
./build.sh           # rebuild all locales (en, ko, ja)
./build.sh en        # rebuild a single locale
```

`build.sh` performs both steps for you:

1. Copies the latest `../../preview*.png` into this folder as
   `preview-{en,ko,ja}.png` (so the HTML always uses up-to-date UI shots).
2. Renders each `main-*.html` to `../main-*.png` at 1280×800 via headless
   Chrome and verifies the output dimensions.

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
