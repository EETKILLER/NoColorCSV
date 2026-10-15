# NoColorCSV 1.0.1 release notes

This maintenance release updates the five language READMEs. It clarifies that checking
unsaved preview content and changing `nocolorcsv.hasHeader` are separate tests, replaces
outdated v0.3 development steps with the Windows v1.0 workflow, and links to the
performance report. Extension behavior and dependencies are unchanged from v1.0.0.

## Verification and limits

- `npm run compile`, `npm test`, and `npm run perf:smoke` passed on Windows for v1.0.1.
- The v1.0.0 Windows VS Code 1.142 functional and 10 MB performance checks remain the
  applicable UI evidence; see [the v1.0.0 notes](release-1.0.0.md) and
  [performance report](performance-v1-candidate.md).
- Narrator/NVDA speech and macOS/Linux UI behavior have not been tested. This release
  makes no new accessibility test claim.

## Install

Download `nocolorcsv-1.0.1.vsix` from the [v1.0.1 GitHub release](https://github.com/EETKILLER/NoColorCSV/releases/tag/v1.0.1).
In VS Code, open Extensions, select `…` → **Install from VSIX...**, and choose the file.
The extension declares VS Code `^1.85.0` compatibility.
