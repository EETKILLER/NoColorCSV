# NoColorCSV 1.0.0 release notes

NoColorCSV helps readers identify CSV cells without relying on column colors. It gives
one-based row and column numbers, optional headers, text values, keyboard navigation,
read-only diagnostics, focus marks and a separate read-only table preview.

## In this release

- Preview metadata is cached per document version and header setting. Turning pages no
  longer rescans all logical records for column counts and diagnostics.
- Deterministic 1 MB and 10 MB synthetic fixtures, repeatable Node benchmarks and a CI
  performance smoke test make large-file regressions easier to detect.
- Windows VS Code 1.142 testing covered a 10 MB / 100,001-record, 20-column CSV. The
  first preview showed 50 rows in 244 ms after opening the editor (the parse may have
  been cached by the status bar); Page Down kept the DOM at 50 rows. Thirty measured
  operations per command stayed below the initial status and
  navigation timing targets. Details are in [the performance report](performance-v1-candidate.md).

## Scope and known limits

- Reads `.csv` files separated by the ASCII comma `,`. Quoted commas, doubled quotes,
  quoted line breaks, optional BOM and LF/CRLF/CR record endings are handled. A full-width
  comma is ordinary text. CSV issues are reported without changing the source.
- The preview is read-only and includes unsaved editor content. The original editor
  remains the source of truth. Its Webview renders at most 50 rows per page, but the
  extension host parses the entire file when the document first needs CSV features.
- Functional UI checks for 1.0.0 were run on Windows. Screen reader speech with Narrator
  or NVDA was not verified. macOS and Linux UI behavior was not tested for this release.
  The tests do not establish peak memory usage or idle CPU on every machine.

## Install

Download the attached `nocolorcsv-1.0.0.vsix`. In VS Code, open Extensions, select
`…` → **Install from VSIX...**, and choose the file. The manifest declares VS Code
`^1.85.0`; the current Windows development host check used VS Code 1.142.0.

Source and VSIX are published from the same `v1.0.0` commit. The GitHub asset's SHA-256
is recorded on the release page after upload.
