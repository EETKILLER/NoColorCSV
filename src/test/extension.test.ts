import assert from 'node:assert/strict';
import Module from 'node:module';
import { test } from 'node:test';
import { setTimeout as delay } from 'node:timers/promises';
import type * as vscode from 'vscode';

interface MockDocument {
  readonly uri: { path: string };
  version: number;
  text: string;
  getText(): string;
  offsetAt(position: vscode.Position): number;
  positionAt(offset: number): vscode.Position;
  lineAt(line: number): { text: string };
}

interface MockEditor {
  readonly document: MockDocument;
  selection: { active: vscode.Position };
  visibleRanges: vscode.Range[];
  readonly decorations: Map<object, readonly (vscode.Range | vscode.DecorationOptions)[]>;
  setDecorations(type: object, ranges: readonly (vscode.Range | vscode.DecorationOptions)[]): void;
  revealRange(): void;
}

function document(path: string, text: string): MockDocument {
  const result: MockDocument = {
    uri: { path }, version: 1, text,
    getText: () => result.text,
    offsetAt(position) {
      const lines = result.text.split(/\r\n|\r|\n/);
      let offset = 0;
      for (let line = 0; line < position.line; line += 1) {
        offset += lines[line].length;
        const ending = /\r\n|\r|\n/.exec(result.text.slice(offset));
        offset += ending?.[0].length ?? 0;
      }
      return offset + position.character;
    },
    positionAt(offset) {
      const before = result.text.slice(0, offset);
      const lines = before.split(/\r\n|\r|\n/);
      return { line: lines.length - 1, character: lines[lines.length - 1].length } as vscode.Position;
    },
    lineAt(line) { return { text: result.text.split(/\r\n|\r|\n/)[line] }; }
  };
  return result;
}

function editor(doc: MockDocument, cursor: number): MockEditor {
  const result: MockEditor = {
    document: doc,
    selection: { active: doc.positionAt(cursor) },
    visibleRanges: [{ start: doc.positionAt(0), end: doc.positionAt(doc.text.length) } as vscode.Range],
    decorations: new Map(),
    setDecorations(type, ranges) { result.decorations.set(type, ranges); },
    revealRange() {}
  };
  return result;
}

function harness(active: MockEditor) {
  const handlers = new Map<string, (event: unknown) => void>();
  const commands = new Map<string, (editor: MockEditor) => void>();
  const options: Array<{ borderStyle?: string; before?: { contentText: string }; after?: object }> = [];
  const types: object[] = [];
  const messages: string[] = [];
  const explicit = new Set<string>();
  const config = new Proxy({ hasHeader: true, columnFocus: 'column', statusBar: true,
    columnSymbols: false, accessibilityPreset: 'standard' }, {
    set(target, property, value) {
      explicit.add(String(property));
      return Reflect.set(target, property, value);
    }
  });
  const status = {
    visible: false, text: '', tooltip: '', name: '', command: '',
    show() { status.visible = true; }, hide() { status.visible = false; }, dispose() {}
  };
  const on = (name: string) => (handler: (event: unknown) => void) => {
    handlers.set(name, handler);
    return { dispose() { handlers.delete(name); } };
  };
  const mock = {
    ThemeColor: class { constructor(readonly id: string) {} },
    Range: class { constructor(readonly start: vscode.Position, readonly end: vscode.Position) {} },
    Selection: class { active: vscode.Position; constructor(start: vscode.Position) { this.active = start; } },
    StatusBarAlignment: { Right: 1 }, TextEditorRevealType: { InCenterIfOutsideViewport: 1 },
    l10n: { t: (key: string, ...args: unknown[]) => key.replace(/\{(\d+)\}/g, (_, i: string) => String(args[Number(i)])) },
    window: {
      activeTextEditor: active,
      createStatusBarItem: () => status,
      createTextEditorDecorationType: (option: { borderStyle?: string; before?: { contentText: string }; after?: object }) => {
        options.push(option);
        const type = { dispose() {} };
        types.push(type);
        return type;
      },
      onDidChangeActiveTextEditor: on('active'),
      onDidChangeTextEditorSelection: on('selection'),
      onDidChangeTextEditorVisibleRanges: on('visible'),
      showInformationMessage: (message: string) => { messages.push(message); },
      showWarningMessage: (message: string) => { messages.push(message); }
    },
    workspace: {
      getConfiguration: () => ({
        get: (name: keyof typeof config) => config[name],
        inspect: (name: keyof typeof config) => ({ globalValue: explicit.has(name) ? config[name] : undefined })
      }),
      onDidChangeTextDocument: on('document'),
      onDidCloseTextDocument: on('close'),
      onDidChangeConfiguration: on('configuration')
    },
    commands: { registerTextEditorCommand: (id: string, callback: (editor: MockEditor) => void) => {
      commands.set(id, callback);
      return { dispose() {} };
    } }
  };
  const loader = Module as unknown as { _load: (...args: unknown[]) => unknown };
  const originalLoad = loader._load;
  loader._load = (...args) => args[0] === 'vscode' ? mock : originalLoad.apply(Module, args);
  try {
    delete require.cache[require.resolve('../extension')];
    const extension = require('../extension') as typeof import('../extension');
    const subscriptions: Array<{ dispose(): void }> = [];
    extension.activate({ subscriptions } as vscode.ExtensionContext);
    return { mock, status, handlers, commands, config, explicit, options, types, messages,
      dispose: () => subscriptions.forEach((item) => item.dispose()) };
  } finally {
    loader._load = originalLoad;
  }
}

test('status and marks agree on a quoted logical record and skip a short row', () => {
  const text = 'a,b,c\r\n1,"x,\r\ny",3\r\n2\r\n4,,6';
  const doc = document('/sample.csv', text);
  const opened = editor(doc, text.indexOf('y'));
  const host = harness(opened);
  try {
    assert.match(host.status.text, /row 2, column 2 of 3/);
    assert.equal(opened.decorations.get(host.types[0])?.length, 1);
    assert.equal(opened.decorations.get(host.types[1])?.length, 1);
    assert.equal(opened.decorations.get(host.types[3])?.length, 1);
    assert.equal(host.status.visible, true);
    assert.equal(host.options[0].borderStyle, 'solid');
    assert.equal(host.options[1].borderStyle, 'dashed');
    assert.notEqual(host.options[0].before?.contentText, host.options[1].before?.contentText);
  } finally { host.dispose(); }
});

test('display switches leave the detail command available and clear marks', () => {
  const doc = document('/sample.csv', 'a,b\n1,');
  const opened = editor(doc, doc.text.length);
  const host = harness(opened);
  try {
    host.config.columnFocus = 'off';
    host.handlers.get('configuration')?.({ affectsConfiguration: () => true });
    assert.equal([...opened.decorations.values()].every((ranges) => ranges.length === 0), true);
    host.config.statusBar = false;
    host.handlers.get('configuration')?.({ affectsConfiguration: () => true });
    assert.equal(host.status.visible, false);
    host.commands.get('nocolorcsv.showCurrentColumn')?.(opened);
    assert.match(host.messages[host.messages.length - 1] ?? '', /Row 2, column 2 of 2.*Empty cell/);
    host.config.columnFocus = 'cell';
    host.handlers.get('configuration')?.({ affectsConfiguration: () => true });
    assert.equal(opened.decorations.get(host.types[2])?.length, 1);
    assert.equal(opened.decorations.get(host.types[3])?.length, 0);
  } finally { host.dispose(); }
});

test('hiding both displays preserves keyboard navigation and header setting', () => {
  const doc = document('/sample.csv', 'a,\n1,2');
  const opened = editor(doc, doc.text.indexOf('2'));
  const host = harness(opened);
  try {
    assert.match(host.status.text, /Header unavailable/);
    host.config.hasHeader = false;
    host.handlers.get('configuration')?.({ affectsConfiguration: () => true });
    assert.doesNotMatch(host.status.text, /Header unavailable/);
    host.config.columnFocus = 'off';
    host.config.statusBar = false;
    host.handlers.get('configuration')?.({ affectsConfiguration: () => true });
    opened.selection.active = doc.positionAt(doc.text.indexOf('1'));
    host.commands.get('nocolorcsv.nextColumn')?.(opened);
    assert.equal(doc.offsetAt(opened.selection.active), doc.text.indexOf('2'));
    assert.equal(host.status.visible, false);
    assert.equal([...opened.decorations.values()].every((ranges) => ranges.length === 0), true);
  } finally { host.dispose(); }
});

test('switching to a non-CSV editor removes marks and status', () => {
  const csv = editor(document('/sample.csv', 'a,b\n1,2'), 4);
  const host = harness(csv);
  try {
    const other = editor(document('/notes.txt', 'hello'), 0);
    host.mock.window.activeTextEditor = other;
    host.handlers.get('active')?.(other);
    assert.equal(host.status.visible, false);
    assert.equal([...csv.decorations.values()].every((ranges) => ranges.length === 0), true);
  } finally { host.dispose(); }
});

test('scrolling and editing refresh visible marks, then closing clears them', async () => {
  const doc = document('/sample.csv', 'a,b\n1,2\n3,4');
  const opened = editor(doc, doc.text.indexOf('b'));
  const host = harness(opened);
  try {
    const lastRow = doc.text.indexOf('3,4');
    opened.visibleRanges = [{ start: doc.positionAt(lastRow), end: doc.positionAt(doc.text.length) } as vscode.Range];
    host.handlers.get('visible')?.({ textEditor: opened });
    await delay(100);
    assert.equal(opened.decorations.get(host.types[0])?.length, 0);
    assert.equal(opened.decorations.get(host.types[1])?.length, 1);

    doc.text = 'a,b\n1,2\n3,4\n5,6';
    doc.version += 1;
    opened.selection.active = doc.positionAt(doc.text.indexOf('6'));
    opened.visibleRanges = [{ start: doc.positionAt(0), end: doc.positionAt(doc.text.length) } as vscode.Range];
    host.handlers.get('document')?.({ document: doc });
    await delay(100);
    assert.match(host.status.text, /row 4, column 2 of 2/);
    assert.equal(opened.decorations.get(host.types[1])?.length, 3);

    host.handlers.get('close')?.(doc);
    assert.equal(host.status.visible, false);
    assert.equal([...opened.decorations.values()].every((ranges) => ranges.length === 0), true);
  } finally { host.dispose(); }
});

test('a pending selection update cannot repaint an editor after switching files', async () => {
  const csv = editor(document('/sample.csv', 'a,b\n1,2'), 4);
  const host = harness(csv);
  try {
    csv.selection.active = csv.document.positionAt(6);
    host.handlers.get('selection')?.({ textEditor: csv });
    const other = editor(document('/notes.txt', 'text'), 0);
    host.mock.window.activeTextEditor = other;
    host.handlers.get('active')?.(other);
    await delay(100);
    assert.equal(host.status.visible, false);
    assert.equal([...csv.decorations.values()].every((ranges) => ranges.length === 0), true);
  } finally { host.dispose(); }
});

test('symbol labels follow the one-based column number and vanish when disabled', () => {
  const values = Array.from({ length: 24 }, (_, index) => `v${index + 1}`);
  const doc = document('/wide.csv', values.join(','));
  const opened = editor(doc, doc.text.indexOf('v9'));
  const original = doc.getText();
  const host = harness(opened);
  try {
    host.config.columnSymbols = true;
    host.handlers.get('configuration')?.({ affectsConfiguration: () => true });
    const current = opened.decorations.get(host.types[0])?.[0] as vscode.DecorationOptions;
    assert.equal(current.renderOptions?.before?.contentText, '9 ◆');
    assert.match(host.status.text, /column 9 of 24.*Column 9: symbol ◆/);
    assert.match(String(host.status.tooltip), /repeats every 8 columns/);

    opened.selection.active = doc.positionAt(doc.text.indexOf('v1,'));
    host.handlers.get('selection')?.({ textEditor: opened });
    host.commands.get('nocolorcsv.showCurrentColumn')?.(opened);
    assert.match(host.messages[host.messages.length - 1] ?? '', /Row 1, column 1 of 24/);
    host.config.columnSymbols = false;
    host.handlers.get('configuration')?.({ affectsConfiguration: () => true });
    const plain = opened.decorations.get(host.types[0])?.[0] as vscode.DecorationOptions;
    assert.equal(plain.renderOptions, undefined);
    assert.doesNotMatch(host.status.text, /symbol/);
    assert.equal(doc.getText(), original);
  } finally { host.dispose(); }
});

test('presets replace marks immediately and explicit overrides take priority', () => {
  const doc = document('/sample.csv', 'name,city\nAda,London');
  const opened = editor(doc, doc.text.indexOf('London'));
  const host = harness(opened);
  try {
    host.config.accessibilityPreset = 'highContrast';
    host.handlers.get('configuration')?.({ affectsConfiguration: () => true });
    assert.equal(opened.decorations.get(host.types[0])?.length, 0);
    assert.equal(opened.decorations.get(host.types[4])?.length, 1);
    assert.equal(opened.decorations.get(host.types[5])?.length, 1);
    assert.equal(host.options[4].borderStyle, 'solid');
    assert.match(host.status.text, /symbol/);
    assert.match(String(host.status.tooltip), /Focus marks:/);

    host.config.columnSymbols = false;
    host.handlers.get('configuration')?.({ affectsConfiguration: () => true });
    assert.doesNotMatch(host.status.text, /symbol/);
    const noSymbol = opened.decorations.get(host.types[4])?.[0] as vscode.DecorationOptions;
    assert.equal(noSymbol.renderOptions, undefined);

    host.config.accessibilityPreset = 'screenReader';
    host.handlers.get('configuration')?.({ affectsConfiguration: () => true });
    assert.equal([...opened.decorations.values()].every((ranges) => ranges.length === 0), true);
    assert.match(host.status.text, /row 2, column 2 of 2.*city/);
    assert.equal(host.status.visible, true);
    host.commands.get('nocolorcsv.showCurrentColumn')?.(opened);
    assert.match(host.messages[host.messages.length - 1] ?? '', /Row 2, column 2 of 2.*Header: city.*Value: London/);

    host.config.columnFocus = 'cell';
    host.handlers.get('configuration')?.({ affectsConfiguration: () => true });
    assert.equal(opened.decorations.get(host.types[0])?.length, 1);
    assert.equal(opened.decorations.get(host.types[1])?.length, 0);
  } finally { host.dispose(); }
});

test('an empty field keeps its numeric symbol label without changing Unicode CSV text', () => {
  const doc = document('/unicode.csv', 'name,note,\n😀,"two\nlines",');
  const opened = editor(doc, doc.text.length);
  const original = doc.getText();
  const host = harness(opened);
  try {
    host.config.columnSymbols = true;
    host.handlers.get('configuration')?.({ affectsConfiguration: () => true });
    assert.match(host.status.text, /row 2, column 3 of 3.*Empty cell.*Column 3: symbol ▲/);
    const marker = opened.decorations.get(host.types[2])?.[0] as vscode.DecorationOptions;
    assert.equal(marker.renderOptions?.after?.contentText, '3 ▲');
    assert.equal(doc.getText(), original);
  } finally { host.dispose(); }
});
