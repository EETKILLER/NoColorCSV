export interface CsvField {
  /** UTF-16 offsets of the raw field, excluding its delimiter. */
  readonly start: number;
  readonly end: number;
  /** A malformed field cannot be used as a navigation destination. */
  readonly malformed?: true;
}

export interface CsvRecord {
  /** UTF-16 offsets of the record, excluding its line ending. */
  readonly start: number;
  readonly end: number;
  readonly fields: readonly CsvField[];
}

export interface CsvDocument {
  readonly text: string;
  readonly records: readonly CsvRecord[];
  readonly syntaxIssues: readonly CsvIssue[];
}

export type CsvIssueCode = 'unclosedQuote' | 'afterQuote' | 'bareQuote' | 'columnCount' | 'moreProblems';
export interface CsvIssue {
  readonly code: CsvIssueCode;
  readonly severity: 'error' | 'warning' | 'information';
  readonly start: number;
  readonly end: number;
  readonly expected?: number;
  readonly actual?: number;
}

const MAX_RETAINED_SYNTAX_ISSUES = 201;

export interface CsvPosition {
  readonly rowIndex: number;
  readonly columnIndex: number;
}

export interface CsvCellContext extends CsvPosition {
  readonly columnCount: number;
  readonly header: string | undefined;
  readonly value: string;
}

/** Parse CSV records while retaining field offsets for editor navigation. */
export function parseCsv(text: string): CsvDocument {
  const records: CsvRecord[] = [];
  const syntaxIssues: CsvIssue[] = [];
  let fields: CsvField[] = [];
  let recordStart = 0;
  let fieldStart = 0;
  let atFieldStart = true;
  let inQuotes = false;
  let afterQuote = false;
  let quoteStart = -1;
  let malformed = false;
  const reportSyntax = (issue: CsvIssue): void => {
    if (syntaxIssues.length < MAX_RETAINED_SYNTAX_ISSUES) {
      syntaxIssues.push(issue);
    }
  };
  const finishField = (end: number): void => {
    fields.push(malformed ? { start: fieldStart, end, malformed: true } : { start: fieldStart, end });
    malformed = false;
    afterQuote = false;
  };

  for (let index = 0; index < text.length; index += 1) {
    const character = text[index];

    if (index === 0 && character === '\uFEFF') {
      continue;
    }

    if (inQuotes) {
      if (character === '"') {
        if (text[index + 1] === '"') {
          index += 1;
        } else {
          inQuotes = false;
          afterQuote = true;
        }
      }
      continue;
    }

    if (character === ',') {
      finishField(index);
      fieldStart = index + 1;
      atFieldStart = true;
      continue;
    }

    if (character === '\r' || character === '\n') {
      finishField(index);
      records.push({ start: recordStart, end: index, fields });
      if (character === '\r' && text[index + 1] === '\n') {
        index += 1;
      }
      recordStart = index + 1;
      fieldStart = index + 1;
      fields = [];
      atFieldStart = true;
      continue;
    }

    if (character === '"' && atFieldStart) {
      inQuotes = true;
      quoteStart = index;
    } else if (character === '"') {
      reportSyntax({ code: 'bareQuote', severity: 'error', start: index, end: index + 1 });
      malformed = true;
    } else if (afterQuote) {
      reportSyntax({ code: 'afterQuote', severity: 'error', start: index, end: index + 1 });
      malformed = true;
      afterQuote = false;
    }
    atFieldStart = false;
  }

  if (inQuotes) {
    const last = text.length - 1;
    const start = last > 0 && /[\uDC00-\uDFFF]/.test(text[last]) ? last - 1 : last;
    reportSyntax({ code: 'unclosedQuote', severity: 'error', start, end: text.length });
    malformed = true;
  }

  // An empty file still has one place for the cursor. A trailing record
  // separator, however, does not create another logical CSV record.
  if (recordStart < text.length || records.length === 0) {
    finishField(text.length);
    records.push({ start: recordStart, end: text.length, fields });
  }
  return { text, records, syntaxIssues };
}

/** Add column-count warnings to the parse result without rescanning CSV syntax. */
export function validateCsv(document: CsvDocument, hasHeader: boolean, limit = 200): readonly CsvIssue[] {
  if (!Number.isInteger(limit) || limit < 1 || limit > 200) {
    throw new RangeError('Diagnostic limit must be between 1 and 200');
  }
  if (document.text.length === 0) {
    return [];
  }
  const columnIssues: CsvIssue[] = [];
  const baseline = hasHeader ? document.records[0]
    : document.records.find((record) => record.end > record.start);
  if (baseline) {
    for (const record of document.records) {
      if (record.fields.length !== baseline.fields.length) {
        const start = Math.min(record.start, Math.max(0, document.text.length - 1));
        const end = Math.max(start + 1, record.end);
        if (columnIssues.length < limit + 1) {
          columnIssues.push({ code: 'columnCount', severity: 'warning', start, end,
            expected: baseline.fields.length, actual: record.fields.length });
        }
      }
    }
  }
  const issues = [...document.syntaxIssues, ...columnIssues];
  issues.sort((a, b) => a.start - b.start || a.end - b.end);
  if (issues.length > limit) {
    const kept = issues.slice(0, limit);
    const start = Math.max(0, document.text.length - 1);
    kept.push({ code: 'moreProblems', severity: 'information', start, end: document.text.length });
    return kept;
  }
  return issues;
}

function indexAtOffset<T>(items: readonly T[], offset: number, startOf: (item: T) => number): number {
  let low = 0;
  let high = items.length - 1;
  while (low < high) {
    const middle = Math.ceil((low + high) / 2);
    if (startOf(items[middle]) <= offset) {
      low = middle;
    } else {
      high = middle - 1;
    }
  }
  return low;
}

/** Find the logical CSV record and one-based column at a cursor offset. */
export function locateCsvPosition(document: CsvDocument, offset: number): CsvPosition {
  if (!Number.isInteger(offset) || offset < 0 || offset > document.text.length) {
    throw new RangeError('Cursor offset is outside the document');
  }

  const rowIndex = indexAtOffset(document.records, offset, (record) => record.start);
  const fields = document.records[rowIndex].fields;
  const columnIndex = indexAtOffset(fields, offset, (field) => field.start);
  return { rowIndex, columnIndex };
}

/** Decode a field only when it is needed for a message. */
export function getFieldValue(document: CsvDocument, field: CsvField): string {
  let raw = document.text.slice(field.start, field.end);
  if (field.start === 0 && raw.startsWith('\uFEFF')) {
    raw = raw.slice(1);
  }
  if (!raw.startsWith('"')) {
    return raw;
  }

  let value = '';
  for (let index = 1; index < raw.length; index += 1) {
    const character = raw[index];
    if (character === '"') {
      if (raw[index + 1] === '"') {
        value += '"';
        index += 1;
      } else {
        return value + raw.slice(index + 1);
      }
    } else {
      value += character;
    }
  }
  return value;
}

export function getFieldContentStart(document: CsvDocument, field: CsvField): number {
  let start = field.start;
  if (start === 0 && document.text[start] === '\uFEFF') {
    start += 1;
  }
  return document.text[start] === '"' ? start + 1 : start;
}

export function isReliablePosition(document: CsvDocument, offset: number): boolean {
  const { rowIndex, columnIndex } = locateCsvPosition(document, offset);
  return !document.records[rowIndex].fields[columnIndex].malformed;
}

export function hasMalformedNavigationTarget(
  document: CsvDocument, offset: number, kind: 'column' | 'row', direction: -1 | 1
): boolean {
  const { rowIndex, columnIndex } = locateCsvPosition(document, offset);
  if (kind === 'column') {
    return document.records[rowIndex].fields[columnIndex + direction]?.malformed === true;
  }
  for (let row = rowIndex + direction; row >= 0 && row < document.records.length; row += direction) {
    if (document.records[row].fields[columnIndex]?.malformed) {
      return true;
    }
  }
  return false;
}

export function getCellContext(
  document: CsvDocument,
  offset: number,
  hasHeader: boolean
): CsvCellContext {
  const { rowIndex, columnIndex } = locateCsvPosition(document, offset);
  const record = document.records[rowIndex];
  const value = getFieldValue(document, record.fields[columnIndex]);
  const headerField = hasHeader ? document.records[0].fields[columnIndex] : undefined;
  const headerValue = headerField ? getFieldValue(document, headerField).trim() : '';
  return {
    rowIndex,
    columnIndex,
    columnCount: record.fields.length,
    header: headerValue || undefined,
    value
  };
}

export function adjacentColumnOffset(
  document: CsvDocument,
  offset: number,
  direction: -1 | 1
): number | undefined {
  const { rowIndex, columnIndex } = locateCsvPosition(document, offset);
  const target = document.records[rowIndex].fields[columnIndex + direction];
  return target && !target.malformed ? getFieldContentStart(document, target) : undefined;
}

export function adjacentRowOffset(
  document: CsvDocument,
  offset: number,
  direction: -1 | 1
): number | undefined {
  const { rowIndex, columnIndex } = locateCsvPosition(document, offset);
  for (let nextRow = rowIndex + direction;
    nextRow >= 0 && nextRow < document.records.length;
    nextRow += direction) {
    const target = document.records[nextRow].fields[columnIndex];
    if (target && !target.malformed) {
      return getFieldContentStart(document, target);
    }
  }
  return undefined;
}
