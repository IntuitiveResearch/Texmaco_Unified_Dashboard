import test from 'node:test';
import assert from 'node:assert/strict';
import { assembleReportInput } from '../server/report-data.mjs';
import { buildCompressorKnowledge } from '../server/compressor-knowledge.mjs';
import { validateReport } from '../server/report-service.mjs';
import { validReport } from './fixtures/report.mjs';

const now = new Date('2026-09-28T12:00:00Z');
const recentTimestamp = '2026-09-28T11:59:00Z';
const rows = (values, field) => values.map((value, index) => ({ date: `2026-09-${22 + index}`, [field]: value }));
function evidence({ summary = {}, graphs = {}, latest, asset = 'CMP#02' } = {}) {
  return assembleReportInput(asset, { summary: { availability: 95, trip_count: 0, ...summary }, graphs }, {
    compressor: asset,
    latest: latest ?? {
      current: { rms_a: 100, timestamp: recentTimestamp },
      temperature: { temperature_c: 50, timestamp: recentTimestamp },
      motioniq: { axis_x_rms_g: 0.2, axis_y_rms_g: 0.2, axis_z_rms_g: 0.2, timestamp: recentTimestamp },
      mfm: { power_kw: 999999 },
    },
  }, now);
}
const ruleIds = context => context.rules.map(rule => rule.id);

test('snapshots alone select verification guidance without manufacturing fault candidates or thresholds', () => {
  const context = buildCompressorKnowledge(evidence());
  assert.ok(ruleIds(context).includes('vibration_measurement_verification'));
  assert.ok(ruleIds(context).includes('thermal_measurement_verification'));
  assert.ok(context.rules.every(rule => rule.kind === 'verification_only' && rule.possible_cause === null));
  assert.ok(context.review_status.includes('pending'));
  assert.ok(!JSON.stringify(context).includes('999999'));
  assert.ok(!JSON.stringify(context).includes('power_kw'));
});

test('recorded interruptions and current events select conditional control and motor-duty hypotheses', () => {
  const context = buildCompressorKnowledge(evidence({ summary: { trip_count: 4, high_current_events: 2 } }));
  assert.ok(ruleIds(context).includes('load_control_transitions'));
  assert.ok(ruleIds(context).includes('motor_current_behavior'));
  assert.ok(!ruleIds(context).includes('cooling_heat_rejection'));
  assert.ok(!ruleIds(context).includes('mechanical_vibration_contribution'));
  const current = context.observations.find(row => row.id === 'current_events');
  assert.deepEqual(current.evidence, [{ path: 'historical.summary.high_current_events', value: 2 }]);
  assert.ok(context.rules.filter(rule => rule.kind === 'candidate_hypothesis').every(rule => rule.relationship === 'MAY_CONTRIBUTE_TO'));
  assert.ok(context.sources.atlas_g.scope.includes('not exact G 160 V2 limits'));
});

test('temperature comparisons require consecutive averages and keep oil filter separate from cooling components', () => {
  const increasing = rows([50, 50, 50, 60, 60, 60], 'average');
  const context = buildCompressorKnowledge(evidence({ graphs: { thermal_analysis: increasing } }));
  assert.ok(ruleIds(context).includes('cooling_heat_rejection'));
  assert.ok(ruleIds(context).includes('lubrication_flow_condition'));
  const observation = context.observations.find(row => row.id === 'temperature_rise');
  assert.equal(observation.evidence[0].previous_mean, 50);
  assert.equal(observation.evidence[0].recent_mean, 60);
  assert.ok(!context.rules.find(rule => rule.id === 'cooling_heat_rejection').components.includes('oil filter'));
  for (const thermal_analysis of [increasing.filter((_, index) => index !== 1), rows([60, 60, 60, 50, 50, 50], 'average'), rows([50, 50, 50, 60, 60, 60], 'maximum')]) {
    const withoutRise = buildCompressorKnowledge(evidence({ graphs: { thermal_analysis } }));
    assert.ok(!ruleIds(withoutRise).includes('cooling_heat_rejection'));
  }
});

test('a thermal rate alone never selects an overheating or cooling-failure hypothesis', () => {
  const context = buildCompressorKnowledge(evidence({ latest: { temperature: { instant_rate_c_per_min: 2, sustained_rise_min: 15, timestamp: recentTimestamp } } }));
  assert.ok(ruleIds(context).includes('thermal_measurement_verification'));
  assert.ok(!ruleIds(context).includes('cooling_heat_rejection'));
  assert.ok(!ruleIds(context).includes('lubrication_flow_condition'));
});

test('historical axis RMS increase permits mechanical investigation, while unknown-unit scalar and snapshot magnitudes do not', () => {
  const vibration_analysis = rows([0.1, 0.1, 0.1, 0.2, 0.2, 0.2], 'axis_z_rms_g');
  const context = buildCompressorKnowledge(evidence({ graphs: { vibration_analysis } }));
  assert.ok(ruleIds(context).includes('mechanical_vibration_contribution'));
  assert.equal(context.observations.find(row => row.id === 'axis_vibration_rise').evidence[0].unit, 'g');
  const scalar = buildCompressorKnowledge(evidence({ asset: 'CMP#01', latest: { vibration: 1000 }, graphs: { vibration_analysis: rows([10, 10, 10, 20, 20, 20], 'average') } }));
  assert.ok(ruleIds(scalar).includes('vibration_measurement_verification'));
  assert.ok(!ruleIds(scalar).includes('mechanical_vibration_contribution'));
  const gap = buildCompressorKnowledge(evidence({ graphs: { vibration_analysis: vibration_analysis.slice(1) } }));
  assert.ok(!ruleIds(gap).includes('mechanical_vibration_contribution'));
});

test('missing or stale snapshots select evidence collection without diagnosing failed sensors', () => {
  const context = buildCompressorKnowledge(evidence({ latest: { current: { rms_a: 100, timestamp: '2026-09-27T12:00:00Z' } } }));
  assert.ok(ruleIds(context).includes('measurement_event_alignment'));
  assert.ok(context.rules.every(rule => rule.kind === 'verification_only'));
  const wrongModel = evidence(); wrongModel.asset.equipment.model = 'Unknown';
  assert.deepEqual(buildCompressorKnowledge(wrongModel).rules, []);
});

test('report causes must reference selected candidate rules and their actual observations', () => {
  const context = buildCompressorKnowledge(evidence({ summary: { trip_count: 4 } }));
  const report = () => ({ ...validReport(), root_causes: [{ ...validReport().root_causes[0], knowledge_rule_id: 'load_control_transitions', supporting_observation_ids: ['interruptions'] }] });
  assert.equal(validateReport(report(), context).root_causes.length, 1);
  for (const patch of [
    { knowledge_rule_id: 'mechanical_vibration_contribution' },
    { knowledge_rule_id: 'vibration_measurement_verification', supporting_observation_ids: ['vibration_snapshot'] },
    { supporting_observation_ids: [] },
    { supporting_observation_ids: ['current_events'] },
    { supporting_observation_ids: ['interruptions', 'interruptions'] },
    { knowledge_rule_id: undefined },
  ]) {
    const invalid = report(); Object.assign(invalid.root_causes[0], patch);
    assert.throws(() => validateReport(invalid, context), /not supported/);
  }
  const noCandidates = buildCompressorKnowledge(evidence());
  assert.throws(() => validateReport(report(), noCandidates), /not supported/);
  assert.deepEqual(validateReport({ ...validReport(), root_causes: [] }, noCandidates).root_causes, []);
});
