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

## Measurements outside this report

The Windows host run below measures status updates, four navigation directions, preview
opening and closing, a process working-set snapshot, and source-byte stability. It does
not include a same-host v0.5 UI run, peak heap profiling, non-CSV idle CPU, or spoken
output from Windows Narrator/NVDA. macOS and Linux testing is outside the requested
1.0 release scope. These gaps are stated in the release notes rather than treated as
passed measurements.

## Windows VS Code 1.142 host check

On the same Windows machine, a development host opened the 10 MB / 100,001-record fixture.
The first preview screen after opening the editor appeared in 244 ms; the status bar may
already have populated the parse cache. Its DOM held 50 rows.
Page Down showed page 2 of 2,001, still with 50 DOM rows. The source SHA-256 was unchanged.
The host also showed the unsaved-content notice after an edit, removed it after Undo, and
replaced `name / city / note` with generated `Column 1 / 2 / 3` labels when `hasHeader` was
turned off. The on-disk source remained unchanged.

With five warmups and 30 timed repetitions of each operation, CDP-driven host measurements
gave the following median / p95 in milliseconds. They include automation round trips and
the editor update path:

| Operation | Median | p95 |
| --- | ---: | ---: |
| Next column | 22.2 | 38.5 |
| Previous column | 20.6 | 30.8 |
| Next row | 18.8 | 26.7 |
| Previous row | 22.2 | 37.8 |
| Cursor to status (75 ms debounce included) | 105.5 | 111.3 |
| Open preview from cached parse | 172.9 | 262.3 |

The isolated extension host's working set was approximately 164 MiB with a small CSV and
251 MiB after the 10 MB file and 35 preview open/close cycles, a difference of about 87 MiB.
This is a process snapshot, not peak or retained heap profiling. The 10 MB source stayed
open, so its parsed cache remained live. No sustained unresponsive period was observed.
These checks cover Windows UI behavior and measured paths; they do not constitute a Windows
Narrator/NVDA speech test. macOS and Linux were outside the requested release scope.

The Node benchmark passes the 1.5 s cold parse gate and shows no material timing
regression in the operations it measures. Windows host measurements meet the initial
status, navigation, preview and observed resident-memory targets. Screen reader speech,
peak memory, idle CPU, and a same-host v0.5 UI benchmark were not measured; these limits
are disclosed in the release notes.
