import assert from 'node:assert/strict';
import { test } from 'node:test';
import { getColumnAtOffset } from '../column';
import {
  adjacentColumnOffset,
  adjacentRowOffset,
  getCellContext,
  locateCsvPosition,
  parseCsv,
  validateCsv
} from '../csv';
import { CsvSnapshotCache, getFocusState } from '../focus';

test('counts ordinary columns from one', () => {
  const csv = 'name,age,city';
  assert.equal(getColumnAtOffset(csv, 0), 1);
  assert.equal(getColumnAtOffset(csv, 4), 1);
  assert.equal(getColumnAtOffset(csv, 5), 2);
  assert.equal(getColumnAtOffset(csv, csv.length), 3);
});

test('spaces do not split columns in a CSV row', () => {
  const csv = '1212 5454 5454, 5252, 525';
  assert.equal(getColumnAtOffset(csv, csv.indexOf('5454')), 1);
  assert.equal(getColumnAtOffset(csv, csv.indexOf('5252')), 2);
  assert.equal(getColumnAtOffset(csv, csv.lastIndexOf('525')), 3);
});

test('fullwidth Chinese commas are text, not CSV separators', () => {
  const csv = '2522，424，424';
  assert.equal(getColumnAtOffset(csv, csv.length), 1);
});

test('ignores commas inside quoted fields', () => {
  const csv = 'Ada,"London, UK",42';
  assert.equal(getColumnAtOffset(csv, csv.indexOf('UK')), 2);
  assert.equal(getColumnAtOffset(csv, csv.length), 3);
});

test('handles escaped quotes inside quoted fields', () => {
  const csv = '1,"said ""hello, world""",3';
  assert.equal(getColumnAtOffset(csv, csv.indexOf('world')), 2);
  assert.equal(getColumnAtOffset(csv, csv.length), 3);
});

test('recognizes a quoted first field after a UTF-8 BOM', () => {
  const csv = '\uFEFF"first, field",second';
  assert.equal(getColumnAtOffset(csv, csv.indexOf('field')), 1);
  assert.equal(getColumnAtOffset(csv, csv.length), 2);
});

test('keeps the column across line breaks inside quotes', () => {
  const csv = 'id,note,value\r\n1,"first line\r\nsecond, line",done';
  assert.equal(getColumnAtOffset(csv, csv.indexOf('second')), 2);
  assert.equal(getColumnAtOffset(csv, csv.indexOf('done')), 3);
});

test('resets the column at ordinary LF and CRLF row breaks', () => {
  assert.equal(getColumnAtOffset('a,b\nc,d', 5), 1);
  assert.equal(getColumnAtOffset('a,b\r\nc,d', 6), 1);
});

test('handles empty fields and rejects offsets outside the document', () => {
  assert.equal(getColumnAtOffset(',,', 2), 3);
  assert.equal(getColumnAtOffset('', 0), 1);
  assert.throws(() => getColumnAtOffset('a', -1), RangeError);
  assert.throws(() => getColumnAtOffset('a', 2), RangeError);
});

test('provides header, value, and logical row across a multiline quoted cell', () => {
  const text = 'name,city,note\r\nAda,"London,\r\nUK","said ""Hi"""';
  const csv = parseCsv(text);
  const city = getCellContext(csv, text.indexOf('UK'), true);
  assert.equal(city.rowIndex, 1);
  assert.equal(city.columnIndex, 1);
  assert.equal(city.columnCount, 3);
  assert.equal(city.header, 'city');
  assert.equal(city.value, 'London,\r\nUK');
  assert.equal(getCellContext(csv, text.indexOf('UK'), false).header, undefined);
  assert.equal(getCellContext(csv, text.indexOf('said'), true).value, 'said "Hi"');
});

test('navigates between quoted and empty fields', () => {
  const text = 'name,city,note\nAda,"London, UK",';
  const csv = parseCsv(text);
  const ada = text.indexOf('Ada');
  const city = adjacentColumnOffset(csv, ada, 1);
  assert.equal(city, text.indexOf('London'));
  assert.equal(adjacentColumnOffset(csv, city!, 1), text.length);
  assert.equal(adjacentColumnOffset(csv, ada, -1), undefined);
  assert.equal(getCellContext(csv, text.length, true).value, '');
});

test('moves to the same column in another logical row, skipping short rows', () => {
  const text = 'a,b,c\n1,2\n3,4,5';
  const csv = parseCsv(text);
  const headerThird = text.indexOf('c');
  const lastThird = text.lastIndexOf('5');
  assert.equal(adjacentRowOffset(csv, headerThird, 1), lastThird);
  assert.equal(adjacentRowOffset(csv, lastThird, -1), headerThird);
  assert.equal(adjacentRowOffset(csv, lastThird, 1), undefined);
});

test('locates rows at CRLF boundaries and decodes a BOM header', () => {
  const text = '\uFEFF"name",age\r\nAda,42';
  const csv = parseCsv(text);
  assert.deepEqual(locateCsvPosition(csv, text.indexOf('Ada')), { rowIndex: 1, columnIndex: 0 });
  assert.equal(getCellContext(csv, text.indexOf('Ada'), true).header, 'name');
  assert.equal(adjacentRowOffset(csv, text.indexOf('name'), 1), text.indexOf('Ada'));
});

test('treats a final LF, CRLF, or CR as a terminator, not an empty record', () => {
  for (const ending of ['\n', '\r\n', '\r']) {
    const text = `a,b${ending}`;
    const csv = parseCsv(text);
    assert.equal(csv.records.length, 1);
    assert.deepEqual(locateCsvPosition(csv, text.length), { rowIndex: 0, columnIndex: 1 });
    assert.equal(adjacentRowOffset(csv, 0, 1), undefined);
  }
  const empty = parseCsv('');
  assert.equal(empty.records.length, 1);
  assert.deepEqual(empty.records[0].fields, [{ start: 0, end: 0 }]);
  assert.equal(parseCsv('\n').records.length, 1);
  assert.equal(parseCsv('a\n\n').records.length, 2);
});

test('focus follows logical records and skips short rows without creating cells', () => {
  const text = 'a,b,c\r\n1,"x,\r\ny",3\r\n2\r\n4,,6';
  const csv = parseCsv(text);
  const cursor = text.indexOf('y');
  const focus = getFocusState(csv, cursor, true, [{ start: 0, end: text.length }]);
  assert.equal(focus.cell.rowIndex, 1);
  assert.equal(focus.cell.columnIndex, 1);
  assert.equal(focus.cell.header, 'b');
  assert.deepEqual(focus.current, [{ start: text.indexOf('"x,'), end: text.indexOf('"', cursor) + 1 }]);
  assert.deepEqual(focus.column, [
    { start: text.indexOf('b'), end: text.indexOf('b') + 1 },
    { start: text.lastIndexOf(',,') + 1, end: text.lastIndexOf(',,') + 1 }
  ]);
});

test('focus clips long quoted fields to visible offsets', () => {
  const text = 'a,b\n1,"first\nsecond\nthird"\n2,';
  const csv = parseCsv(text);
  const start = text.indexOf('second');
  const focus = getFocusState(csv, start, false, [{ start, end: start + 6 }]);
  assert.deepEqual(focus.current, [{ start, end: start + 6 }]);
  assert.deepEqual(focus.column, []);
  assert.equal(getFocusState(csv, text.length, false, [{ start: text.length, end: text.length }]).current.length, 1);
});

test('viewport boundaries do not turn non-empty cells into empty markers', () => {
  const text = 'a,b\n1,2';
  const csv = parseCsv(text);
  const second = text.indexOf('2');
  assert.deepEqual(getFocusState(csv, second, false, [{ start: second, end: second }]).current, []);
  assert.deepEqual(getFocusState(csv, second, false, [{ start: second - 1, end: second }]).current, []);
  assert.deepEqual(getFocusState(csv, text.length, false, [{ start: second, end: text.length }]).current,
    [{ start: second, end: text.length }]);
});

test('focus uses UTF-16 offsets and decodes escaped quotes and BOM', () => {
  const text = '\uFEFF"😀,x",b\n1,"a""b"';
  const csv = parseCsv(text);
  const focus = getFocusState(csv, text.indexOf('x'), true, [{ start: 0, end: text.length }]);
  assert.equal(focus.cell.columnIndex, 0);
  assert.equal(focus.cell.value, '😀,x');
  assert.equal(getCellContext(csv, text.indexOf('a""b'), true).value, 'a"b');
  assert.equal(csv.records[0].fields[0].end, 7);
});

test('snapshot cache reuses one version and reparses after a document change', () => {
  const cache = new CsvSnapshotCache<object>();
  const document = {};
  let reads = 0;
  const first = cache.get(document, 1, () => { reads += 1; return 'a,b'; });
  assert.equal(cache.get(document, 1, () => { throw Error('unexpected read'); }), first);
  const second = cache.get(document, 2, () => { reads += 1; return 'a,b\n1,2'; });
  assert.notEqual(second, first);
  assert.equal(reads, 2);
  cache.delete(document);
  assert.notEqual(cache.get(document, 2, () => 'a,b'), second);
});

test('keeps tolerant positioning in malformed CSV and reports syntax errors', () => {
  const unclosed = parseCsv('a,"unfinished\ncontinuation');
  assert.equal(unclosed.records.length, 1);
  assert.equal(getCellContext(unclosed, unclosed.text.length, false).value, 'unfinished\ncontinuation');

  const trailing = parseCsv('a,"x"junk,b');
  assert.equal(trailing.records[0].fields.length, 3);
  assert.equal(getCellContext(trailing, trailing.text.indexOf('junk'), false).value, 'xjunk');

  const bare = parseCsv('abc"def,ghi');
  assert.equal(bare.records[0].fields.length, 2);
  assert.equal(getCellContext(bare, 0, false).value, 'abc"def');
  assert.deepEqual(unclosed.syntaxIssues.map((issue) => issue.code), ['unclosedQuote']);
  assert.deepEqual(trailing.syntaxIssues.map((issue) => issue.code), ['afterQuote']);
  assert.deepEqual(bare.syntaxIssues.map((issue) => issue.code), ['bareQuote']);
  assert.equal(adjacentColumnOffset(trailing, 0, 1), undefined);
});

test('diagnoses malformed quotes at UTF-16 offsets and accepts legal quoting', () => {
  for (const text of ['a,b\r\n1,"x,y"', '\uFEFF"a""b",c\r1,2\n', 'a,"line\r\nb",']) {
    assert.deepEqual(validateCsv(parseCsv(text), true), []);
  }
  const cases = [
    { text: 'a,b\n1,"x', code: 'unclosedQuote', offset: 7 },
    { text: 'a,b\n1,"x"z', code: 'afterQuote', offset: 9 },
    { text: 'a,b\n1,foo"bar', code: 'bareQuote', offset: 9 },
    { text: '😀,"x"z', code: 'afterQuote', offset: 6 }
  ];
  for (const { text, code, offset } of cases) {
    const issue = validateCsv(parseCsv(text), true).find((item) => item.code === code);
    assert.equal(issue?.severity, 'error');
    assert.deepEqual([issue?.start, issue?.end], [offset, offset + 1]);
  }
});

test('compares logical record widths using header or first nonblank record', () => {
  const csv = parseCsv('a,b\n1\n2,\n');
  assert.deepEqual(validateCsv(csv, true).map((issue) => issue.code), ['columnCount']);
  assert.deepEqual([validateCsv(csv, true)[0].expected, validateCsv(csv, true)[0].actual], [2, 1]);
  const noHeader = parseCsv('\n""\nvalue,extra');
  assert.deepEqual(validateCsv(noHeader, false).map((issue) => issue.code),
    ['columnCount']);
  assert.equal(validateCsv(noHeader, false)[0].start, noHeader.text.indexOf('value'));
  assert.deepEqual(validateCsv(parseCsv(''), true), []);
  assert.deepEqual(validateCsv(parseCsv('a,b\r\n1,2\r\n'), true), []);
  assert.equal(validateCsv(parseCsv('a\n\n'), true).length, 0);
});

test('caps diagnostics and provides a final text explanation', () => {
  const issues = validateCsv(parseCsv('a,b\n1\n2\n3\n4'), true, 2);
  assert.deepEqual(issues.map((issue) => issue.code), ['columnCount', 'columnCount', 'moreProblems']);
  const mixed = validateCsv(parseCsv('a,b\n1\n"x"z,ok\n2'), true, 2);
  assert.deepEqual(mixed.map((issue) => issue.code), ['columnCount', 'afterQuote', 'moreProblems']);
  assert.equal(parseCsv('x"'.repeat(300)).syntaxIssues.length, 201);
});
