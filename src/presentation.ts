export type FocusMode = 'off' | 'cell' | 'column';
export type AccessibilityPreset = 'standard' | 'highContrast' | 'screenReader';

export interface SettingChoice<T> {
  readonly value: T;
  readonly explicit: boolean;
}

export interface PresentationSettings {
  readonly focus: FocusMode;
  readonly statusBar: boolean;
  readonly symbols: boolean;
  readonly highContrast: boolean;
}

export interface SettingInspection {
  readonly globalValue?: unknown;
  readonly workspaceValue?: unknown;
  readonly workspaceFolderValue?: unknown;
  readonly globalLanguageValue?: unknown;
  readonly workspaceLanguageValue?: unknown;
  readonly workspaceFolderLanguageValue?: unknown;
}

const COLUMN_SYMBOLS = ['◆', '■', '▲', '●', '◇', '□', '△', '○'] as const;

/** Column indexes are zero-based in code and one-based in the UI. */
export function columnSymbol(columnIndex: number): string {
  if (!Number.isInteger(columnIndex) || columnIndex < 0) {
    throw new RangeError('Column index must be a non-negative integer');
  }
  return COLUMN_SYMBOLS[columnIndex % COLUMN_SYMBOLS.length];
}

export function symbolCycleLength(): number {
  return COLUMN_SYMBOLS.length;
}

/** VS Code's contributed default is not an explicit user override. */
export function hasExplicitValue(inspection: SettingInspection | undefined): boolean {
  return inspection !== undefined && [
    inspection.globalValue,
    inspection.workspaceValue,
    inspection.workspaceFolderValue,
    inspection.globalLanguageValue,
    inspection.workspaceLanguageValue,
    inspection.workspaceFolderLanguageValue
  ].some((value) => value !== undefined);
}

export function resolvePresentationSettings(
  preset: AccessibilityPreset,
  focus: SettingChoice<FocusMode>,
  statusBar: SettingChoice<boolean>,
  symbols: SettingChoice<boolean>
): PresentationSettings {
  const defaults: PresentationSettings = preset === 'highContrast'
    ? { focus: 'column', statusBar: true, symbols: true, highContrast: true }
    : preset === 'screenReader'
      ? { focus: 'off', statusBar: true, symbols: false, highContrast: false }
      : { focus: 'column', statusBar: true, symbols: false, highContrast: false };
  return {
    focus: focus.explicit ? focus.value : defaults.focus,
    statusBar: statusBar.explicit ? statusBar.value : defaults.statusBar,
    symbols: symbols.explicit ? symbols.value : defaults.symbols,
    highContrast: defaults.highContrast
  };
}
