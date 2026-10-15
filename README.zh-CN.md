# NoColorCSV

[English](README.md) · [简体中文](README.zh-CN.md) · [日本語](README.ja.md) · [한국어](README.ko.md) · [Español](README.es.md)

NoColorCSV 是面向色觉障碍人士及其他不便依赖颜色区分列的用户开发的 VS Code CSV 阅读扩展。它通过列编号、表头、单元格内容摘要和键盘导航，帮助用户在原始文本中定位数据。

## VS Code 实机展示

以下截图展示使用[示例文件](examples/sample.csv)拍摄的 v0.1.3 状态栏。当前版本还显示逻辑行号；新版截图待补。

**当前列：**光标位于 `hello, world` 时，状态栏显示第 3 列及表头 `note`。

![VS Code 中光标位于第三列；放大框显示状态栏文字 CSV: column 3 of 3 · note](docs/images/column-status.png)

**单元格详情：**光标位于 `London, UK` 时，点击状态栏可用文字查看行号、列号、表头和单元格内容。引号内的逗号不会被当作分隔符。

![VS Code 中显示第 2 列 London, UK 的详情；放大框显示状态栏文字 CSV: column 2 of 3 · city](docs/images/cell-details.png)

## 与 Rainbow CSV 的区别

[Rainbow CSV](https://github.com/mechatroner/vscode_rainbow_csv) 为不同列提供颜色高亮，也提供状态栏列信息、悬停提示、对齐、数据查询等功能。NoColorCSV 专注于无需辨别列颜色的阅读流程：

| | NoColorCSV | Rainbow CSV |
| --- | --- | --- |
| 列识别 | 在状态栏和命令提示中明确显示列编号、表头与内容摘要 | 以不同颜色高亮列，并提供状态栏与悬停信息 |
| 键盘操作 | 在相邻列之间移动，或沿同一列逐行移动 | 提供列跟踪、多光标编辑等工具 |
| 文件范围 | 以半角逗号分隔的 `.csv` 文件 | 支持 CSV、TSV 等多种分隔格式 |
| 数据工具 | 聚焦阅读与定位 | 提供对齐、CSVLint 和 RBQL 查询等功能 |

两款扩展服务于不同的使用需求。NoColorCSV 不修改 CSV 内容，也不为列添加颜色。

## 安装

从 [最新版本](https://github.com/EETKILLER/NoColorCSV/releases/latest)下载 `.vsix` 文件。在 VS Code 的**扩展**视图中打开 `…` 菜单，选择**从 VSIX 安装...**，然后选择下载的文件。

## 使用

打开 `.csv` 文件并移动光标。状态栏会显示逻辑行号、当前列编号、该行列数及可用表头，并标明空单元格或缺失表头。非空的当前单元格以实线下划线和边缘标记聚焦，可见范围内同列非空单元格以虚线下划线和不同标记提示；空单元格只显示边缘标记。点击状态栏可查看文字详情，也可通过命令面板运行下列命令。

| 中文界面中的命令 | 英文界面中的命令 | Windows / Linux 快捷键 | macOS 快捷键 |
| --- | --- | --- | --- |
| NoColorCSV: 显示当前列信息 | NoColorCSV: Show Current Column | — | — |
| NoColorCSV: 转到下一列 | NoColorCSV: Go to Next Column | Ctrl+Alt+Shift+→ | Cmd+Alt+Shift+→ |
| NoColorCSV: 转到上一列 | NoColorCSV: Go to Previous Column | Ctrl+Alt+Shift+← | Cmd+Alt+Shift+← |
| NoColorCSV: 转到本列下一行 | NoColorCSV: Go to Next Row in Current Column | Ctrl+Alt+Shift+↓ | Cmd+Alt+Shift+↓ |
| NoColorCSV: 转到本列上一行 | NoColorCSV: Go to Previous Row in Current Column | Ctrl+Alt+Shift+↑ | Cmd+Alt+Shift+↑ |

快捷键可在 VS Code 的**键盘快捷方式**中搜索 `NoColorCSV` 后修改。跨行导航会跳过缺少目标列的行。

设置 `nocolorcsv.hasHeader` 默认开启，将第一条 CSV 记录用作表头；无表头文件可关闭此设置。行号始终从第一条记录开始计数。

`nocolorcsv.columnFocus` 默认为 `column`；改为 `cell` 仅标记当前单元格，改为 `off` 关闭标记。`nocolorcsv.statusBar` 默认为 `true`；关闭后隐藏状态栏项目。无论哪项显示设置关闭，“显示当前列信息”命令和键盘导航仍可用。空文件保留一个光标位置；末尾换行不新增逻辑行。

`nocolorcsv.columnSymbols` 默认关闭。开启后，当前单元格边缘和状态栏会同时显示从 1 开始的列号与循环符号。八个符号循环使用：第 1 列和第 9 列符号相同，但列号不同。同列其他单元格仍使用简短标记。若字体无法显示符号，请以状态栏或“显示当前列信息”命令中的文字列号为准。

`nocolorcsv.accessibilityPreset` 可选 `standard`（沿用 v0.2 外观）、`highContrast`（更明显的焦点边框、符号和文字提示）、`screenReader`（默认关闭焦点标记与符号，保留行号、列号、表头和值的文字信息）。预设只改变本扩展。显式设置的 `columnFocus`、`statusBar` 或 `columnSymbols` 优先于预设默认值。要恢复预设默认值，请从用户或工作区设置中删除对应单项设置。

解析支持双引号字段、字段内的逗号与换行、转义双引号和 UTF-8 BOM。分隔符为半角逗号 `,`；全角逗号 `，` 会被视为普通文本。

## 开发

需要 [Visual Studio Code](https://code.visualstudio.com/) 和 Node.js 24。

```sh
npm ci
npm test
```

在 VS Code 中打开仓库，按 **F5** 启动扩展开发宿主。调试配置会先编译 TypeScript。打开 `examples/sample.csv`，把光标移过引号内逗号并跨行移动，检查焦点标记和状态栏逻辑行号。依次切换 `nocolorcsv.columnFocus` 的 `column`、`cell`、`off`，关闭 `nocolorcsv.statusBar` 后运行“显示当前列信息”。再检查空字段、引号内换行、滚动和切换到非 CSV 文件，并在高缩放及高对比度主题下查看。操作不应更改或保存 CSV 文件。

验证 v0.3 时，可新建一行至少 20 列的临时 CSV，比较第 1、9、17 列：符号会重复，列号不能混淆。在设置中切换符号和三个预设，并试试在 `highContrast` 下显式关闭 `columnSymbols`。检查窄编辑器、自动换行、200% 缩放、浅色/深色/高对比度主题，以及屏幕阅读器朗读状态栏和“显示当前列信息”。在可用的 Windows、macOS、Linux 上检查键盘导航。关闭 CSV 或切到非 CSV 标签后，标记应清除。前后比较文件内容；扩展不应编辑文件。

生成可安装的 VSIX：

```sh
npm run package
```

项目约定见 [AGENTS.md](AGENTS.md)，许可证见 [LICENSE](LICENSE)。

## AI 辅助开发

NoColorCSV 由 EETKILLER 开发和维护，OpenAI Codex 提供代码编写辅助。
