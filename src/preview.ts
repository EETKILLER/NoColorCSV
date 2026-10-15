import { CsvDocument, CsvIssue, getFieldContentStart, getFieldValue, validateCsv } from './csv';

export const PREVIEW_PAGE_SIZE = 50;

export interface PreviewCell {
  readonly value: string;
  readonly missing: boolean;
  readonly malformed: boolean;
  readonly problems: readonly CsvIssue['code'][];
}

export interface PreviewRow {
  readonly number: number;
  readonly cells: readonly PreviewCell[];
  readonly problems: readonly CsvIssue['code'][];
}

export interface PreviewPage {
  readonly hasHeader: boolean;
  readonly page: number;
  readonly pageCount: number;
  readonly rowCount: number;
  readonly headers: readonly string[];
  readonly generatedHeaders: readonly boolean[];
  readonly rows: readonly PreviewRow[];
}

export function previewPage(csv: CsvDocument, hasHeader: boolean, requestedPage: number): PreviewPage {
  const records = csv.text.length === 0 ? [] : csv.records;
  const headers = hasHeader && records.length
    ? records[0].fields.map((field) => getFieldValue(csv, field)) : [];
  let columnCount = headers.length;
  for (const record of records) { columnCount = Math.max(columnCount, record.fields.length); }
  const generatedHeaders = Array.from({ length: columnCount }, (_, index) => !headers[index]);
  const displayedHeaders = Array.from({ length: columnCount }, (_, index) => headers[index] || '');
  const pageCount = Math.max(1, Math.ceil(records.length / PREVIEW_PAGE_SIZE));
  const page = Math.max(0, Math.min(pageCount - 1, requestedPage));
  const issues = validateCsv(csv, hasHeader);
  const baseline = hasHeader ? records[0] : records.find((record) => record.end > record.start);
  const rows = records.slice(page * PREVIEW_PAGE_SIZE, (page + 1) * PREVIEW_PAGE_SIZE)
    .map((record, localIndex): PreviewRow => {
      const number = page * PREVIEW_PAGE_SIZE + localIndex + 1;
      const recordIssues: CsvIssue['code'][] = baseline && record.fields.length !== baseline.fields.length
        ? ['columnCount'] : [];
      const cells = displayedHeaders.map((_, index): PreviewCell => {
        const field = record.fields[index];
        if (!field) { return { value: '', missing: true, malformed: false, problems: [] }; }
        const problems = issues.filter((issue) => issue.severity === 'error' &&
          issue.start >= field.start && issue.start <= field.end).map((issue) => issue.code);
        return { value: getFieldValue(csv, field), missing: false,
          malformed: field.malformed === true, problems };
      });
      return { number, cells, problems: recordIssues };
    });
  return { hasHeader, page, pageCount, rowCount: records.length, headers: displayedHeaders,
    generatedHeaders, rows };
}

export function previewCellOffset(csv: CsvDocument, row: number, column: number): number | undefined {
  if (!Number.isInteger(row) || !Number.isInteger(column) || row < 0 || column < 0) { return; }
  const field = csv.records[row]?.fields[column];
  return field ? getFieldContentStart(csv, field) : undefined;
}

export function isPreviewMessage(value: unknown): value is { type: 'ready' | 'page' | 'jump' | 'problems';
  version: number; page?: number; row?: number; column?: number } {
  if (!value || typeof value !== 'object') { return false; }
  const message = value as Record<string, unknown>;
  if (message.type === 'ready') { return true; }
  if (!Number.isSafeInteger(message.version) || (message.version as number) < 0) { return false; }
  if (message.type === 'problems') { return true; }
  if (message.type === 'page') {
    return Number.isSafeInteger(message.page) && (message.page as number) >= 0;
  }
  return message.type === 'jump' && Number.isSafeInteger(message.row) &&
    Number.isSafeInteger(message.column) && (message.row as number) >= 0 &&
    (message.column as number) >= 0;
}
