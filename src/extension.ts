import * as vscode from 'vscode';
import {
  adjacentColumnOffset, adjacentRowOffset, CsvCellContext, CsvDocument, getCellContext
} from './csv';
import { CsvSnapshotCache, getFocusState, OffsetRange } from './focus';

type FocusMode = 'off' | 'cell' | 'column';
const parsedDocuments = new CsvSnapshotCache<vscode.TextDocument>();

function isCsvEditor(editor: vscode.TextEditor | undefined): editor is vscode.TextEditor {
  return editor !== undefined && /\.csv$/i.test(editor.document.uri.path);
}

function parsedCsv(document: vscode.TextDocument): CsvDocument {
  return parsedDocuments.get(document, document.version, () => document.getText());
}

function settings(): { hasHeader: boolean; focus: FocusMode; statusBar: boolean } {
  const config = vscode.workspace.getConfiguration('nocolorcsv');
  return {
    hasHeader: config.get<boolean>('hasHeader', true),
    focus: config.get<FocusMode>('columnFocus', 'column'),
    statusBar: config.get<boolean>('statusBar', true)
  };
}

function shortText(value: string, limit: number): string {
  const flattened = value.replace(/\s+/g, ' ').trim();
  return flattened.length > limit ? `${flattened.slice(0, limit - 1)}…` : flattened;
}

function cellDescription(cell: CsvCellContext, hasHeader: boolean): string {
  const parts = [vscode.l10n.t('Row {0}, column {1} of {2}',
    cell.rowIndex + 1, cell.columnIndex + 1, cell.columnCount)];
  if (cell.header) {
    parts.push(vscode.l10n.t('Header: {0}', shortText(cell.header, 60)));
  } else if (hasHeader) {
    parts.push(vscode.l10n.t('Header unavailable'));
  }
  const value = shortText(cell.value, 120);
  parts.push(cell.value === '' ? vscode.l10n.t('Empty cell')
    : value ? vscode.l10n.t('Value: {0}', value) : vscode.l10n.t('Whitespace-only cell'));
  return parts.join(' · ');
}

function hasFullwidthCommaHint(editor: vscode.TextEditor, cell: CsvCellContext): boolean {
  if (cell.columnCount !== 1) {
    return false;
  }
  const line = editor.document.lineAt(editor.selection.active.line).text;
  return line.includes('，') && !line.includes(',');
}

function toRange(document: vscode.TextDocument, range: OffsetRange): vscode.Range {
  return new vscode.Range(document.positionAt(range.start), document.positionAt(range.end));
}

export function activate(context: vscode.ExtensionContext): void {
  const statusBar = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Right, 100);
  statusBar.name = vscode.l10n.t('NoColorCSV current cell');
  statusBar.command = 'nocolorcsv.showCurrentColumn';

  const color = new vscode.ThemeColor('editorCursor.foreground');
  const currentDecoration = vscode.window.createTextEditorDecorationType({
    borderStyle: 'solid', borderWidth: '0 0 2px 0', borderColor: color,
    before: { contentText: '▏', color, margin: '0 1px 0 0' }
  });
  const columnDecoration = vscode.window.createTextEditorDecorationType({
    borderStyle: 'dashed', borderWidth: '0 0 1px 0', borderColor: color,
    before: { contentText: '¦', color, margin: '0 1px 0 0' }
  });
  const emptyCurrentDecoration = vscode.window.createTextEditorDecorationType({
    after: { contentText: '▏', color, margin: '0 0 0 1px' }
  });
  const emptyColumnDecoration = vscode.window.createTextEditorDecorationType({
    after: { contentText: '¦', color, margin: '0 0 0 1px' }
  });
  const decorations = [currentDecoration, columnDecoration, emptyCurrentDecoration, emptyColumnDecoration];
  let decoratedEditor: vscode.TextEditor | undefined;

  const clearDecorations = (editor: vscode.TextEditor | undefined): void => {
    if (editor) {
      for (const decoration of decorations) {
        editor.setDecorations(decoration, []);
      }
    }
  };

  const updateDisplay = (editor: vscode.TextEditor | undefined): void => {
    if (decoratedEditor && decoratedEditor !== editor) {
      clearDecorations(decoratedEditor);
      decoratedEditor = undefined;
    }
    const config = settings();
    if (!isCsvEditor(editor)) {
      statusBar.hide();
      return;
    }
    if (!config.statusBar && config.focus === 'off') {
      statusBar.hide();
      clearDecorations(editor);
      decoratedEditor = undefined;
      return;
    }

    const csv = parsedCsv(editor.document);
    const offset = editor.document.offsetAt(editor.selection.active);
    const visible = editor.visibleRanges.map((range): OffsetRange => ({
      start: editor.document.offsetAt(range.start),
      end: editor.document.offsetAt(range.end)
    }));
    const focus = getFocusState(csv, offset, config.hasHeader, visible);
    const cell = focus.cell;

    if (config.statusBar) {
      const emptyFile = csv.text.length === 0;
      const header = cell.header ? ` · ${shortText(cell.header, 30)}`
        : config.hasHeader && !emptyFile ? ` · ${vscode.l10n.t('Header unavailable')}` : '';
      const empty = cell.value === '' && !emptyFile ? ` · ${vscode.l10n.t('Empty cell')}` : '';
      const fullwidthHint = hasFullwidthCommaHint(editor, cell);
      const hint = fullwidthHint ? ` · ${vscode.l10n.t('Full-width comma')}` : '';
      statusBar.text = emptyFile ? vscode.l10n.t('CSV: empty file')
        : `${vscode.l10n.t('CSV: row {0}, column {1} of {2}',
          cell.rowIndex + 1, cell.columnIndex + 1, cell.columnCount)}${header}${empty}${hint}`;
      statusBar.tooltip = emptyFile ? vscode.l10n.t('Empty CSV file.')
        : fullwidthHint
          ? `${cellDescription(cell, config.hasHeader)} · ${vscode.l10n.t("Full-width commas are text; use ',' to separate CSV columns.")}`
          : cellDescription(cell, config.hasHeader);
      statusBar.show();
    } else {
      statusBar.hide();
    }

    const current = config.focus === 'off' ? [] : focus.current;
    const column = config.focus === 'column' ? focus.column : [];
    const setRanges = (decoration: vscode.TextEditorDecorationType, ranges: readonly OffsetRange[], empty: boolean): void => {
      editor.setDecorations(decoration, ranges.filter((range) => (range.start === range.end) === empty)
        .map((range) => toRange(editor.document, range)));
    };
    setRanges(currentDecoration, current, false);
    setRanges(columnDecoration, column, false);
    setRanges(emptyCurrentDecoration, current, true);
    setRanges(emptyColumnDecoration, column, true);
    decoratedEditor = config.focus === 'off' ? undefined : editor;
  };

  let pendingUpdate: ReturnType<typeof setTimeout> | undefined;
  const scheduleUpdate = (editor: vscode.TextEditor): void => {
    if (pendingUpdate !== undefined) {
      clearTimeout(pendingUpdate);
    }
    const version = editor.document.version;
    pendingUpdate = setTimeout(() => {
      pendingUpdate = undefined;
      if (editor !== vscode.window.activeTextEditor) {
        return;
      }
      if (editor.document.version !== version) {
        scheduleUpdate(editor);
        return;
      }
      updateDisplay(editor);
    }, 75);
  };

  const showColumn = vscode.commands.registerTextEditorCommand(
    'nocolorcsv.showCurrentColumn',
    (editor) => {
      if (!isCsvEditor(editor)) {
        void vscode.window.showWarningMessage(vscode.l10n.t('Open a CSV file to use this command.'));
        return;
      }
      const csv = parsedCsv(editor.document);
      const config = settings();
      const cell = getCellContext(csv, editor.document.offsetAt(editor.selection.active), config.hasHeader);
      const hint = hasFullwidthCommaHint(editor, cell)
        ? ` · ${vscode.l10n.t("Full-width commas are text; use ',' to separate CSV columns.")}`
        : '';
      const description = csv.text.length === 0 ? vscode.l10n.t('Empty CSV file.')
        : cellDescription(cell, config.hasHeader);
      void vscode.window.showInformationMessage(`${description}${hint}`);
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
      updateDisplay(editor);
    };

  context.subscriptions.push(
    {
      dispose: () => {
        if (pendingUpdate !== undefined) {
          clearTimeout(pendingUpdate);
        }
        clearDecorations(decoratedEditor);
      }
    },
    statusBar, ...decorations,
    showColumn,
    vscode.commands.registerTextEditorCommand('nocolorcsv.nextColumn', move('column', 1)),
    vscode.commands.registerTextEditorCommand('nocolorcsv.previousColumn', move('column', -1)),
    vscode.commands.registerTextEditorCommand('nocolorcsv.nextRow', move('row', 1)),
    vscode.commands.registerTextEditorCommand('nocolorcsv.previousRow', move('row', -1)),
    vscode.window.onDidChangeActiveTextEditor((editor) => updateDisplay(editor)),
    vscode.window.onDidChangeTextEditorSelection((event) => {
      if (event.textEditor === vscode.window.activeTextEditor) {
        scheduleUpdate(event.textEditor);
      }
    }),
    vscode.window.onDidChangeTextEditorVisibleRanges((event) => {
      if (event.textEditor === vscode.window.activeTextEditor) {
        scheduleUpdate(event.textEditor);
      }
    }),
    vscode.workspace.onDidChangeTextDocument((event) => {
      if (event.document === vscode.window.activeTextEditor?.document) {
        scheduleUpdate(vscode.window.activeTextEditor);
      }
    }),
    vscode.workspace.onDidCloseTextDocument((document) => {
      parsedDocuments.delete(document);
      if (decoratedEditor?.document === document) {
        clearDecorations(decoratedEditor);
        decoratedEditor = undefined;
        statusBar.hide();
      }
    }),
    vscode.workspace.onDidChangeConfiguration((event) => {
      if (event.affectsConfiguration('nocolorcsv')) {
        updateDisplay(vscode.window.activeTextEditor);
      }
    })
  );

  updateDisplay(vscode.window.activeTextEditor);
}

export function deactivate(): void {}
