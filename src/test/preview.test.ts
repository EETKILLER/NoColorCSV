import assert from 'node:assert/strict';
import { test } from 'node:test';
import { parseCsv } from '../csv';
import { isPreviewMessage, previewCellOffset, previewPage } from '../preview';

test('preview maps quoted values, BOM, empty and missing fields to logical rows', () => {
  const text = '\uFEFFname,note,third\r\nAda,"one,\r\ntwo",\r\nBob\r\n';
  const csv = parseCsv(text);
  const page = previewPage(csv, true, 0);
  assert.equal(page.rowCount, 3);
  assert.deepEqual(page.headers, ['name', 'note', 'third']);
  assert.equal(page.rows[1].cells[1].value, 'one,\r\ntwo');
  assert.equal(page.rows[1].cells[2].value, '');
  assert.equal(page.rows[1].cells[2].missing, false);
  assert.equal(page.rows[2].cells[2].missing, true);
  assert.deepEqual(page.rows[2].problems, ['columnCount']);
  assert.equal(previewCellOffset(csv, 1, 1), text.indexOf('one'));
  assert.equal(previewCellOffset(csv, 2, 1), undefined);
  assert.equal(previewCellOffset(csv, 0, 0), 1);
});

test('empty file has no fake row and header setting changes generated labels', () => {
  const empty = previewPage(parseCsv(''), true, 0);
  assert.equal(empty.rowCount, 0);
  assert.deepEqual(empty.headers, []);
  const csv = parseCsv('#literal,"a""b"\n1,2');
  assert.deepEqual(previewPage(csv, true, 0).headers, ['#literal', 'a"b']);
  const withoutHeader = previewPage(csv, false, 0);
  assert.deepEqual(withoutHeader.generatedHeaders, [true, true]);
  assert.deepEqual(withoutHeader.headers, ['', '']);
});

test('pagination never sends more than fifty records and validates message coordinates', () => {
  const csv = parseCsv(Array.from({ length: 100001 }, (_, index) => `${index},x`).join('\n'));
  const page = previewPage(csv, false, 2000);
  assert.equal(page.rows.length, 1);
  assert.equal(page.rows[0].number, 100001);
  assert.equal(page.pageCount, 2001);
  assert.equal(isPreviewMessage({ type: 'jump', version: 1, row: 0, column: 0 }), true);
  assert.equal(isPreviewMessage({ type: 'jump', version: 1, row: -1, column: 0 }), false);
  assert.equal(isPreviewMessage({ type: 'page', version: 1, page: 1.5 }), false);
  assert.equal(isPreviewMessage({ type: 'unknown', version: 1 }), false);
});

test('malformed fields and untrusted markup remain plain data in the model', () => {
  const csv = parseCsv('a,b\n<script>alert(1)</script>,"x"z\n&amp;,https://example.test');
  const page = previewPage(csv, true, 0);
  assert.equal(page.rows[1].cells[0].value, '<script>alert(1)</script>');
  assert.equal(page.rows[1].cells[1].malformed, true);
  assert.equal(page.rows[2].cells[0].value, '&amp;');
  assert.equal(page.rows[2].cells[1].value, 'https://example.test');
});
