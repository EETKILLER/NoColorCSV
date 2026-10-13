/**
 * Return the one-based CSV column at a cursor offset.
 *
 * The scanner follows CSV quoting rules: a quote starts a quoted field only at
 * the start of a field, two quotes inside a quoted field mean one literal quote,
 * and commas or line breaks inside quotes are field content.
 */
export function getColumnAtOffset(text: string, offset: number): number {
  if (!Number.isInteger(offset) || offset < 0 || offset > text.length) {
    throw new RangeError('Cursor offset is outside the document');
  }

  let column = 1;
  let atFieldStart = true;
  let inQuotes = false;

  for (let index = 0; index < offset; index += 1) {
    const character = text[index];

    // A UTF-8 BOM is not part of the first CSV field.
    if (index === 0 && character === '\uFEFF') {
      continue;
    }

    if (inQuotes) {
      if (character === '"') {
        if (text[index + 1] === '"') {
          // Consume an escaped quote as content, including when the cursor
          // falls between the two quote characters.
          index += 1;
        } else {
          inQuotes = false;
        }
      }
      continue;
    }

    if (character === ',') {
      column += 1;
      atFieldStart = true;
    } else if (character === '\r' || character === '\n') {
      column = 1;
      atFieldStart = true;
    } else if (character === '"' && atFieldStart) {
      inQuotes = true;
      atFieldStart = false;
    } else {
      atFieldStart = false;
    }
  }

  return column;
}
