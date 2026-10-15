import * as vscode from 'vscode';
import { randomBytes } from 'node:crypto';
import { CsvDocument } from './csv';
import { isPreviewMessage, previewCellOffset, previewPage } from './preview';

interface OpenPreview {
  readonly document: vscode.TextDocument;
  readonly panel: vscode.WebviewPanel;
  readonly subscriptions: vscode.Disposable[];
  timer?: ReturnType<typeof setTimeout>;
  page: number;
  closed: boolean;
}

export class PreviewPanels implements vscode.Disposable {
  private readonly panels = new Map<string, OpenPreview>();

  constructor(private readonly extensionUri: vscode.Uri,
    private readonly parse: (document: vscode.TextDocument) => CsvDocument) {}

  open(editor: vscode.TextEditor | undefined): void {
    if (!editor || !/\.csv$/i.test(editor.document.uri.path)) {
      void vscode.window.showWarningMessage(vscode.l10n.t('Open a CSV file to use this command.'));
      return;
    }
    const document = editor.document;
    const key = document.uri.toString();
    const existing = this.panels.get(key);
    if (existing && !existing.closed) { existing.panel.reveal(); this.send(existing); return; }
    if (existing) { existing.panel.dispose(); }
    const assets = vscode.Uri.joinPath(this.extensionUri, 'webview');
    const panel = vscode.window.createWebviewPanel('nocolorcsv.preview',
      vscode.l10n.t('{0} — Read-only preview', document.uri.path.split('/').pop() || 'CSV'),
      vscode.ViewColumn.Beside, { enableScripts: true, retainContextWhenHidden: true,
        localResourceRoots: [assets] });
    const nonce = randomBytes(16).toString('base64');
    const script = panel.webview.asWebviewUri(vscode.Uri.joinPath(assets, 'preview.js'));
    const style = panel.webview.asWebviewUri(vscode.Uri.joinPath(assets, 'preview.css'));
    panel.webview.html = `<!doctype html><html lang="${escapeHtml(vscode.env.language)}"><head>
      <meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1">
      <meta http-equiv="Content-Security-Policy" content="default-src 'none'; img-src 'none';
      style-src ${panel.webview.cspSource}; script-src 'nonce-${nonce}'; connect-src 'none';">
      <link rel="stylesheet" href="${style}"></head><body><main id="app"></main>
      <script nonce="${nonce}" src="${script}"></script></body></html>`;
    const entry: OpenPreview = { document, panel, subscriptions: [], page: 0, closed: false };
    this.panels.set(key, entry);
    entry.subscriptions.push(panel.onDidDispose(() => this.remove(key, entry)));
    entry.subscriptions.push(panel.webview.onDidReceiveMessage((raw: unknown) => {
      if (!isPreviewMessage(raw) || entry.closed) { return; }
      if (raw.type === 'ready') { this.send(entry); return; }
      if (raw.version !== document.version) { return; }
      if (raw.type === 'page') {
        entry.page = raw.page!;
        this.send(entry);
      } else if (raw.type === 'jump') {
        const offset = previewCellOffset(this.parse(document), raw.row!, raw.column!);
        if (offset === undefined) { return; }
        void vscode.window.showTextDocument(document, { viewColumn: vscode.ViewColumn.Beside })
          .then((source) => {
            const position = document.positionAt(offset);
            source.selection = new vscode.Selection(position, position);
            source.revealRange(new vscode.Range(position, position),
              vscode.TextEditorRevealType.InCenterIfOutsideViewport);
          });
      } else if (raw.type === 'problems') {
        void vscode.window.showTextDocument(document, { viewColumn: vscode.ViewColumn.Beside })
          .then(() => vscode.commands.executeCommand('workbench.actions.view.problems'));
      }
    }));
  }

  changed(document: vscode.TextDocument): void {
    const entry = this.panels.get(document.uri.toString());
    if (!entry || entry.document !== document || entry.closed) { return; }
    if (entry.timer) { clearTimeout(entry.timer); }
    const version = document.version;
    entry.timer = setTimeout(() => {
      entry.timer = undefined;
      if (!entry.closed && entry.document.version === version) { this.send(entry); }
    }, 150);
  }

  configurationChanged(): void {
    for (const entry of this.panels.values()) { if (!entry.closed) { this.send(entry); } }
  }

  documentClosed(document: vscode.TextDocument): void {
    const entry = this.panels.get(document.uri.toString());
    if (entry?.document === document) { this.unavailable(entry, vscode.l10n.t('Source document closed. Reopen it and open a new preview.')); }
  }

  renamed(oldUri: vscode.Uri): void {
    const entry = this.panels.get(oldUri.toString());
    if (entry) { this.unavailable(entry, vscode.l10n.t('Source document renamed. Open a new preview from the renamed CSV.')); }
  }

  private unavailable(entry: OpenPreview, message: string): void {
    entry.closed = true;
    if (entry.timer) { clearTimeout(entry.timer); entry.timer = undefined; }
    void entry.panel.webview.postMessage({ type: 'unavailable', message });
  }

  private send(entry: OpenPreview): void {
    const document = entry.document;
    const version = document.version;
    const hasHeader = vscode.workspace.getConfiguration('nocolorcsv', document.uri).get('hasHeader', true);
    const data = previewPage(this.parse(document), hasHeader, entry.page);
    if (entry.closed || document.version !== version) { return; }
    entry.page = data.page;
    void entry.panel.webview.postMessage({ type: 'page', version, data, dirty: document.isDirty,
      labels: {
        title: vscode.l10n.t('Read-only CSV preview'),
        unsaved: vscode.l10n.t('Previewing unsaved editor content.'),
        emptyFile: vscode.l10n.t('This CSV file is empty.'),
        empty: vscode.l10n.t('Empty'), missing: vscode.l10n.t('Missing this column'),
        column: vscode.l10n.t('Column {0}', '{n}'), row: vscode.l10n.t('Row {0}', '{n}'),
        malformed: vscode.l10n.t('Malformed field; value may be unreliable.'),
        columnCount: vscode.l10n.t('Different number of columns.'),
        previous: vscode.l10n.t('Previous page'), next: vscode.l10n.t('Next page'),
        page: vscode.l10n.t('Page {0} of {1}', '{current}', '{total}'),
        jump: vscode.l10n.t('Go to this cell in source'),
        problems: vscode.l10n.t('Show Problems'),
        instructions: vscode.l10n.t('Tab to the table. Use arrow keys, Home, End, Page Up and Page Down to move. Press Enter to go to the source cell. Close this tab to return to the source.'),
        headerRow: vscode.l10n.t('Header row')
      } });
  }

  private remove(key: string, entry: OpenPreview): void {
    if (entry.timer) { clearTimeout(entry.timer); }
    for (const disposable of entry.subscriptions) { disposable.dispose(); }
    if (this.panels.get(key) === entry) { this.panels.delete(key); }
  }

  dispose(): void {
    for (const entry of [...this.panels.values()]) { entry.panel.dispose(); }
    this.panels.clear();
  }
}

function escapeHtml(value: string): string {
  return value.replace(/[&<>"']/g, (character) => ({ '&': '&amp;', '<': '&lt;',
    '>': '&gt;', '"': '&quot;', "'": '&#39;' })[character]!);
}
