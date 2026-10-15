import * as vscode from 'vscode';
import {
  adjacentColumnOffset, adjacentRowOffset, CsvCellContext, CsvDocument, CsvIssue, getCellContext,
  hasMalformedNavigationTarget, isReliablePosition, validateCsv
} from './csv';
import { CsvSnapshotCache, getFocusState, OffsetRange } from './focus';
import {
  AccessibilityPreset, columnSymbol, FocusMode, hasExplicitValue, PresentationSettings,
  resolvePresentationSettings, symbolCycleLength
} from './presentation';

const parsedDocuments = new CsvSnapshotCache<vscode.TextDocument>();

function isCsvEditor(editor: vscode.TextEditor | undefined): editor is vscode.TextEditor {
  return editor !== undefined && /\.csv$/i.test(editor.document.uri.path);
}

function parsedCsv(document: vscode.TextDocument): CsvDocument {
  return parsedDocuments.get(document, document.version, () => document.getText());
}

function settings(editor: vscode.TextEditor): PresentationSettings & { hasHeader: boolean } {
  const config = vscode.workspace.getConfiguration('nocolorcsv', editor.document.uri);
  const preset = config.get<AccessibilityPreset>('accessibilityPreset', 'standard');
  return {
    ...resolvePresentationSettings(preset,
      { value: config.get<FocusMode>('columnFocus', 'column'),
        explicit: hasExplicitValue(config.inspect('columnFocus')) },
      { value: config.get<boolean>('statusBar', true),
        explicit: hasExplicitValue(config.inspect('statusBar')) },
      { value: config.get<boolean>('columnSymbols', false),
        explicit: hasExplicitValue(config.inspect('columnSymbols')) }),
    hasHeader: config.get<boolean>('hasHeader', true)
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

function issueMessage(issue: CsvIssue): string {
  switch (issue.code) {
    case 'unclosedQuote': return vscode.l10n.t('Unclosed quoted field.');
    case 'afterQuote': return vscode.l10n.t('Unexpected character after a closing quote.');
    case 'bareQuote': return vscode.l10n.t('Double quote inside an unquoted field.');
    case 'columnCount': return vscode.l10n.t('Expected {0} columns, found {1}.', issue.expected!, issue.actual!);
    case 'moreProblems': return vscode.l10n.t('More CSV problems were omitted.');
  }
}

export function activate(context: vscode.ExtensionContext): void {
  const diagnostics = vscode.languages.createDiagnosticCollection('NoColorCSV');
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
  const strongCurrentDecoration = vscode.window.createTextEditorDecorationType({
    borderStyle: 'solid', borderWidth: '0 0 3px 2px', borderColor: color,
    before: { contentText: '▌', color, margin: '0 2px 0 0' }
  });
  const strongColumnDecoration = vscode.window.createTextEditorDecorationType({
    borderStyle: 'dashed', borderWidth: '0 0 2px 1px', borderColor: color,
    before: { contentText: '¦', color, margin: '0 2px 0 0' }
  });
  const strongEmptyCurrentDecoration = vscode.window.createTextEditorDecorationType({
    after: { contentText: '▌', color, margin: '0 0 0 2px' }
  });
  const strongEmptyColumnDecoration = vscode.window.createTextEditorDecorationType({
    after: { contentText: '¦', color, margin: '0 0 0 2px' }
  });
  const normalDecorations = [currentDecoration, columnDecoration, emptyCurrentDecoration, emptyColumnDecoration];
  const strongDecorations = [strongCurrentDecoration, strongColumnDecoration,
    strongEmptyCurrentDecoration, strongEmptyColumnDecoration];
  const decorations = [...normalDecorations, ...strongDecorations];
  let decoratedEditor: vscode.TextEditor | undefined;
  let diagnosticTimer: ReturnType<typeof setTimeout> | undefined;
  let diagnosticDocument: vscode.TextDocument | undefined;
  let lastNavigationNotice = '';
  const refreshDiagnostics = (document: vscode.TextDocument | undefined): void => {
    if (diagnosticTimer !== undefined) {
      clearTimeout(diagnosticTimer);
      diagnosticTimer = undefined;
    }
    diagnostics.clear();
    diagnosticDocument = document && /\.csv$/i.test(document.uri.path) ? document : undefined;
    if (!diagnosticDocument || !vscode.workspace.getConfiguration('nocolorcsv', diagnosticDocument.uri)
      .get<boolean>('validation.enabled', true)) {
      return;
    }
    const target = diagnosticDocument;
    const version = target.version;
    diagnosticTimer = setTimeout(() => {
      diagnosticTimer = undefined;
      if (diagnosticDocument !== target || target.version !== version ||
        vscode.window.activeTextEditor?.document !== target) {
        return;
      }
      const hasHeader = vscode.workspace.getConfiguration('nocolorcsv', target.uri)
        .get<boolean>('hasHeader', true);
      const issues = validateCsv(parsedCsv(target), hasHeader);
      if (target.version !== version) {
        return;
      }
      diagnostics.set(target.uri, issues.map((issue) => {
        const severity = issue.severity === 'error' ? vscode.DiagnosticSeverity.Error
          : issue.severity === 'warning' ? vscode.DiagnosticSeverity.Warning
            : vscode.DiagnosticSeverity.Information;
        const diagnostic = new vscode.Diagnostic(toRange(target, issue), issueMessage(issue), severity);
        diagnostic.source = 'NoColorCSV';
        return diagnostic;
      }));
    }, 150);
  };

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
    if (!isCsvEditor(editor)) {
      statusBar.hide();
      return;
    }
    const config = settings(editor);
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
      const symbol = config.symbols ? ` · ${vscode.l10n.t('Column {0}: symbol {1}',
        cell.columnIndex + 1, columnSymbol(cell.columnIndex))}` : '';
      statusBar.text = emptyFile ? vscode.l10n.t('CSV: empty file')
        : `${vscode.l10n.t('CSV: row {0}, column {1} of {2}',
          cell.rowIndex + 1, cell.columnIndex + 1, cell.columnCount)}${header}${empty}${hint}${symbol}`;
      const detail = emptyFile ? vscode.l10n.t('Empty CSV file.')
        : fullwidthHint
          ? `${cellDescription(cell, config.hasHeader)} · ${vscode.l10n.t("Full-width commas are text; use ',' to separate CSV columns.")}`
          : cellDescription(cell, config.hasHeader);
      const symbolHint = !emptyFile && config.symbols
        ? ` · ${vscode.l10n.t('Column {0}: symbol {1} (repeats every {2} columns)',
          cell.columnIndex + 1, columnSymbol(cell.columnIndex), symbolCycleLength())}` : '';
      const focusHint = config.highContrast && config.focus !== 'off'
        ? ` · ${config.focus === 'column'
          ? vscode.l10n.t('Focus marks: current cell and visible column')
          : vscode.l10n.t('Focus marks: current cell')}` : '';
      statusBar.tooltip = `${detail}${symbolHint}${focusHint}`;
      statusBar.show();
    } else {
      statusBar.hide();
    }

    const current = config.focus === 'off' ? [] : focus.current;
    const column = config.focus === 'column' ? focus.column : [];
    const setRanges = (decoration: vscode.TextEditorDecorationType, ranges: readonly OffsetRange[],
      empty: boolean, currentCell = false): void => {
      const filtered = ranges.filter((range) => (range.start === range.end) === empty);
      if (currentCell && config.symbols) {
        const label = `${cell.columnIndex + 1} ${columnSymbol(cell.columnIndex)}`;
        editor.setDecorations(decoration, filtered.map((range): vscode.DecorationOptions => ({
          range: toRange(editor.document, range),
          renderOptions: empty
            ? { after: { contentText: label } }
            : { before: { contentText: label } }
        })));
      } else {
        editor.setDecorations(decoration, filtered.map((range) => toRange(editor.document, range)));
      }
    };
    const active = config.highContrast ? strongDecorations : normalDecorations;
    const inactive = config.highContrast ? normalDecorations : strongDecorations;
    for (const decoration of inactive) {
      editor.setDecorations(decoration, []);
    }
    setRanges(active[0], current, false, true);
    setRanges(active[1], column, false);
    setRanges(active[2], current, true, true);
    setRanges(active[3], column, true);
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
      const config = settings(editor);
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
      if (!isReliablePosition(csv, offset)) {
        const notice = vscode.l10n.t('Cannot navigate from a malformed CSV field.');
        if (lastNavigationNotice !== notice) {
          void vscode.window.showInformationMessage(notice);
          lastNavigationNotice = notice;
        }
        return;
      }
      const target = kind === 'column'
        ? adjacentColumnOffset(csv, offset, direction)
        : adjacentRowOffset(csv, offset, direction);
      if (target === undefined) {
        let message: string;
        if (hasMalformedNavigationTarget(csv, offset, kind, direction)) {
          message = vscode.l10n.t('Cannot navigate to a malformed CSV field.');
        } else if (kind === 'column') {
          message = direction < 0
            ? vscode.l10n.t('Already at the first column.')
            : vscode.l10n.t('Already at the last column.');
        } else {
          message = direction < 0
            ? vscode.l10n.t('No earlier row contains this column.')
            : vscode.l10n.t('No later row contains this column.');
        }
        if (lastNavigationNotice !== message) {
          void vscode.window.showInformationMessage(message);
          lastNavigationNotice = message;
        }
        return;
      }

      lastNavigationNotice = '';

      const position = editor.document.positionAt(target);
      editor.selections = [new vscode.Selection(position, position)];
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
        if (diagnosticTimer !== undefined) {
          clearTimeout(diagnosticTimer);
        }
      }
    },
    statusBar, diagnostics, ...decorations,
    showColumn,
    vscode.commands.registerTextEditorCommand('nocolorcsv.nextColumn', move('column', 1)),
    vscode.commands.registerTextEditorCommand('nocolorcsv.previousColumn', move('column', -1)),
    vscode.commands.registerTextEditorCommand('nocolorcsv.nextRow', move('row', 1)),
    vscode.commands.registerTextEditorCommand('nocolorcsv.previousRow', move('row', -1)),
    vscode.window.onDidChangeActiveTextEditor((editor) => {
      updateDisplay(editor);
      refreshDiagnostics(editor?.document);
      lastNavigationNotice = '';
    }),
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
        refreshDiagnostics(event.document);
      }
    }),
    vscode.workspace.onDidCloseTextDocument((document) => {
      parsedDocuments.delete(document);
      diagnostics.delete(document.uri);
      if (diagnosticDocument === document) {
        refreshDiagnostics(undefined);
      }
      if (decoratedEditor?.document === document) {
        clearDecorations(decoratedEditor);
        decoratedEditor = undefined;
        statusBar.hide();
      }
    }),
    vscode.workspace.onDidChangeConfiguration((event) => {
      if (event.affectsConfiguration('nocolorcsv')) {
        updateDisplay(vscode.window.activeTextEditor);
        refreshDiagnostics(vscode.window.activeTextEditor?.document);
      }
    })
  );

  updateDisplay(vscode.window.activeTextEditor);
  refreshDiagnostics(vscode.window.activeTextEditor?.document);
}

export function deactivate(): void {}
