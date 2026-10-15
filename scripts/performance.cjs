// Deterministic, synthetic CSV fixtures and repeatable Node benchmarks.
const fs = require('node:fs');
const path = require('node:path');
const os = require('node:os');
const crypto = require('node:crypto');
const assert = require('node:assert/strict');
const { performance } = require('node:perf_hooks');
const { parseCsv, locateCsvPosition, adjacentColumnOffset, adjacentRowOffset,
  validateCsv } = require('../out/csv.js');
const { CsvSnapshotCache, getFocusState } = require('../out/focus.js');
const { previewPage } = require('../out/preview.js');

const root = path.join(__dirname, '..');
const fixtureDir = path.join(root, '.perf-fixtures');
const seed = 0x5c5c2026;
const columns = 20;
const cases = [{ name: '1mb', rows: 10_000 }, { name: '10mb', rows: 100_000 }];

function makeFixture(rows) {
  let state = seed;
  const lines = [Array.from({ length: columns }, (_, i) => `c${String(i + 1).padStart(3, '0')}`).join(',')];
  for (let row = 0; row < rows; row += 1) {
    const cells = [];
    for (let column = 0; column < columns; column += 1) {
      state = (Math.imul(state, 1664525) + 1013904223) >>> 0;
      cells.push((state % 36 ** 4).toString(36).padStart(4, '0'));
    }
    lines.push(cells.join(','));
  }
  return `${lines.join('\n')}\n`;
}

function ensureFixtures() {
  fs.mkdirSync(fixtureDir, { recursive: true });
  const metadata = [];
  for (const item of cases) {
    const file = path.join(fixtureDir, `${item.name}.csv`);
    fs.writeFileSync(file, makeFixture(item.rows));
    const bytes = fs.readFileSync(file);
    metadata.push({ file: path.relative(root, file), bytes: bytes.length,
      logicalRecords: item.rows + 1, columns, lineEnding: 'LF', seed,
      sha256: crypto.createHash('sha256').update(bytes).digest('hex') });
  }
  const special = path.join(fixtureDir, 'edge-cases.csv');
  const edgeText = '\uFEFFname,note,extra\r\n中国,"line 1\r\nline 2, ""quoted""",é\r\nbad,"unclosed';
  fs.writeFileSync(special, edgeText);
  const edgeBytes = fs.readFileSync(special);
  metadata.push({ file: path.relative(root, special), bytes: edgeBytes.length,
    logicalRecords: 3, columns: 3, lineEnding: 'CRLF with quoted CRLF', seed: null,
    sha256: crypto.createHash('sha256').update(edgeBytes).digest('hex') });
  return metadata;
}

function distribution(samples) {
  const sorted = [...samples].sort((a, b) => a - b);
  return { medianMs: Number(sorted[Math.floor(sorted.length / 2)].toFixed(3)),
    p95Ms: Number(sorted[Math.ceil(sorted.length * 0.95) - 1].toFixed(3)) };
}

function measure(operation, warmups = 5, repetitions = 30, beforeEach = () => {}) {
  for (let i = 0; i < warmups; i += 1) { beforeEach(); operation(); }
  const samples = [];
  for (let i = 0; i < repetitions; i += 1) {
    beforeEach();
    const start = performance.now();
    operation();
    samples.push(performance.now() - start);
  }
  return distribution(samples);
}

function main() {
  const fixtures = ensureFixtures();
  if (process.argv.includes('--generate')) {
    process.stdout.write(`${JSON.stringify(fixtures, null, 2)}\n`);
    return;
  }
  if (process.argv.includes('--smoke')) {
    const source = fs.readFileSync(path.join(fixtureDir, '1mb.csv'));
    const start = performance.now();
    const parsed = parseCsv(source.toString('utf8'));
    const elapsed = performance.now() - start;
    assert.equal(parsed.records.length, 10_001);
    assert.equal(parsed.records[0].fields.length, columns);
    assert.equal(parsed.records.at(-1).fields.length, columns);
    assert.equal(previewPage(parsed, true, 0).rows.length, 50);
    assert.equal(validateCsv(parsed, true).length, 0);
    const edge = parseCsv(fs.readFileSync(path.join(fixtureDir, 'edge-cases.csv'), 'utf8'));
    assert.equal(edge.records.length, 3);
    assert.equal(edge.syntaxIssues[0].code, 'unclosedQuote');
    assert.ok(elapsed < 5000, `1 MB parsing took ${elapsed.toFixed(0)} ms`);
    assert.equal(crypto.createHash('sha256').update(source).digest('hex'), fixtures[0].sha256);
    process.stdout.write(`Performance smoke passed: 1 MB parse ${elapsed.toFixed(1)} ms; source bytes unchanged.\n`);
    return;
  }
  const text = fs.readFileSync(path.join(fixtureDir, '10mb.csv'), 'utf8');
  let csv;
  if (global.gc) global.gc();
  const memoryBefore = process.memoryUsage();
  const coldParse = measure(() => { csv = parseCsv(text); }, 5, 30,
    () => { csv = undefined; if (global.gc) global.gc(); });
  if (global.gc) global.gc();
  const memoryAfter = process.memoryUsage();
  const middle = csv.records[Math.floor(csv.records.length / 2)].fields[10].start;
  const cache = new CsvSnapshotCache();
  const document = {};
  cache.get(document, 1, () => text);
  const visible = [{ start: middle, end: Math.min(text.length, middle + 5000) }];
  const metrics = {
    coldParse,
    cachedLocate: measure(() => locateCsvPosition(cache.get(document, 1,
      () => { throw new Error('Cache missed'); }), middle)),
    visibleFocus: measure(() => getFocusState(csv, middle, true, visible)),
    nextColumn: measure(() => adjacentColumnOffset(csv, middle, 1)),
    nextRow: measure(() => adjacentRowOffset(csv, middle, 1)),
    validation: measure(() => validateCsv(csv, true)),
    previewFirstCold: measure(() => previewPage({ ...csv }, true, 0)),
    previewFirstPage: measure(() => previewPage(csv, true, 0)),
    previewLaterPage: measure(() => previewPage(csv, true, 1000))
  };
  const result = {
    fixtures, metrics, memory: { rssBeforeMb: Math.round(memoryBefore.rss / 2 ** 20),
      rssAfterMb: Math.round(memoryAfter.rss / 2 ** 20),
      rssDeltaMb: Math.round((memoryAfter.rss - memoryBefore.rss) / 2 ** 20),
      heapDeltaMb: Math.round((memoryAfter.heapUsed - memoryBefore.heapUsed) / 2 ** 20),
      heapUsedMb: Math.round(process.memoryUsage().heapUsed / 2 ** 20) },
    machine: { platform: process.platform, release: os.release(), arch: process.arch,
      cpu: os.cpus()[0].model, logicalCpus: os.cpus().length,
      totalMemoryGb: Number((os.totalmem() / 2 ** 30).toFixed(1)), node: process.version },
    commit: require('node:child_process').execFileSync('git', ['rev-parse', 'HEAD'],
      { cwd: root, encoding: 'utf8' }).trim(),
    measurements: { warmups: 5, repetitions: 30, clock: 'performance.now',
      scope: 'Node process, excluding editor debounce, Webview DOM and extension host' }
  };
  process.stdout.write(`${JSON.stringify(result, null, 2)}\n`);
}

main();
