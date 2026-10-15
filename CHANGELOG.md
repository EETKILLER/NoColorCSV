# Changelog

## 1.0.1 (2026-10-15)

- Clarify read-only preview checks and the separate header-setting check in all five READMEs.
- Refresh Windows v1.0 development instructions and link to the performance report.
- Keep extension behavior unchanged from 1.0.0; screen reader speech remains unverified.

## 1.0.0 (2026-10-15)

- Add deterministic 1 MB and 10 MB synthetic CSV fixtures, a repeatable Node benchmark,
  and a CI performance smoke test.
- Cache preview metadata per parsed document and header setting so turning pages avoids
  rescanning the whole CSV.
- Record the measured v0.5 baseline, Windows results, and remaining verification limits.
- Verify the Windows VS Code 1.142 workflow with a 10 MB / 100,001-record CSV.

The 1.0.0 release was checked on Windows. Screen reader speech and macOS/Linux UI behavior
remain unverified. Large files are parsed in full in the extension host; the preview limits
only the number of rows in its Webview DOM.

## 0.5.0

- Add a read-only, keyboard accessible CSV table preview with 50 rows per page.
- Keep editor content, including unsaved changes, visible without writing to the source.
