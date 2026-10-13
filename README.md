# NoColorCSV

[English](README.md) · [简体中文](README.zh-CN.md) · [日本語](README.ja.md) · [한국어](README.ko.md) · [Español](README.es.md)

NoColorCSV is a VS Code extension for people with color vision differences and anyone who finds color coded columns difficult to distinguish. It identifies CSV cells through column numbers, headers, text previews, and keyboard navigation.

## See it in VS Code

These screenshots show NoColorCSV running with [the included sample file](examples/sample.csv). The interface is shown in English; the extension also provides localized interface text.

**Current column:** With the cursor in `hello, world`, the status bar identifies column 3 and its `note` header.

![VS Code showing a CSV file with the cursor in the third column and NoColorCSV identifying column 3 and the note header in the status bar](docs/images/column-status.png)

**Cell details:** Selecting the status bar item while the cursor is in `London, UK` shows the row, column, header, and cell value as text. The comma inside the quoted field does not start a new column.

![VS Code showing NoColorCSV cell details for the quoted value London, UK in column 2 under the city header](docs/images/cell-details.png)

## How it differs from Rainbow CSV

[Rainbow CSV](https://github.com/mechatroner/vscode_rainbow_csv) highlights columns in distinct colors and also offers column information in the status bar and on hover, alignment, queries, and other data tools. NoColorCSV focuses on reading CSV without having to distinguish column colors.

| | NoColorCSV | Rainbow CSV |
| --- | --- | --- |
| Identifying columns | Explicit column number, header, and cell preview in text | Color highlighting, with status bar and hover information |
| Keyboard workflow | Move between adjacent columns or follow a column across rows | Column tracking and multi cursor editing tools |
| File formats | Comma separated `.csv` files | CSV, TSV, and other delimiter formats |
| Data tools | Reading and locating cells | Alignment, CSVLint, and RBQL queries |

NoColorCSV does not change CSV content or add color to columns.

## Install

Download the `.vsix` file from the [latest release](https://github.com/EETKILLER/NoColorCSV/releases/latest). In VS Code, open the **Extensions** view, select `…` → **Install from VSIX...**, and choose the downloaded file.

## Use

Open a `.csv` file and move the cursor. The status bar shows the current column number, the number of columns in that row, and the header when available. Select the status bar item to see the current cell's text details, or run a command from the Command Palette.

| Command | Windows / Linux | macOS |
| --- | --- | --- |
| NoColorCSV: Show Current Column | — | — |
| NoColorCSV: Go to Next Column | Ctrl+Alt+Shift+→ | Cmd+Alt+Shift+→ |
| NoColorCSV: Go to Previous Column | Ctrl+Alt+Shift+← | Cmd+Alt+Shift+← |
| NoColorCSV: Go to Next Row in Current Column | Ctrl+Alt+Shift+↓ | Cmd+Alt+Shift+↓ |
| NoColorCSV: Go to Previous Row in Current Column | Ctrl+Alt+Shift+↑ | Cmd+Alt+Shift+↑ |

Search for `NoColorCSV` in VS Code's **Keyboard Shortcuts** to change a shortcut. Row navigation skips rows that do not contain the target column.

The `nocolorcsv.hasHeader` setting treats the first CSV record as headers by default. Turn it off for files without a header row. Row numbers always start with the first record.

Parsing supports quoted fields, commas and line breaks inside quotes, escaped double quotes, and UTF-8 BOM. The delimiter is the ASCII comma `,`; a full width comma `，` is treated as text.

## Develop

Requirements: [Visual Studio Code](https://code.visualstudio.com/) and Node.js 24.

```sh
npm ci
npm test
```

Open the repository in VS Code and press **F5** to launch the Extension Development Host. The debug configuration compiles TypeScript first. Use `examples/sample.csv` to check column detection and navigation.

Build an installable VSIX with:

```sh
npm run package
```

See [AGENTS.md](AGENTS.md) for development conventions and [LICENSE](LICENSE) for licensing terms.
