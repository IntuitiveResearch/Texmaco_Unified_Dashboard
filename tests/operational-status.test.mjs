import test from 'node:test';
import assert from 'node:assert/strict';
import { build } from 'esbuild';
import { createRequire } from 'node:module';
import { getOperatingStatus, getAssetStatusAppearance } from '../src/utils/assetStatus.ts';

async function loadKpiService() {
  const bundled = await build({ entryPoints: ['src/modules/om/services/kpiService.ts'], bundle: true, write: false, platform: 'node', format: 'cjs', packages: 'external', logLevel: 'silent' });
  const module = { exports: {} };
  new Function('module', 'exports', 'require', bundled.outputFiles[0].text)(module, module.exports, createRequire(import.meta.url));
  return module.exports;
}

test('both compressor API formats produce matching card/dropdown states from RMS current, irrespective of run/load flags', async () => {
  const { fetchOperationalKpi } = await loadKpiService();
  const originalFetch = globalThis.fetch;
  let payload;
  let calls = 0;
  globalThis.fetch = async () => { calls++; return Response.json(payload); };
  try {
    for (const asset of ['CMP#01', 'CMP#02']) {
      for (const rms of [0, 0.001, 101.46]) {
        for (const structured of [false, true]) {
          payload = {
            compressor: asset,
            latest: { current: structured ? { rms_a: rms, run_state: rms === 0 ? 1 : 0, load_state: 0, cycle_id: 17, timestamp: '2026-09-29T16:18:06' } : rms },
            kpis: { availability: 85 }, records_found: 1,
          };
          const source = structuredClone(payload);
          const result = await fetchOperationalKpi(asset, '2026-09-29', '2026-09-29', 'today', true);
          const current = result.latest.current;
          const expectedStatus = rms === 0 ? 'Offline' : 'Online';
          assert.equal(current.rms_a, rms);
          assert.equal(current.run_state, rms === 0 ? 0 : 1);
          assert.equal(getOperatingStatus(current.run_state, current.load_state, asset), expectedStatus);
          assert.equal(getAssetStatusAppearance(expectedStatus).dotClass, rms === 0 ? 'bg-rose-500' : 'bg-emerald-500');
          if (structured) {
            assert.equal(current.timestamp, source.latest.current.timestamp);
            assert.equal(current.cycle_id, 17);
          }
          assert.deepEqual(payload, source, 'Do not mutate the raw API response');
        }
      }
    }
    assert.equal(calls, 12, 'Every case exercises API normalization');
  } finally { globalThis.fetch = originalFetch; }
});

test('old cached false-stopped values are ignored and newly derived current status is reused', async () => {
  const { fetchOperationalKpi, getCachedOperationalKpi } = await loadKpiService();
  const originalFetch = globalThis.fetch;
  const originalWindow = globalThis.window;
  const storage = new Map();
  const legacy = { compressor: 'CMP#01', latest: { current: { rms_a: 101.46, run_state: 0 } } };
  storage.set('om_kpi_CMP01_2026-09-29_2026-09-29_today', JSON.stringify({ data: legacy, timestamp: Date.now() }));
  globalThis.window = { sessionStorage: {
    getItem: key => storage.get(key) ?? null,
    setItem: (key, value) => storage.set(key, value),
    removeItem: key => storage.delete(key),
  } };
  let calls = 0;
  globalThis.fetch = async () => { calls++; return Response.json({ compressor: 'CMP#01', latest: { current: 101.46 }, kpis: {}, records_found: 1 }); };
  try {
    assert.equal(getCachedOperationalKpi('CMP#01', '2026-09-29', '2026-09-29', 'today'), null);
    const first = await fetchOperationalKpi('CMP#01', '2026-09-29', '2026-09-29', 'today');
    assert.equal(first.latest.current.run_state, 1);
    const cached = await fetchOperationalKpi('CMP#01', '2026-09-29', '2026-09-29', 'today');
    assert.equal(cached.latest.current.run_state, 1);
    assert.equal(calls, 1);
    assert.ok(storage.has('om_kpi_v2_CMP01_2026-09-29_2026-09-29_today'));
  } finally {
    globalThis.fetch = originalFetch;
    if (originalWindow === undefined) delete globalThis.window; else globalThis.window = originalWindow;
  }
});
