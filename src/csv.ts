export interface CsvField {
  /** UTF-16 offsets of the raw field, excluding its delimiter. */
  readonly start: number;
  readonly end: number;
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
}

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
  let fields: CsvField[] = [];
  let recordStart = 0;
  let fieldStart = 0;
  let atFieldStart = true;
  let inQuotes = false;

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
        }
      }
      continue;
    }

    if (character === ',') {
      fields.push({ start: fieldStart, end: index });
      fieldStart = index + 1;
      atFieldStart = true;
      continue;
    }

    if (character === '\r' || character === '\n') {
      fields.push({ start: fieldStart, end: index });
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
    }
    atFieldStart = false;
  }

  fields.push({ start: fieldStart, end: text.length });
  records.push({ start: recordStart, end: text.length, fields });
  return { text, records };
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
  return target ? getFieldContentStart(document, target) : undefined;
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
    if (target) {
      return getFieldContentStart(document, target);
    }
  }
  return undefined;
}
