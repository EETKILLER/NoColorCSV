import assert from 'node:assert/strict';
import { test } from 'node:test';
import {
  columnSymbol, hasExplicitValue, resolvePresentationSettings, symbolCycleLength
} from '../presentation';

test('symbols repeat predictably across thirty columns while column numbers remain distinct', () => {
  const symbols = Array.from({ length: 32 }, (_, index) => columnSymbol(index));
  assert.equal(symbolCycleLength(), 8);
  assert.equal(symbols[0], symbols[8]);
  assert.equal(symbols[7], symbols[15]);
  assert.notEqual(symbols[0], symbols[1]);
  assert.equal(new Set(symbols.slice(0, 8)).size, 8);
  assert.equal(symbols[30], columnSymbol(6));
  assert.throws(() => columnSymbol(-1), RangeError);
  assert.throws(() => columnSymbol(1.5), RangeError);
});

test('VS Code defaults are not treated as explicit user settings', () => {
  assert.equal(hasExplicitValue(undefined), false);
  assert.equal(hasExplicitValue({}), false);
  assert.equal(hasExplicitValue({ globalValue: false }), true);
  assert.equal(hasExplicitValue({ workspaceValue: 'off' }), true);
  assert.equal(hasExplicitValue({ workspaceFolderValue: false }), true);
  assert.equal(hasExplicitValue({ globalLanguageValue: true }), true);
  assert.equal(hasExplicitValue({ workspaceLanguageValue: false }), true);
  assert.equal(hasExplicitValue({ workspaceFolderLanguageValue: 'cell' }), true);
});

test('presets set defaults and every explicit option wins independently', () => {
  const automatic = {
    focus: { value: 'column' as const, explicit: false },
    status: { value: true, explicit: false },
    symbols: { value: false, explicit: false }
  };
  assert.deepEqual(resolvePresentationSettings('standard', automatic.focus, automatic.status, automatic.symbols),
    { focus: 'column', statusBar: true, symbols: false, highContrast: false });
  assert.deepEqual(resolvePresentationSettings('highContrast', automatic.focus, automatic.status, automatic.symbols),
    { focus: 'column', statusBar: true, symbols: true, highContrast: true });
  assert.deepEqual(resolvePresentationSettings('screenReader', automatic.focus, automatic.status, automatic.symbols),
    { focus: 'off', statusBar: true, symbols: false, highContrast: false });

  assert.deepEqual(resolvePresentationSettings('screenReader',
    { value: 'cell', explicit: true }, { value: false, explicit: true }, { value: true, explicit: true }),
    { focus: 'cell', statusBar: false, symbols: true, highContrast: false });
  assert.deepEqual(resolvePresentationSettings('highContrast',
    { value: 'off', explicit: true }, automatic.status, { value: false, explicit: true }),
    { focus: 'off', statusBar: true, symbols: false, highContrast: true });
});
