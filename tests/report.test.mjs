import test from 'node:test';
import assert from 'node:assert/strict';
import { assembleReportInput, reportWindow } from '../server/report-data.mjs';
import { generateReport, validateReport } from '../server/report-service.mjs';
import { validReport } from './fixtures/report.mjs';

const now = new Date('2026-09-28T12:00:00Z');
const history = () => ({ summary: { availability: 40, trip_count: 0, average_current: '114.9', peak_current: null }, graphs: {
  runtime_distribution: [{ date: '2026-09-27', runtime: 3600, downtime: 82800, offline: 0 }],
  utilization: [{ date: '2026-09-27', loaded: 1800, unloaded: 1800, idle: 0 }],
  thermal_analysis: [{ date: '2026-09-27', maximum: 85 }],
} });
const scalar = () => ({ compressor: 'CMP#01', latest: { current: 114.92, temperature: 101.75, vibration: 0.5447, mfm: { power_kw: 999999 } } });
const structured = () => ({ compressor: 'CMP#02', latest: {
  current: { rms_a: 107, timestamp: '2026-09-28T11:59:00Z' },
  temperature: { instant_rate_c_per_min: 0, timestamp: '2026-09-28T19:51:49.779' },
  motioniq: { axis_x_rms_g: 0.22, axis_y_rms_g: 0.22, axis_z_rms_g: 0.26, timestamp: '2026-09-27T12:00:00Z' },
  mfm: { energy_kwh: 999999 },
} });
test('30 completed days use the plant timezone, including month/year boundaries', () => {
  assert.deepEqual(reportWindow(now), { start_date: '2026-08-29', end_date: '2026-09-27', snapshot_date: '2026-09-28', timezone: 'Asia/Kolkata' });
  assert.deepEqual(reportWindow(new Date('2025-12-31T19:00:00Z')), { start_date: '2025-12-02', end_date: '2025-12-31', snapshot_date: '2026-01-01', timezone: 'Asia/Kolkata' });
});

test('scalar CMP1 readings survive, missing values remain null, and MFM is excluded', () => {
  const input = assembleReportInput('CMP#01', history(), scalar(), now);
  assert.equal(input.historical.summary.trip_count, 0);
  assert.equal(input.historical.summary.average_current, 114.9);
  assert.equal(input.historical.summary.maximum_temperature, null);
  assert.equal(input.latest.temperature.values.temperature_c, 101.75);
  assert.equal(input.latest.vibration.values.scalar_value, 0.5447);
  assert.equal(input.latest.vibration.measured_at, null);
  assert.equal(input.latest.vibration.freshness.status, 'unknown');
  assert.equal(input.historical.derived.mean_daily_loaded_utilization_pct, 50);
  assert.equal(input.historical.coverage.available_days, 1);
  assert.equal(input.historical.coverage.missing_dates.length, 29);
  assert.ok(!JSON.stringify(input).includes('999999'));
  assert.ok(!JSON.stringify(input).includes('power_kw'));
});

test('CMP2 axis vibration and zero thermal rate are preserved; ambiguous timestamps are not treated as live', () => {
  const input = assembleReportInput('CMP#02', history(), structured(), now);
  assert.equal(input.latest.vibration.values.axis_z_rms_g, 0.26);
  assert.equal(input.latest.vibration.freshness.status, 'stale');
  assert.equal(input.latest.current.freshness.status, 'recent');
  assert.equal(input.latest.temperature.values.instant_rate_c_per_min, 0);
  assert.equal(input.latest.temperature.values.temperature_c, null);
  assert.equal(input.latest.temperature.freshness.status, 'unknown');
  assert.ok(!JSON.stringify(input).includes('energy_kwh'));
});

test('no-data, unsupported assets and mismatched snapshots cannot silently generate a healthy report', () => {
  assert.throws(() => assembleReportInput('CNC#01', history(), scalar(), now), /only/);
  assert.throws(() => assembleReportInput('CMP#01', {}, scalar(), now), /No historical/);
  assert.throws(() => assembleReportInput('CMP#01', { graphs: { current_analysis: [{ date: '2026-09-27', average: null }] } }, scalar(), now), /No historical/);
  assert.throws(() => assembleReportInput('CMP#01', history(), structured(), now), /different asset/);
});

test('both compressors receive assumed matching nameplate ratings without invented identities or operating limits', () => {
  const first = assembleReportInput('CMP#01', history(), scalar(), now);
  const second = assembleReportInput('CMP#02', history(), structured(), now);
  const equipment = first.asset.equipment;
  assert.equal(second.asset.equipment.model, equipment.model);
  assert.deepEqual(second.asset.equipment.nameplate_ratings, equipment.nameplate_ratings);
  assert.equal(equipment.serial_number, 'PNB960437');
  assert.equal(second.asset.equipment.serial_number, 'PNB960273');
  assert.equal(equipment.model, 'G 160 V2');
  assert.equal(equipment.assignment_status, 'assumed_same_specifications');
  assert.deepEqual(equipment.nameplate_ratings, { maximum_final_pressure_bar_e: 8.5, rated_free_air_delivery_l_per_s: 478, rated_free_air_delivery_m3_per_min: 28.68, motor_rating_kw: 160 });
  for (const field of ['manufacture_year', 'drive_type', 'cooling_type', 'rated_motor_current_a', 'temperature_limits_c', 'vibration_limits', 'sensor_locations', 'manual_reference']) assert.equal(equipment[field], null);
  assert.ok(!first.data_quality.limitations.some(text => text.includes('serial number is unassigned')));
  assert.ok(!second.data_quality.limitations.some(text => text.includes('serial number is unassigned')));
  assert.ok(first.data_quality.limitations.some(text => text.includes('assumed to match both')));
  assert.notStrictEqual(equipment, second.asset.equipment);
});

test('rows outside the window and duplicate dates do not inflate coverage', () => {
  const raw = history();
  raw.graphs.runtime_distribution.push({ date: '2026-09-28', runtime: 999 }, { date: '2026-09-27', runtime: 999 });
  const input = assembleReportInput('CMP#01', { body: JSON.stringify(raw) }, scalar(), now);
  assert.equal(input.historical.daily.runtime_distribution.length, 1);
  assert.equal(input.historical.daily.runtime_distribution[0].runtime, 3600);
});

test('invalid or incomplete output is rejected, including the previous issue-list format', () => {
  assert.throws(() => validateReport({ compressorIssues: [] }), /missing/);
  assert.throws(() => validateReport({ ...validReport(), severity: 'EXTREME' }), /severity/);
  assert.throws(() => validateReport({ ...validReport(), recommendations: [] }), /3 action categories/);
  const report = validReport(); report.recommendations[0].actions = [];
  assert.throws(() => validateReport(report), /incomplete/);
  assert.equal(validateReport(validReport()).overall_health, 'Fair');
});

test('RCA requires evidence, verification and honest uncertainty, plus each prescribed action category', () => {
  for (const field of ['key_evidence', 'verification']) {
    const report = validReport(); report.root_causes[0][field] = '';
    assert.throws(() => validateReport(report), /root causes/);
  }
  const unsupported = validReport(); unsupported.root_causes[0].status = 'Confirmed';
  assert.throws(() => validateReport(unsupported), /root causes/);
  const inconsistent = validReport(); inconsistent.root_causes[2].confidence = 'High';
  assert.throws(() => validateReport(inconsistent), /root causes/);
  const duplicate = validReport(); duplicate.recommendations[2].category = 'Immediate';
  assert.throws(() => validateReport(duplicate), /categories/);
  const missingVibration = validReport(); missingVibration.conditions[4].domain = 'Thermal';
  assert.throws(() => validateReport(missingVibration), /five distinct/);
  assert.deepEqual(validateReport({ ...validReport(), root_causes: [] }).root_causes, []);
});

test('today KPIs require explicit daily scope; chart gaps remain null rather than zero', () => {
  const snapshot = scalar(); snapshot.kpis = { availability: 80, interruptions: 3, power_kw: 999999 };
  let input = assembleReportInput('CMP#01', history(), snapshot, now);
  assert.equal(input.today_kpis.availability_pct, null);
  snapshot.date_range = { start_date: '2026-09-28', end_date: '2026-09-28' };
  input = assembleReportInput('CMP#01', history(), snapshot, now);
  assert.deepEqual(input.today_kpis, { availability_pct: 80, interruptions: 3 });
  assert.equal(input.historical.chart_days.length, 7);
  assert.equal(input.historical.chart_days[0].date, '2026-09-21');
  assert.equal(input.historical.chart_days[0].runtime_hours, null);
  assert.equal(input.historical.chart_days[6].runtime_hours, 1);
  assert.ok(!JSON.stringify(input).includes('999999'));
});

test('full service fetches history and latest separately, sends no MFM, and returns frozen report KPIs', async () => {
  const calls = [];
  const result = await generateReport('CMP#01', {
    env: { GEMINI_API_KEY: 'test-only', GEMINI_MODEL: 'test-model' }, now,
    fetchImpl: async (url, options) => {
      calls.push({ url, options });
      if (url.endsWith('/dashboard')) return Response.json(history());
      if (url.includes('/operational_kpi?')) return Response.json(scalar());
      const payload = JSON.parse(options.body);
      assert.ok(payload.systemInstruction.parts[0].text.includes('Vibration') || payload.systemInstruction.parts[0].text.includes('vibration'));
      assert.ok(payload.generationConfig.responseSchema.required.includes('recommendations'));
      assert.ok(!payload.contents[0].parts[0].text.includes('999999'));
      const evidence = JSON.parse(payload.contents[0].parts[0].text);
      assert.equal(evidence.asset.equipment.model, 'G 160 V2');
      assert.equal(evidence.asset.equipment.serial_number, 'PNB960437');
      assert.equal(evidence.asset.equipment.nameplate_ratings.motor_rating_kw, 160);
      assert.ok(evidence.knowledge_context.version.includes('g160-compressor-knowledge'));
      assert.ok(evidence.knowledge_context.rules.some(rule => rule.id === 'vibration_measurement_verification'));
      assert.ok(!evidence.knowledge_context.rules.some(rule => rule.id === 'mechanical_vibration_contribution'));
      return Response.json({ candidates: [{ finishReason: 'STOP', content: { parts: [{ text: JSON.stringify({ ...validReport(), root_causes: [] }) }] } }] });
    },
  });
  assert.equal(calls.length, 3);
  assert.deepEqual(JSON.parse(calls[0].options.body), { compressor: 'CMP#01', start_date: '2026-08-29', end_date: '2026-09-27' });
  assert.equal(new URL(calls[1].url).searchParams.get('start_date'), '2026-09-28');
  assert.equal(result.context.kpis.maximum_temperature_c, 85);
  assert.equal(result.context.kpis.restarts, null);
  assert.equal(result.context.kpis.utilization_pct, 50);
  assert.equal(result.context.asset.equipment.model, 'G 160 V2');
  assert.equal(result.context.asset.equipment.serial_number, 'PNB960437');
  assert.equal(result.context.knowledge_version, 'g160-compressor-knowledge-v1');
  assert.ok(result.context.knowledge_rule_ids.includes('vibration_measurement_verification'));
  assert.ok(result.report.limitations.some(text => text.includes('assumed to match both')));
  assert.ok(result.report.limitations.some(text => text.includes('timestamp')));
  assert.ok(!JSON.stringify(result).includes('test-only'));
});

test('missing credentials fail before reading telemetry', async () => {
  await assert.rejects(generateReport('CMP#01', { env: {}, fetchImpl: () => assert.fail('Unexpected network request') }), /GEMINI_API_KEY/);
});

test('upstream failures never fall back to mock measurements', async () => {
  let geminiCalled = false;
  await assert.rejects(generateReport('CMP#01', { env: { GEMINI_API_KEY: 'test' }, now, fetchImpl: async url => {
    if (url.includes('googleapis')) geminiCalled = true;
    return new Response('{}', { status: 503 });
  } }), /unavailable/);
  assert.equal(geminiCalled, false);
});

test('Gemini quota errors and truncated JSON cannot be shown as completed', async () => {
  for (const providerResponse of [new Response('{}', { status: 429 }), Response.json({ candidates: [{ finishReason: 'MAX_TOKENS', content: { parts: [{ text: '{}' }] } }] })]) {
    await assert.rejects(generateReport('CMP#01', { env: { GEMINI_API_KEY: 'test' }, now, fetchImpl: async url => {
      if (url.endsWith('/dashboard')) return Response.json(history());
      if (url.includes('/operational_kpi')) return Response.json(scalar());
      return providerResponse;
    } }), /quota|incomplete/);
  }
});
