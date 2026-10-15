# Changelog

## Unreleased

- Add deterministic 1 MB and 10 MB synthetic CSV fixtures, a repeatable Node benchmark,
  and a CI performance smoke test.
- Cache preview metadata per parsed document and header setting so turning pages avoids
  rescanning the whole CSV.
- Record the measured v0.5 baseline, candidate results, and outstanding release checks.

## 0.5.0

- Add a read-only, keyboard accessible CSV table preview with 50 rows per page.
- Keep editor content, including unsaved changes, visible without writing to the source.
