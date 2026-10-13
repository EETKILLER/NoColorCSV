# NoColorCSV

NoColorCSV 是一个面向色觉差异用户的 VS Code CSV 阅读插件。当前版本提供列编号提示，让你无需依赖颜色也能确认光标所在列。

## 已实现的功能

- 命令面板中的 **NoColorCSV: Show Current Column** 显示光标所在的列编号，从 1 开始计数。
- 打开 `.csv` 文件后，状态栏会显示 `CSV column: 1` 等文字，并随光标移动更新；点击它也可运行命令。
- 正确识别双引号字段中的逗号、两个双引号表示的转义引号，以及双引号字段中的换行。
- 光标位于分隔逗号之前时属于前一列，位于逗号之后时属于后一列。
- CSV 分隔符必须是半角逗号 `,`；全角中文逗号 `，` 是普通文本。如果一行只有全角逗号，状态栏和命令会给出提示。
- 当前仅针对文件名以 `.csv` 结尾的文件；其他文件会显示提示。

## 开发环境与安装

需要安装 [Visual Studio Code](https://code.visualstudio.com/) 和 Node.js 20 或更新版本。克隆仓库后，在仓库根目录运行：

```sh
npm ci
npm run compile
```

`npm ci` 根据 `package-lock.json` 安装开发依赖。无需先将插件发布到扩展商店。

## 在 VS Code 中运行

1. 用 VS Code 打开本仓库文件夹。
2. 按 **F5**，或在“运行和调试”中选择 **Run NoColorCSV Extension**。VS Code 会先编译 TypeScript，再打开一个 Extension Development Host 窗口。
3. 在新窗口中打开仓库自带的 `examples/sample.csv`。开发宿主会自动打开本仓库文件夹。
4. 把光标放在 `London` 上，按 **Ctrl+Shift+P**（macOS 为 **Cmd+Shift+P**），运行 **NoColorCSV: Show Current Column**。应看到 `Current column: 2`；放在 `hello` 上应看到第 3 列。
   命令应从 VS Code 的命令面板运行，不要输入到下方的 PowerShell 终端。移动光标时也可以直接看状态栏的 `CSV column` 数字。
5. 修改代码后，重新按 F5 或在调试工具栏中重启扩展宿主。

## 构建与测试

```sh
npm run compile
npm test
```

`npm test` 会先编译，再使用 Node.js 内置测试运行器执行列定位单元测试。编译产物在 `out/`，不会提交到 Git。

## 当前范围

插件目前只显示当前列的编号，尚不提供表格视图、列标题朗读或其他辅助导航。列定位按常见 CSV 引号规则解析文本；对于格式错误的 CSV，结果以已读取文本为准。

## 贡献

开发约定见 [AGENTS.md](AGENTS.md)。本项目使用 [MIT 许可证](LICENSE)。
