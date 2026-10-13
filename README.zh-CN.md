# NoColorCSV

[English](README.md) · [简体中文](README.zh-CN.md) · [日本語](README.ja.md) · [한국어](README.ko.md) · [Español](README.es.md)

NoColorCSV 是面向色觉障碍人士及其他不便依赖颜色区分列的用户开发的 VS Code CSV 阅读扩展。它通过列编号、表头、单元格内容摘要和键盘导航，帮助用户在原始文本中定位数据。

## VS Code 实机展示

以下截图使用仓库中的[示例文件](examples/sample.csv)在 VS Code 中实际运行扩展拍摄。截图界面为英文；扩展也提供本地化界面文字。

**当前列：**光标位于 `hello, world` 时，状态栏显示第 3 列及表头 `note`。

![VS Code 中打开 CSV，光标位于第三列，NoColorCSV 状态栏显示第 3 列和 note 表头](docs/images/column-status.png)

**单元格详情：**光标位于 `London, UK` 时，点击状态栏可用文字查看行号、列号、表头和单元格内容。引号内的逗号不会被当作分隔符。

![VS Code 中 NoColorCSV 显示 city 表头下第 2 列的 London, UK 单元格详情](docs/images/cell-details.png)

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

打开 `.csv` 文件并移动光标。状态栏会显示当前列编号、该行列数及表头；点击状态栏可查看当前单元格的文字信息。也可以通过命令面板运行下列命令。

| 中文界面中的命令 | 英文界面中的命令 | Windows / Linux 快捷键 | macOS 快捷键 |
| --- | --- | --- | --- |
| NoColorCSV: 显示当前列信息 | NoColorCSV: Show Current Column | — | — |
| NoColorCSV: 转到下一列 | NoColorCSV: Go to Next Column | Ctrl+Alt+Shift+→ | Cmd+Alt+Shift+→ |
| NoColorCSV: 转到上一列 | NoColorCSV: Go to Previous Column | Ctrl+Alt+Shift+← | Cmd+Alt+Shift+← |
| NoColorCSV: 转到本列下一行 | NoColorCSV: Go to Next Row in Current Column | Ctrl+Alt+Shift+↓ | Cmd+Alt+Shift+↓ |
| NoColorCSV: 转到本列上一行 | NoColorCSV: Go to Previous Row in Current Column | Ctrl+Alt+Shift+↑ | Cmd+Alt+Shift+↑ |

快捷键可在 VS Code 的**键盘快捷方式**中搜索 `NoColorCSV` 后修改。跨行导航会跳过缺少目标列的行。

设置 `nocolorcsv.hasHeader` 默认开启，将第一条 CSV 记录用作表头；无表头文件可关闭此设置。行号始终从第一条记录开始计数。

解析支持双引号字段、字段内的逗号与换行、转义双引号和 UTF-8 BOM。分隔符为半角逗号 `,`；全角逗号 `，` 会被视为普通文本。

## 开发

需要 [Visual Studio Code](https://code.visualstudio.com/) 和 Node.js 24。

```sh
npm ci
npm test
```

在 VS Code 中打开仓库，按 **F5** 启动扩展开发宿主。调试配置会先编译 TypeScript。可使用 `examples/sample.csv` 检查列定位与导航。

生成可安装的 VSIX：

```sh
npm run package
```

项目约定见 [AGENTS.md](AGENTS.md)，许可证见 [LICENSE](LICENSE)。
