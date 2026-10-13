import { locateCsvPosition, parseCsv } from './csv';

/** Return the one-based column at a UTF-16 cursor offset. */
export function getColumnAtOffset(text: string, offset: number): number {
  return locateCsvPosition(parseCsv(text), offset).columnIndex + 1;
}
