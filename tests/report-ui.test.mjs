import test from 'node:test';
import assert from 'node:assert/strict';
import { build } from 'esbuild';
import { mkdtemp, unlink, rmdir } from 'node:fs/promises';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';
import { createServer } from 'node:http';
import { sampleResult as result } from './fixtures/report.mjs';
import { getCompressorEquipment } from '../shared/compressor-equipment.mjs';

async function compiledModule(entry, run) {
  const directory = await mkdtemp(join(process.cwd(), '.report-test-'));
  const outfile = join(directory, 'module.mjs');
  try {
    await build({ entryPoints: [entry], outfile, bundle: true, platform: 'node', format: 'esm', packages: 'external', loader: { '.png': 'dataurl' } });
    await run(await import(pathToFileURL(outfile).href));
  } finally { await unlink(outfile).catch(() => {}); await rmdir(directory); }
}

test('branded PDF retains section order, measured trend gaps, snapshot metadata and multipage footers', async () => {
  await compiledModule('src/modules/management/reportPdf.ts', async ({ createCompressorReportPdf }) => {
    const doc = await createCompressorReportPdf(result());
    const output = doc.output();
    assert.equal(doc.getNumberOfPages(), 2);
    assert.ok(output.includes('COMPRESSOR HEALTH ADVISORY'));
    assert.ok(output.includes('CMP02  |  Compressor ID: PNB960273'));
    assert.ok(!output.includes('DATA SCOPE & LIMITATIONS'));
    assert.ok(!output.includes('Assumed matching specifications'));
    assert.ok(!output.includes('No historical vibration series is available.'));
    assert.ok(!output.includes('Temperature Evidence Limited'));
    assert.ok(!output.includes('Snapshot Requires Verification'));
    assert.ok(!output.includes('Mechanical cause unresolved'));
    assert.ok(!output.includes('MAX OBSERVED TEMP'));
    assert.ok(!output.includes('PNB960437'));
    const titles = ["WHAT'S HAPPENING", 'ROOT CAUSE & EVIDENCE', 'DAILY AVAILABILITY', 'BUSINESS / MAINTENANCE RISK TIMELINE', 'RECOMMENDED ACTIONS'];
    let previous = -1;
    for (const title of titles) { const index = output.indexOf(title); assert.ok(index > previous, `Missing or misplaced ${title}`); previous = index; }
    assert.ok(output.includes('(N/A)'));
    assert.ok(output.includes('(MEDIUM)'));
    assert.ok(output.includes('(30-DAY)'));
    assert.ok(output.includes('(MONITOR)'));
    assert.ok(output.includes('2026-09-27'));
    assert.ok(output.includes(`Page ${doc.getNumberOfPages()} / ${doc.getNumberOfPages()}`));
    // Every text baseline, including auto-paginated tables, stays above the footer region.
    for (const match of output.matchAll(/[-\d.]+ ([\d.]+) Td/g)) assert.ok(Number(match[1]) > 10, 'Text overflowed page bottom');
  });
});

test('CMP2 PDF retains its configured Compressor ID, including older report payloads', async () => {
  await compiledModule('src/modules/management/reportPdf.ts', async ({ createCompressorReportPdf }) => {
    const fixture = result();
    const doc = await createCompressorReportPdf(fixture);
    assert.ok(doc.output().includes('CMP02  |  Compressor ID: PNB960273'));
    delete fixture.context.asset.equipment;
    const legacyDoc = await createCompressorReportPdf(fixture);
    assert.ok(legacyDoc.output().includes('CMP02  |  Compressor ID: PNB960273'));
  });
});

test('CMP1 PDF retains its configured serial number, including older report payloads', async () => {
  await compiledModule('src/modules/management/reportPdf.ts', async ({ createCompressorReportPdf }) => {
    const fixture = result(); fixture.context.asset.id = 'CMP#01';
    fixture.context.asset.equipment = getCompressorEquipment('CMP#01');
    const doc = await createCompressorReportPdf(fixture);
    assert.equal(doc.getNumberOfPages(), 2);
    assert.ok(doc.output().includes('Compressor ID: PNB960437'));
    delete fixture.context.asset.equipment;
    const legacyDoc = await createCompressorReportPdf(fixture);
    assert.ok(legacyDoc.output().includes('Compressor ID: PNB960437'));
  });
});

test('report expands safely for long evidence and never fabricates a cause when none is supported', async () => {
  await compiledModule('src/modules/management/reportPdf.ts', async ({ createCompressorReportPdf }) => {
    const fixture = result(); fixture.report.root_causes = [];
    fixture.report.conditions[0].detail = 'Long supporting evidence requiring continuation. '.repeat(100);
    const doc = await createCompressorReportPdf(fixture);
    assert.ok(doc.getNumberOfPages() > 2);
    assert.ok(!doc.output().includes('ROOT CAUSE & EVIDENCE'));
    assert.ok(!doc.output().includes('Root cause not established'));
    assert.ok(!doc.output().includes('(INSUFFICIENT)'));
    assert.ok(doc.output().includes('RECOMMENDED ACTIONS'));
    assert.ok(doc.output().includes('CONFIDENTIAL / INTERNAL USE ONLY'));
  });
});

test('client PDFs omit the marked CMP1 and CMP2 assessment rows without hiding measured issues or changing the source', async () => {
  await compiledModule('src/modules/management/reportPdf.ts', async ({ createCompressorReportPdf }) => {
    for (const asset of ['CMP#01', 'CMP#02']) {
      const fixture = result();
      fixture.context.asset = { ...fixture.context.asset, id: asset, equipment: getCompressorEquipment(asset) };
      const thermal = fixture.report.conditions.find(row => row.domain === 'Thermal');
      const vibration = fixture.report.conditions.find(row => row.domain === 'Vibration');
      if (asset === 'CMP#01') {
        Object.assign(thermal, { condition: 'Elevated Temperature', concern: 'High', detail: 'The latest measured temperature is 113.75 C. Verify sensor location and applicable OEM limits before declaring an overtemperature fault.' });
        fixture.context.kpis.maximum_temperature_c = 112.8;
        Object.assign(vibration, { condition: 'Indeterminate', concern: 'Unknown', detail: 'A scalar vibration snapshot of 0.6129 has an unknown unit and cannot establish a trend.' });
      } else {
        // Older output can mislabel the concern: an explicit placeholder must still be omitted.
        Object.assign(thermal, { condition: 'Insufficient Data', concern: 'Medium', detail: 'No historical thermal data or absolute temperature is available.' });
        Object.assign(vibration, { condition: 'Vibration: Insufficient Data', concern: 'Unknown', detail: 'A vibration snapshot alone cannot establish a trend.' });
      }
      const original = structuredClone(fixture);
      const doc = await createCompressorReportPdf(fixture);
      const output = doc.output();
      assert.equal(doc.getNumberOfPages(), 2);
      assert.ok(!output.includes('Indeterminate'));
      assert.ok(!output.includes('Insufficient Data'));
      assert.ok(!output.includes('0.6129'));
      assert.ok(output.includes('Recurring Interruptions'));
      assert.ok(output.includes('226'));
      assert.ok(output.includes('173.8 A'));
      assert.ok(output.includes('Load / control cycling'));
      assert.ok(output.includes('Verify:'));
      assert.ok(output.includes('RECOMMENDED ACTIONS'));
      if (asset === 'CMP#01') {
        assert.ok(output.includes('Elevated Temperature'));
        assert.ok(output.includes('113.75 C'));
        assert.ok(output.includes('112.8'));
        assert.ok(output.includes('applicable OEM limits'));
      } else {
        assert.ok(!output.includes('MAX OBSERVED TEMP'));
        assert.ok(!output.includes('No historical thermal data'));
      }
      assert.deepEqual(fixture, original, 'Filtering must not erase internal assessment evidence');
    }
  });
});

test('KPI omissions preserve genuine zeros, finite historical fallback and the severity tile after reflow', async () => {
  await compiledModule('src/modules/management/reportPdf.ts', async ({ createCompressorReportPdf }) => {
    const fixture = result();
    Object.assign(fixture.context.kpis, { today_availability_pct: 0, today_interruptions: 0, maximum_temperature_c: NaN, peak_current_a: Infinity });
    fixture.report.severity = 'High';
    let output = (await createCompressorReportPdf(fixture)).output();
    assert.ok(output.includes("TODAY'S"));
    assert.ok(output.includes('(0.0%)'));
    assert.ok(output.includes('(0)'));
    assert.ok(!output.includes('MAX OBSERVED TEMP'));
    assert.ok(!output.includes('PEAK CURRENT'));
    assert.ok(!output.includes('(NaN)'));
    assert.ok(!output.includes('(Infinity)'));
    assert.ok(output.includes('(HIGH)'));
    assert.ok(output.includes('REVIEW REQUIRED'));

    fixture.context.kpis.today_availability_pct = NaN;
    output = (await createCompressorReportPdf(fixture)).output();
    assert.ok(!output.includes("TODAY'S"));
    assert.ok(output.includes('(30-DAY)'));
    assert.ok(output.includes('(39.3%)'));
  });
});

test('an unassessed report has no empty finding or cause tables and does not claim healthy operation', async () => {
  await compiledModule('src/modules/management/reportPdf.ts', async ({ createCompressorReportPdf }) => {
    const fixture = result();
    fixture.report.conditions.forEach(row => { row.concern = 'Unknown'; row.condition = 'Insufficient Data'; });
    fixture.report.root_causes = [];
    fixture.report.severity = 'Unknown';
    fixture.report.overall_health = 'Insufficient data';
    for (const key of Object.keys(fixture.context.kpis)) fixture.context.kpis[key] = null;
    const output = (await createCompressorReportPdf(fixture)).output();
    assert.ok(!output.includes("WHAT'S HAPPENING"));
    assert.ok(!output.includes('ROOT CAUSE & EVIDENCE'));
    assert.ok(!output.includes('(UNKNOWN)'));
    assert.ok(!output.includes('MORE EVIDENCE'));
    assert.ok(!output.includes('Insufficient Data'));
    assert.ok(!output.includes('(Good)'));
    assert.ok(!output.includes('(Excellent)'));
    assert.ok(output.includes('before assigning a condition rating'));
    assert.ok(output.includes('RECOMMENDED ACTIONS'));
  });
});

test('missing-data words in a qualification do not censor an otherwise assessed measured issue', async () => {
  await compiledModule('src/modules/management/reportPdf.ts', async ({ createCompressorReportPdf }) => {
    const fixture = result();
    Object.assign(fixture.report.conditions[3], {
      concern: 'High', condition: 'Elevated temperature - insufficient data for cause',
      detail: 'Observed temperature is 112.8 C. The cause is unknown; verify sensor location and cooling response.',
    });
    const output = (await createCompressorReportPdf(fixture)).output();
    assert.ok(output.includes('112.8 C'));
    assert.ok(output.includes('verify sensor location'));
    assert.ok(output.includes('Elevated temperature'));
  });
});

test('client deduplicates concurrent generation, permits rerun, and rejects mismatched assets', async () => {
  await compiledModule('src/modules/management/reportClient.ts', async ({ requestCompressorReport }) => {
    const nativeFetch = globalThis.fetch;
    let calls = 0;
    globalThis.fetch = async () => { calls++; return Response.json(result()); };
    try {
      const first = requestCompressorReport('CMP#02');
      const second = requestCompressorReport('CMP#02');
      assert.equal(first, second);
      await first;
      assert.equal(calls, 1);
      await requestCompressorReport('CMP#02');
      assert.equal(calls, 2);
      await assert.rejects(requestCompressorReport('CMP#01'), /invalid/);
    } finally { globalThis.fetch = nativeFetch; }
  });
});

test('HTTP handler handles malformed input, unsupported assets and missing configuration', async () => {
  await compiledModule('api/analyze-report.ts', async ({ default: handler }) => {
    const previousKey = process.env.GEMINI_API_KEY;
    delete process.env.GEMINI_API_KEY;
    const server = createServer(handler);
    try {
      await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
      const endpoint = `http://127.0.0.1:${server.address().port}/api/analyze-report`;
      assert.equal((await fetch(endpoint)).status, 405);
      assert.equal((await fetch(endpoint, { method: 'POST', body: '{' })).status, 400);
      assert.equal((await fetch(endpoint, { method: 'POST', body: JSON.stringify({ compressor: 'CNC#01' }) })).status, 400);
      const missingKey = await fetch(endpoint, { method: 'POST', body: JSON.stringify({ compressor: 'CMP#01' }) });
      assert.equal(missingKey.status, 503);
      assert.match((await missingKey.json()).error, /GEMINI_API_KEY/);
      assert.equal(missingKey.headers.get('cache-control'), 'no-store');
    } finally {
      await new Promise(resolve => server.close(resolve));
      if (previousKey === undefined) delete process.env.GEMINI_API_KEY; else process.env.GEMINI_API_KEY = previousKey;
    }
  });
});
