import * as vscode from 'vscode';
import {
  adjacentColumnOffset,
  adjacentRowOffset,
  CsvCellContext,
  CsvDocument,
  getCellContext,
  parseCsv
} from './csv';

const parsedDocuments = new WeakMap<vscode.TextDocument, { version: number; csv: CsvDocument }>();

function isCsvEditor(editor: vscode.TextEditor | undefined): editor is vscode.TextEditor {
  return editor !== undefined && /\.csv$/i.test(editor.document.uri.path);
}

function parsedCsv(document: vscode.TextDocument): CsvDocument {
  const cached = parsedDocuments.get(document);
  if (cached?.version === document.version) {
    return cached.csv;
  }
  const csv = parseCsv(document.getText());
  parsedDocuments.set(document, { version: document.version, csv });
  return csv;
}

function hasHeader(): boolean {
  return vscode.workspace.getConfiguration('nocolorcsv').get<boolean>('hasHeader', true);
}

function currentContext(editor: vscode.TextEditor): { csv: CsvDocument; cell: CsvCellContext } {
  const csv = parsedCsv(editor.document);
  const offset = editor.document.offsetAt(editor.selection.active);
  return { csv, cell: getCellContext(csv, offset, hasHeader()) };
}

function shortText(value: string, limit: number): string {
  const flattened = value.replace(/\s+/g, ' ').trim();
  return flattened.length > limit ? `${flattened.slice(0, limit - 1)}…` : flattened;
}

function cellDescription(cell: CsvCellContext): string {
  const parts = [vscode.l10n.t('Row {0}, column {1} of {2}',
    cell.rowIndex + 1, cell.columnIndex + 1, cell.columnCount)];
  if (cell.header) {
    parts.push(vscode.l10n.t('Header: {0}', shortText(cell.header, 60)));
  }
  const value = shortText(cell.value, 120);
  parts.push(value ? vscode.l10n.t('Value: {0}', value) : vscode.l10n.t('Empty cell'));
  return parts.join(' · ');
}

function hasFullwidthCommaHint(editor: vscode.TextEditor, cell: CsvCellContext): boolean {
  if (cell.columnCount !== 1) {
    return false;
  }
  const line = editor.document.lineAt(editor.selection.active.line).text;
  return line.includes('，') && !line.includes(',');
}

export function activate(context: vscode.ExtensionContext): void {
  const statusBar = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Right, 100);
  statusBar.name = vscode.l10n.t('NoColorCSV current cell');
  statusBar.command = 'nocolorcsv.showCurrentColumn';

  const updateStatusBar = (editor: vscode.TextEditor | undefined): void => {
    if (!isCsvEditor(editor)) {
      statusBar.hide();
      return;
    }
    const { cell } = currentContext(editor);
    const header = cell.header ? ` · ${shortText(cell.header, 30)}` : '';
    const fullwidthHint = hasFullwidthCommaHint(editor, cell);
    const hint = fullwidthHint ? ` · ${vscode.l10n.t('Full-width comma')}` : '';
    statusBar.text = `${vscode.l10n.t('CSV: column {0} of {1}',
      cell.columnIndex + 1, cell.columnCount)}${header}${hint}`;
    statusBar.tooltip = fullwidthHint
      ? `${cellDescription(cell)} · ${vscode.l10n.t("Full-width commas are text; use ',' to separate CSV columns.")}`
      : cellDescription(cell);
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

  const showColumn = vscode.commands.registerTextEditorCommand(
    'nocolorcsv.showCurrentColumn',
    (editor) => {
      if (!isCsvEditor(editor)) {
        void vscode.window.showWarningMessage(vscode.l10n.t('Open a CSV file to use this command.'));
        return;
      }
      const { cell } = currentContext(editor);
      const hint = hasFullwidthCommaHint(editor, cell)
        ? ` · ${vscode.l10n.t("Full-width commas are text; use ',' to separate CSV columns.")}`
        : '';
      void vscode.window.showInformationMessage(`${cellDescription(cell)}${hint}`);
    }
  );

  const move = (kind: 'column' | 'row', direction: -1 | 1): ((editor: vscode.TextEditor) => void) =>
    (editor) => {
      if (!isCsvEditor(editor)) {
        void vscode.window.showWarningMessage(vscode.l10n.t('Open a CSV file to use this command.'));
        return;
      }
      const csv = parsedCsv(editor.document);
      const offset = editor.document.offsetAt(editor.selection.active);
      const target = kind === 'column'
        ? adjacentColumnOffset(csv, offset, direction)
        : adjacentRowOffset(csv, offset, direction);
      if (target === undefined) {
        let message: string;
        if (kind === 'column') {
          message = direction < 0
            ? vscode.l10n.t('Already at the first column.')
            : vscode.l10n.t('Already at the last column.');
        } else {
          message = direction < 0
            ? vscode.l10n.t('No earlier row contains this column.')
            : vscode.l10n.t('No later row contains this column.');
        }
        void vscode.window.showInformationMessage(message);
        return;
      }

      const position = editor.document.positionAt(target);
      editor.selection = new vscode.Selection(position, position);
      editor.revealRange(new vscode.Range(position, position), vscode.TextEditorRevealType.InCenterIfOutsideViewport);
      updateStatusBar(editor);
    };

  context.subscriptions.push(
    statusBar,
    showColumn,
    vscode.commands.registerTextEditorCommand('nocolorcsv.nextColumn', move('column', 1)),
    vscode.commands.registerTextEditorCommand('nocolorcsv.previousColumn', move('column', -1)),
    vscode.commands.registerTextEditorCommand('nocolorcsv.nextRow', move('row', 1)),
    vscode.commands.registerTextEditorCommand('nocolorcsv.previousRow', move('row', -1)),
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
    }),
    vscode.workspace.onDidChangeConfiguration((event) => {
      if (event.affectsConfiguration('nocolorcsv.hasHeader')) {
        updateStatusBar(vscode.window.activeTextEditor);
      }
    })
  );

  updateStatusBar(vscode.window.activeTextEditor);
}

export function deactivate(): void {}
