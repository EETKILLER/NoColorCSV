import assert from 'node:assert/strict';
import { test } from 'node:test';
import { getColumnAtOffset } from '../column';
import {
  adjacentColumnOffset,
  adjacentRowOffset,
  getCellContext,
  locateCsvPosition,
  parseCsv
} from '../csv';

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
