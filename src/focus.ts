import { CsvCellContext, CsvDocument, CsvField, getCellContext, parseCsv } from './csv';

export interface OffsetRange {
  readonly start: number;
  readonly end: number;
}

export interface FocusState {
  readonly cell: CsvCellContext;
  readonly current: readonly OffsetRange[];
  readonly column: readonly OffsetRange[];
}

/** Keep one parsed snapshot per document identity and version. */
export class CsvSnapshotCache<Document extends object> {
  private readonly entries = new WeakMap<Document, { version: number; csv: CsvDocument }>();

  get(document: Document, version: number, text: () => string): CsvDocument {
    const cached = this.entries.get(document);
    if (cached?.version === version) {
      return cached.csv;
    }
    const csv = parseCsv(text());
    this.entries.set(document, { version, csv });
    return csv;
  }

  delete(document: Document): void {
    this.entries.delete(document);
  }
}

function firstRecordAtOrBefore(csv: CsvDocument, offset: number): number {
  let low = 0;
  let high = csv.records.length - 1;
  while (low < high) {
    const middle = Math.ceil((low + high) / 2);
    if (csv.records[middle].start <= offset) {
      low = middle;
    } else {
      high = middle - 1;
    }
  }
  return low;
}

function visiblePart(field: CsvField, view: OffsetRange): OffsetRange | undefined {
  if (field.end < view.start || field.start > view.end) {
    return undefined;
  }
  const start = Math.max(field.start, view.start);
  const end = Math.min(field.end, view.end);
  // A clipped non-empty field touching the viewport edge is not an empty cell.
  return start === end && field.start !== field.end ? undefined : { start, end };
}

/** Return only the selected column's field ranges on visible lines. */
export function getFocusState(
  csv: CsvDocument,
  cursorOffset: number,
  hasHeader: boolean,
  visible: readonly OffsetRange[]
): FocusState {
  const cell = getCellContext(csv, cursorOffset, hasHeader);
  const current: OffsetRange[] = [];
  const column: OffsetRange[] = [];
  for (const view of visible) {
    if (view.start < 0 || view.end < view.start || view.end > csv.text.length) {
      throw new RangeError('Visible range is outside the document');
    }
    for (let row = firstRecordAtOrBefore(csv, view.start);
      row < csv.records.length && csv.records[row].start <= view.end;
      row += 1) {
      const record = csv.records[row];
      if (record.end < view.start) {
        continue;
      }
      const field = record.fields[cell.columnIndex];
      if (!field) {
        continue;
      }
      const part = visiblePart(field, view);
      if (part) {
        (row === cell.rowIndex ? current : column).push(part);
      }
    }
  }
  return { cell, current, column };
}
