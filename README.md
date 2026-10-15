# NoColorCSV

[English](README.md) · [简体中文](README.zh-CN.md) · [日本語](README.ja.md) · [한국어](README.ko.md) · [Español](README.es.md)

NoColorCSV is a VS Code extension for people with color vision differences and anyone who finds color coded columns difficult to distinguish. It identifies CSV cells through column numbers, headers, text previews, and keyboard navigation.

## See it in VS Code

These screenshots show the v0.1.3 status layout with [the included sample file](examples/sample.csv). The current status bar also shows the logical row; updated screenshots are pending.

**Current column:** With the cursor in `hello, world`, the status bar identifies column 3 and its `note` header.

![VS Code with the cursor in column 3; a magnified inset shows the status bar text CSV: column 3 of 3 · note](docs/images/column-status.png)

**Cell details:** Selecting the status bar item while the cursor is in `London, UK` shows the row, column, header, and cell value as text. The comma inside the quoted field does not start a new column.

![VS Code showing details for London, UK in column 2; a magnified inset shows the status bar text CSV: column 2 of 3 · city](docs/images/cell-details.png)

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

Open a `.csv` file and move the cursor. The status bar shows the logical row, current column, number of columns in that row, and the header when available. It also labels empty cells and unavailable headers. The current non-empty cell has a solid underline and edge mark; visible non-empty cells in the same column have dashed underlines and a different edge mark. Empty cells show only the edge mark. Select the status bar item to see the current cell's text details, or run a command from the Command Palette.

| Command | Windows / Linux | macOS |
| --- | --- | --- |
| NoColorCSV: Show Current Column | — | — |
| NoColorCSV: Go to Next Column | Ctrl+Alt+Shift+→ | Cmd+Alt+Shift+→ |
| NoColorCSV: Go to Previous Column | Ctrl+Alt+Shift+← | Cmd+Alt+Shift+← |
| NoColorCSV: Go to Next Row in Current Column | Ctrl+Alt+Shift+↓ | Cmd+Alt+Shift+↓ |
| NoColorCSV: Go to Previous Row in Current Column | Ctrl+Alt+Shift+↑ | Cmd+Alt+Shift+↑ |

Search for `NoColorCSV` in VS Code's **Keyboard Shortcuts** to change a shortcut. Row navigation skips rows that do not contain the target column.

The `nocolorcsv.hasHeader` setting treats the first CSV record as headers by default. Turn it off for files without a header row. Row numbers always start with the first record.

`nocolorcsv.columnFocus` defaults to `column`; set it to `cell` to mark only the current cell or `off` to remove all marks. `nocolorcsv.statusBar` defaults to `true`; turn it off to hide the status item. The **Show Current Column** command and keyboard navigation still work with either display setting off. An empty file has one cursor location; a final line ending does not add a logical row.

`nocolorcsv.columnSymbols` is off by default. When enabled, the current cell edge and status bar show its one-based column number with a repeating symbol. Eight symbols repeat: columns 1 and 9 share a shape but keep distinct numbers. The same-column marks stay compact. If a font cannot show a symbol, use the text column number in the status bar or **Show Current Column**.

`nocolorcsv.accessibilityPreset` offers `standard` (v0.2 appearance), `highContrast` (stronger focus borders, symbols, and a text focus hint), and `screenReader` (no focus marks or symbols by default; row, column, header, and value remain in text). It changes only this extension. Explicit `columnFocus`, `statusBar`, or `columnSymbols` settings override the preset defaults. To restore a preset default, remove that individual setting from your user or workspace settings.

Parsing supports quoted fields, commas and line breaks inside quotes, escaped double quotes, and UTF-8 BOM. The delimiter is the ASCII comma `,`; a full width comma `，` is treated as text.

## Develop

Requirements: [Visual Studio Code](https://code.visualstudio.com/) and Node.js 24.

```sh
npm ci
npm test
```

Open the repository in VS Code and press **F5** to launch the Extension Development Host. The debug configuration compiles TypeScript first. Open `examples/sample.csv`, move the cursor through a quoted comma and across rows, and check the marks and logical row in the status bar. Change `nocolorcsv.columnFocus` among `column`, `cell`, and `off`; turn `nocolorcsv.statusBar` off and use **Show Current Column**. Also try an empty cell, a multiline quoted cell, scrolling, and switching to a non-CSV file. Check at high zoom and in a high contrast theme. These actions should not change or save the CSV file.

For v0.3 validation, create a temporary CSV row with at least 20 columns and compare columns 1, 9, and 17; each should retain its number while the symbol repeats. Toggle symbols and all three presets in Settings, including an explicit `columnSymbols: false` with `highContrast`. Check a narrow editor, word wrap, 200% zoom, light/dark/high contrast themes, and screen reader reading of the status and **Show Current Column**. Check keyboard navigation on Windows, macOS, and Linux where available. Closing the CSV or switching to a non-CSV tab should clear marks. Compare the file before and after; the extension does not edit it.

Build an installable VSIX with:

```sh
npm run package
```

See [AGENTS.md](AGENTS.md) for development conventions and [LICENSE](LICENSE) for licensing terms.

## AI-Assisted Development

NoColorCSV is developed and maintained by EETKILLER with coding assistance from OpenAI Codex.
