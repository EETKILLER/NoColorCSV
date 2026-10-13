import assert from 'node:assert/strict';
import { test } from 'node:test';
import { getColumnAtOffset } from '../column';

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
