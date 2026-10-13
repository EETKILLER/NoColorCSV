import * as vscode from 'vscode';
import { getColumnAtOffset } from './column';

function isCsvEditor(editor: vscode.TextEditor | undefined): editor is vscode.TextEditor {
  return editor !== undefined && /\.csv$/i.test(editor.document.uri.path);
}

function getCurrentColumn(editor: vscode.TextEditor): number {
  const textBeforeCursor = editor.document.getText(
    new vscode.Range(new vscode.Position(0, 0), editor.selection.active)
  );
  return getColumnAtOffset(textBeforeCursor, textBeforeCursor.length);
}

function hasFullwidthCommasWithoutCsvSeparators(editor: vscode.TextEditor): boolean {
  const line = editor.document.lineAt(editor.selection.active.line).text;
  return line.includes('，') && !line.includes(',');
}

export function activate(context: vscode.ExtensionContext): void {
  const statusBar = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Right, 100);
  statusBar.name = 'NoColorCSV current column';
  statusBar.command = 'nocolorcsv.showCurrentColumn';
  statusBar.tooltip = 'Click to show the current CSV column';

  const updateStatusBar = (editor: vscode.TextEditor | undefined): void => {
    if (!isCsvEditor(editor)) {
      statusBar.hide();
      return;
    }

    const column = getCurrentColumn(editor);
    const fullwidthCommaHint = column === 1 && hasFullwidthCommasWithoutCsvSeparators(editor);
    statusBar.text = fullwidthCommaHint
      ? 'CSV column: 1 · 全角逗号'
      : `CSV column: ${column}`;
    statusBar.tooltip = fullwidthCommaHint
      ? '这一行使用了全角逗号“，”。CSV 分隔符是半角逗号“,”。'
      : `Cursor: line ${editor.selection.active.line + 1}, character ${editor.selection.active.character + 1}. Click to show the CSV column.`;
    statusBar.show();
  };

  let pendingUpdate: ReturnType<typeof setTimeout> | undefined;
  const scheduleStatusBarUpdate = (editor: vscode.TextEditor): void => {
    if (pendingUpdate !== undefined) {
      clearTimeout(pendingUpdate);
    }
    pendingUpdate = setTimeout(() => {
      pendingUpdate = undefined;
      if (editor === vscode.window.activeTextEditor) {
        updateStatusBar(editor);
      }
    }, 75);
  };

  const command = vscode.commands.registerTextEditorCommand(
    'nocolorcsv.showCurrentColumn',
    (editor) => {
      if (!isCsvEditor(editor)) {
        void vscode.window.showWarningMessage('The active file is not a CSV file.');
        return;
      }

      const column = getCurrentColumn(editor);
      if (column === 1 && hasFullwidthCommasWithoutCsvSeparators(editor)) {
        void vscode.window.showInformationMessage(
          'Current column: 1. 检测到全角逗号“，”；CSV 分隔符应使用半角逗号“,”。'
        );
        return;
      }

      const { line, character } = editor.selection.active;
      void vscode.window.showInformationMessage(
        `Current column: ${column} (cursor: line ${line + 1}, character ${character + 1})`
      );
    }
  );

  context.subscriptions.push(
    command,
    statusBar,
    {
      dispose: () => {
        if (pendingUpdate !== undefined) {
          clearTimeout(pendingUpdate);
        }
      }
    },
    vscode.window.onDidChangeActiveTextEditor(updateStatusBar),
    vscode.window.onDidChangeTextEditorSelection((event) => {
      scheduleStatusBarUpdate(event.textEditor);
    }),
    vscode.workspace.onDidChangeTextDocument((event) => {
      if (event.document === vscode.window.activeTextEditor?.document) {
        scheduleStatusBarUpdate(vscode.window.activeTextEditor);
      }
    })
  );

  updateStatusBar(vscode.window.activeTextEditor);
}

export function deactivate(): void {}
