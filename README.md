# NoColorCSV

NoColorCSV 是一款 VS Code CSV 阅读插件。它使用文字显示列编号、表头和单元格内容，并提供键盘导航，让识别列不依赖颜色。

## 功能

- 光标移动时，状态栏显示当前列编号、该行列数和表头；点击状态栏可查看完整信息。
- 命令 **NoColorCSV: Show Current Column** 显示逻辑行、列编号、表头和当前单元格内容。
- 在列之间移动，或跳到上一行、下一行的同一列。目标行缺少该列时会继续寻找可用的行。
- 解析半角逗号分隔的 CSV，支持双引号字段、字段中的逗号和换行、两个双引号表示的转义引号，以及 UTF-8 BOM。
- 对只包含全角逗号 `，` 的行显示提示。全角逗号是文本，不是 CSV 分隔符。
- 扩展在本地处理已打开的 CSV 文本，不发送文件内容或遥测数据。

仅文件名以 `.csv` 结尾的文本文件会显示列信息。行号从 1 开始，启用表头时第一条记录仍算第 1 行。光标位于分隔逗号之前时属于前一列，位于逗号之后时属于后一列。

## 安装 VSIX

从 [GitHub Releases](https://github.com/EETKILLER/NoColorCSV/releases) 下载 `.vsix` 文件。在 VS Code 的“扩展”视图中点击右上角 `…`，选择 **从 VSIX 安装...**，再选择下载的文件。也可以在终端运行：

```sh
code --install-extension nocolorcsv-0.1.0.vsix
```

安装后打开 `.csv` 文件即可使用。当前版本通过 VSIX 分发，尚未发布到 VS Code Marketplace。

## 命令与快捷键

在 CSV 编辑器中按 **Ctrl+Shift+P**（macOS 为 **Cmd+Shift+P**），输入下列命令。命令需要从 VS Code 命令面板运行，不要输入到 PowerShell 终端。

| 命令 | Windows / Linux | macOS |
| --- | --- | --- |
| Show Current Column | 从命令面板运行 | 从命令面板运行 |
| Next Column | Ctrl+Alt+Shift+右箭头 | Cmd+Alt+Shift+右箭头 |
| Previous Column | Ctrl+Alt+Shift+左箭头 | Cmd+Alt+Shift+左箭头 |
| Next Row in Current Column | Ctrl+Alt+Shift+下箭头 | Cmd+Alt+Shift+下箭头 |
| Previous Row in Current Column | Ctrl+Alt+Shift+上箭头 | Cmd+Alt+Shift+上箭头 |

如果快捷键与系统或其他扩展冲突，可以在 VS Code 的“键盘快捷方式”中搜索 `NoColorCSV` 并修改。移动命令会把光标放在目标字段的内容开头，并显示该单元格的文字信息。

设置 `nocolorcsv.hasHeader` 默认为 `true`，即把第一条 CSV 记录作为表头。没有表头的文件可在 VS Code 设置中关闭它；列编号与导航仍可使用。

## 开发与 F5 调试

需要 [Visual Studio Code](https://code.visualstudio.com/) 和 Node.js 24。在仓库根目录运行：

```sh
npm ci
npm run compile
```

用 VS Code 打开仓库文件夹，按 **F5**，选择 **Run NoColorCSV Extension**。编辑器会先编译 TypeScript，再打开 Extension Development Host 窗口。在新窗口中打开 `examples/sample.csv`，把光标放到 `London` 上，运行 **NoColorCSV: Show Current Column**，应看到第 2 列和表头 `city`；把光标放到 `hello` 上，应看到第 3 列和表头 `note`。

修改代码后，在调试工具栏重启扩展宿主。

## 测试与打包

```sh
npm test
npm run package
```

`npm test` 会先编译，再运行 CSV 解析与导航的单元测试。`npm run package` 会编译并生成可安装的 `nocolorcsv-0.1.0.vsix`。编译产物 `out/`、依赖 `node_modules/` 和 VSIX 文件不会提交到 Git。GitHub Actions 对拉取请求执行 `npm ci` 和 `npm test`。

## 贡献与许可

开发约定见 [AGENTS.md](AGENTS.md)。本项目使用 [MIT 许可证](LICENSE)。
