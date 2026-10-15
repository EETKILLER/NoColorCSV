# v1.0 performance candidate (2026-10-15)

This is a reproducible Node benchmark, not a completed v1.0 release gate. It compares the
v0.5.0 code at `851b251` with the preview metadata cache on the same Windows machine.

## Reproduce

Use Node 24 and run `npm ci`, `npm run perf:fixtures`, `npm run perf:smoke`, and `npm run perf`.
The generator uses seed `1549541414`, 20 ASCII comma separated columns, LF line endings,
and four ASCII characters per data cell. It writes only synthetic data under ignored
`.perf-fixtures/`. The 1 MB sample is 1,000,100 bytes and 10,001 logical records; the
10 MB sample is 10,000,100 bytes and 100,001 logical records, including the header.
The third fixture covers BOM, Chinese and accented text, quoted CRLF, escaped quotes,
and an unclosed quote. The generator reports SHA-256 hashes so each run can be checked.

Each metric has five warmups and 30 timed repetitions. Cold parsing runs a GC before each
timed parse; GC is outside the timing. The cache, focus, navigation, validation and preview
metrics reuse one parsed 10 MB snapshot. `previewFirstCold` creates a new metadata cache
entry while reusing the parsed snapshot. RSS is measured before and after a retained parse,
not at the peak of every iteration.

Reference machine: Windows 10.0.26100 x64, Intel Core i7-14650HX (24 logical CPUs),
15.6 GiB RAM, Node 24.15.0. Times are milliseconds.

| Node operation | v0.5 median | v0.5 p95 | Candidate median | Candidate p95 |
| --- | ---: | ---: | ---: | ---: |
| 10 MB cold parse | 82.665 | 91.692 | 78.039 | 90.580 |
| Cached locate | 0.001 | 0.017 | 0.001 | 0.017 |
| Visible focus | 0.008 | 0.017 | 0.008 | 0.017 |
| Next column | 0.000 | 0.001 | 0.001 | 0.002 |
| Next row | 0.000 | 0.005 | 0.001 | 0.004 |
| Validation | 2.686 | 4.833 | 2.096 | 4.080 |
| Preview first page, cold metadata | approximately 5.822 | approximately 7.678 | 3.866 | 5.443 |
| Preview first page, repeated | 5.822 | 7.678 | 0.044 | 0.082 |
| Preview later page | 7.409 | 11.372 | 0.042 | 0.053 |

The baseline retained-parse RSS delta was 207 MiB and the candidate delta was 208 MiB.
The latter is a Node process measurement and does not establish the extension host's
200 MiB gate. Small submillisecond values are affected by timer resolution and run noise.
This benchmark does not include the 75 ms editor debounce, Webview DOM work or VS Code
extension host memory. The preview's initial parse is measured separately from its
first page conversion; add both to estimate Node processing, not user visible latency.

## Remaining release checks

- Measure 30 extension host iterations for cursor to status, four navigation directions,
  preview open/scroll/close, idle and peak memory, plus non-CSV idle CPU. Record VS Code
  version, OS, process memory and p95. Repeat on the same machine at v0.5 and candidate.
- Test a 10 MB document for sustained responsiveness in VS Code. Validate focus,
  diagnostics and preview against source bytes and dirty state before and after.
- Complete Windows Narrator or NVDA and macOS VoiceOver passes. Check keyboard access,
  light/dark/high contrast, 200% zoom, long values, narrow windows and symbol fallback.
  Record any blocking defects and their fixes.
- Keep `package.json` at 0.5.0 until all release gates pass. Then update version, lockfile,
  five READMEs, changelog, package manifest and release notes; verify the VSIX, CI,
  SHA-256 and source commit before tagging and publishing.

The local Node benchmark passes the 1.5 s cold parse gate and shows no material timing
regression in the operations it measures. The v1.0 release criteria remain open.
