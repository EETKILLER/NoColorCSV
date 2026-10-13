# NoColorCSV

[English](README.md) · [简体中文](README.zh-CN.md) · [日本語](README.ja.md) · [한국어](README.ko.md) · [Español](README.es.md)

NoColorCSV は、色覚障害・色覚特性のある方や、色だけで列を区別しにくい方のための VS Code 用 CSV 閲覧拡張機能です。列番号、見出し、セル内容のプレビュー、キーボード操作を使って、テキスト上のデータを把握できます。

## VS Code での動作画面

以下は、付属の[サンプルファイル](examples/sample.csv)を VS Code で開き、拡張機能を実際に動かして撮影した画面です。

**現在の列：**カーソルが `hello, world` にあるとき、ステータスバーに 3 列目と見出し `note` が表示されます。

![VS Code でカーソルが 3 列目にあり、拡大枠にステータスバーの CSV: column 3 of 3 · note が表示された画面](docs/images/column-status.png)

**セルの詳細：**カーソルが `London, UK` にあるとき、ステータスバーの項目を選ぶと、行番号、列番号、見出し、セルの内容が文字で表示されます。引用符内のカンマは区切り文字になりません。

![VS Code で 2 列目の London, UK の詳細を表示し、拡大枠にステータスバーの CSV: column 2 of 3 · city が表示された画面](docs/images/cell-details.png)

## Rainbow CSV との違い

[Rainbow CSV](https://github.com/mechatroner/vscode_rainbow_csv) は列を異なる色で強調し、ステータスバーやホバーでの列情報、列の整列、クエリなども提供します。NoColorCSV は、列の色を見分けずに CSV を読む操作に重点を置いています。

| | NoColorCSV | Rainbow CSV |
| --- | --- | --- |
| 列の識別 | 列番号、見出し、セルのプレビューを文字で表示 | 色分け表示に加え、ステータスバーとホバーで列情報を表示 |
| キーボード操作 | 隣の列への移動と、同じ列をたどる行移動 | 列の追跡と複数カーソル編集など |
| 対応形式 | カンマ区切りの `.csv` | CSV、TSV などの区切り形式 |
| データ処理 | 閲覧とセルの位置確認 | 整列、CSVLint、RBQL クエリなど |

NoColorCSV は CSV の内容を変更せず、列の色分けも行いません。

## インストール

[最新リリース](https://github.com/EETKILLER/NoColorCSV/releases/latest)から `.vsix` ファイルをダウンロードします。VS Code の**拡張機能**ビューで `…` → **VSIX からのインストール...** を選び、ダウンロードしたファイルを指定してください。

## 使い方

`.csv` ファイルを開いてカーソルを移動すると、ステータスバーに現在の列番号、その行の列数、見出しが表示されます。ステータスバーの項目を選ぶと、現在のセルの情報を文字で確認できます。コマンドパレットからも操作できます。

| コマンド | Windows / Linux | macOS |
| --- | --- | --- |
| NoColorCSV: 現在の列情報を表示 | — | — |
| NoColorCSV: 次の列に移動 | Ctrl+Alt+Shift+→ | Cmd+Alt+Shift+→ |
| NoColorCSV: 前の列に移動 | Ctrl+Alt+Shift+← | Cmd+Alt+Shift+← |
| NoColorCSV: 同じ列の次の行に移動 | Ctrl+Alt+Shift+↓ | Cmd+Alt+Shift+↓ |
| NoColorCSV: 同じ列の前の行に移動 | Ctrl+Alt+Shift+↑ | Cmd+Alt+Shift+↑ |

ショートカットは VS Code の**キーボード ショートカット**で `NoColorCSV` を検索して変更できます。行移動では、対象の列がない行を飛ばします。

設定 `nocolorcsv.hasHeader` は、初期状態で最初の CSV レコードを見出しとして扱います。見出しのないファイルでは無効にしてください。行番号は常に最初のレコードから数えます。

引用符で囲まれたフィールド、引用符内のカンマと改行、二重引用符のエスケープ、UTF-8 BOM に対応しています。区切り文字は半角カンマ `,` です。全角カンマ `，` は通常の文字として扱います。

## 開発

[Visual Studio Code](https://code.visualstudio.com/) と Node.js 24 が必要です。

```sh
npm ci
npm test
```

VS Code でリポジトリを開き、**F5** を押すと拡張機能の開発用ウィンドウが起動します。起動前に TypeScript がコンパイルされます。`examples/sample.csv` で列の判定と移動を確認できます。

インストール可能な VSIX を作成するには、次を実行します。

```sh
npm run package
```

開発方針は [AGENTS.md](AGENTS.md)、ライセンスは [LICENSE](LICENSE) を参照してください。

## AI 支援による開発

NoColorCSV の開発と保守は EETKILLER が行い、OpenAI Codex がコーディングを支援しています。
