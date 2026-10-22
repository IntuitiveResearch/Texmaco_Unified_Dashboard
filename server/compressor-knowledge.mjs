import { COMPRESSOR_RULES, CNC_RULES, ROBO_RULES, ASSET_KNOWLEDGE_SOURCES, ASSET_KNOWLEDGE_VERSION } from './knowledge/asset-rules.mjs';

const measured = value => typeof value === 'number' && Number.isFinite(value);
const positive = value => measured(value) && value > 0;
const DAY = 86400000;

// Compare the last six completed days only when every daily value is present.
// The comparison is descriptive, not an alarm threshold or a causal correlation.
function recentIncrease(input, series, field) {
  const end = Date.parse(`${input.report_context.end_date}T00:00:00Z`);
  const dates = Array.from({ length: 6 }, (_, index) => new Date(end - (5 - index) * DAY).toISOString().slice(0, 10));
  const byDate = new Map((input.historical.daily[series] || []).map(row => [row.date, row]));
  const values = dates.map(date => byDate.get(date)?.[field]);
  if (!values.every(value => measured(value) && (series !== 'vibration_analysis' || value >= 0))) return null;
  const previous = values.slice(0, 3).reduce((sum, value) => sum + value, 0) / 3;
  const recent = values.slice(3).reduce((sum, value) => sum + value, 0) / 3;
  return recent > previous ? { dates, values, previous_mean: previous, recent_mean: recent, field, series } : null;
}

export function buildAssetKnowledge(input) {
  const isCnc = input.asset.id === 'CNC#01' || input.asset.device_type === 'cnc_cutter';
  const isRobo = input.asset.id === 'ROBO#01' || input.asset.device_type === 'welding_robot';
  const isCompressor = ['CMP#01', 'CMP#02'].includes(input.asset.id) || input.asset.device_type === 'compressor';

  const base = {
    version: isCnc
      ? 'cnc-cutting-knowledge-v1'
      : isRobo
      ? 'robo-welding-knowledge-v1'
      : 'g160-compressor-knowledge-v1',
    usage: 'Conditional hypotheses and verification guidance only; no confirmed faults or diagnostic probabilities.',
    applicability: isCnc
      ? 'Metal Oxide / Flame & Plasma Cutter operating at Texmaco Agarpara.'
      : isRobo
      ? 'Robotic Arm Welder cell operating at Texmaco Agarpara.'
      : 'G 160 V2 with assumed matching specifications for CMP#01 and CMP#02.',
    review_status: 'Reference subset normalized for plant operations; exact OEM/field validation remains pending.',
    observations: [], rules: [], sources: {},
  };

  const observations = [];
  const add = (id, domain, description, evidence) => observations.push({ id, domain, description, evidence });
  const { summary, daily } = input.historical;

  if (isCnc || isRobo) {
    const rulesPool = isCnc ? CNC_RULES : ROBO_RULES;
    const runtime = summary.runtime_seconds || 0;
    const idle = summary.idle_seconds || 0;
    const downtime = summary.downtime_seconds || 0;
    const avgUtil = summary.avg_utilization ?? (input.historical.derived?.mean_daily_loaded_utilization_pct || 0);

    if (idle > 0 && (idle >= runtime || (idle / (runtime + idle + 1)) > 0.35)) {
      add('high_idle_ratio', 'Reliability', `Significant idle time recorded (${Math.round(idle / 3600)}h idle vs ${Math.round(runtime / 3600)}h runtime); process setup or staging delays suspected.`, [{ path: 'historical.summary.idle_seconds', value: idle }]);
    }
    if (avgUtil > 0 && avgUtil < 55) {
      add('low_utilization', 'Reliability', `Overall operational utilization is below 55% (${avgUtil.toFixed(1)}%).`, [{ path: 'historical.summary.avg_utilization', value: avgUtil }]);
    }
    const cycleRows = (daily.cycle_count || []).filter(r => measured(r.cycle_count));
    if (cycleRows.length > 0) {
      const cycleValues = cycleRows.map(r => r.cycle_count);
      const minCycle = Math.min(...cycleValues);
      const maxCycle = Math.max(...cycleValues);
      if (minCycle === 0 || minCycle < maxCycle * 0.4) {
        add('cycle_interruption', 'Reliability', 'Daily cycle completion shows notable dips or zero-cycle workdays during scheduled shifts.', [{ path: 'historical.daily.cycle_count', min: minCycle, max: maxCycle }]);
      }
      add('cycle_count_drop', 'Reliability', 'Workpiece cycle throughput recorded across operational period.', [{ path: 'historical.summary.cycle_count', value: summary.cycle_count }]);
    } else if (summary.cycle_count !== null && summary.cycle_count !== undefined) {
      add('cycle_count_drop', 'Reliability', `Total cycle count recorded: ${summary.cycle_count}.`, [{ path: 'historical.summary.cycle_count', value: summary.cycle_count }]);
    }
    if (downtime > runtime || downtime > 86400) {
      add('extended_downtime', 'Availability', `Accumulated downtime (${Math.round(downtime / 3600)}h) exceeds active running duration.`, [{ path: 'historical.summary.downtime_seconds', value: downtime }]);
    }

    const observedIds = new Set(observations.map(row => row.id));
    const rules = rulesPool.filter(rule => rule.triggers.some(id => observedIds.has(id))).map(rule => {
      const { triggers, ...record } = rule;
      return { ...record, relationship: record.kind === 'candidate_hypothesis' ? 'MAY_CONTRIBUTE_TO' : 'REQUIRES_VERIFICATION', supporting_observation_ids: triggers.filter(id => observedIds.has(id)) };
    });
    const sourceIds = new Set(rules.flatMap(rule => rule.source_refs));
    return { ...base, observations, rules, sources: Object.fromEntries([...sourceIds].map(id => [id, { ...ASSET_KNOWLEDGE_SOURCES[id] }])) };
  }

  // Compressor knowledge logic
  if (!isCompressor || input.asset.equipment?.model !== 'G 160 V2') return base;

  const countEvidence = (summaryField, series, dailyField) => {
    const evidence = [];
    if (positive(summary[summaryField])) evidence.push({ path: `historical.summary.${summaryField}`, value: summary[summaryField] });
    const rows = (daily[series] || []).filter(row => positive(row[dailyField]));
    if (rows.length) evidence.push({ path: `historical.daily.${series}.${dailyField}`, rows: rows.map(row => ({ date: row.date, value: row[dailyField] })) });
    return evidence;
  };
  const interruptionEvidence = countEvidence('trip_count', 'reliability', 'interruptions');
  if (interruptionEvidence.length) add('interruptions', 'Reliability', 'Recorded interruptions are present; planned stops, demand transitions and fault stops have not been separated.', interruptionEvidence);
  const currentEvents = countEvidence('high_current_events', 'events', 'high_current_events');
  if (currentEvents.length) add('current_events', 'Electrical', 'Upstream current events are recorded; their configured threshold is not an OEM overload limit.', currentEvents);
  const thermalEvents = countEvidence('high_temperature_events', 'events', 'high_temperature_events');
  if (thermalEvents.length) add('thermal_events', 'Thermal', 'Upstream temperature events are recorded; sensor location and event threshold need verification.', thermalEvents);
  const currentRows = (daily.current_analysis || []).filter(row => measured(row.average) && row.average >= 0);
  if (currentRows.length >= 2 && new Set(currentRows.map(row => row.average)).size > 1) {
    add('current_variation', 'Electrical', 'Daily average current differs across days; operating loads are not synchronized or matched.', [{ path: 'historical.daily.current_analysis.average', rows: currentRows.map(row => ({ date: row.date, value: row.average })) }]);
  }
  const thermalRise = recentIncrease(input, 'thermal_analysis', 'average');
  if (thermalRise) add('temperature_rise', 'Thermal', 'The recent three-day mean of daily average temperature exceeds the preceding three-day mean. This is not an overheating diagnosis.', [{ path: 'historical.daily.thermal_analysis.average', unit: 'deg C', ...thermalRise }]);
  for (const axis of ['x', 'y', 'z']) {
    const rise = recentIncrease(input, 'vibration_analysis', `axis_${axis}_rms_g`);
    if (rise) {
      add('axis_vibration_rise', 'Vibration', `Axis ${axis.toUpperCase()} recent daily RMS mean increased relative to the preceding three days. Comparable load, mounting and bandwidth remain unverified.`, [{ path: `historical.daily.vibration_analysis.axis_${axis}_rms_g`, unit: 'g', ...rise }]);
      break;
    }
  }
  const vibration = input.latest?.vibration || { available: false, values: {} };
  const vibrationValues = Object.fromEntries(Object.entries(vibration.values || {}).filter(([field, value]) => ['scalar_value', 'axis_x_rms_g', 'axis_y_rms_g', 'axis_z_rms_g'].includes(field) && measured(value) && value >= 0));
  if (Object.keys(vibrationValues).length) add('vibration_snapshot', 'Vibration', 'Vibration readings are available as a snapshot, without a confirmed component diagnosis.', [{ path: 'latest.vibration', values: vibrationValues, units: vibration.units, measured_at: vibration.measured_at, freshness: vibration.freshness?.status }]);
  const temperature = input.latest?.temperature || { available: false, values: {} };
  if (temperature.available || (daily.thermal_analysis || []).some(row => measured(row.average) || measured(row.maximum))) {
    add('thermal_measurement', 'Thermal', 'Thermal measurements require sensor-position and limit verification; a rate alone does not establish absolute temperature.', [{ path: 'latest.temperature', values: temperature.values, measured_at: temperature.measured_at, freshness: temperature.freshness?.status }]);
  }
  const unverified = Object.entries(input.latest || {}).filter(([, sensor]) => sensor?.available && sensor?.freshness?.status !== 'recent');
  if (unverified.length) add('unverified_snapshot', 'Measurement', 'Available snapshots have unverified recency; fetch time is not measurement time.', unverified.map(([name, sensor]) => ({ path: `latest.${name}`, measured_at: sensor.measured_at, freshness: sensor.freshness?.status })));
  const missing = Object.entries(input.latest || {}).filter(([, sensor]) => !sensor?.available).map(([name]) => name);
  if (missing.length) add('missing_sensor', 'Measurement', 'Some latest sensor measurements are unavailable; missing data is not a failed-component diagnosis.', missing.map(name => ({ path: `latest.${name}`, available: false })));

  const observedIds = new Set(observations.map(row => row.id));
  const rules = COMPRESSOR_RULES.filter(rule => rule.triggers.some(id => observedIds.has(id))).map(rule => {
    const { triggers, ...record } = rule;
    return { ...record, relationship: record.kind === 'candidate_hypothesis' ? 'MAY_CONTRIBUTE_TO' : 'REQUIRES_VERIFICATION', supporting_observation_ids: triggers.filter(id => observedIds.has(id)) };
  });
  const sourceIds = new Set(rules.flatMap(rule => rule.source_refs));
  return { ...base, observations, rules, sources: Object.fromEntries([...sourceIds].map(id => [id, { ...ASSET_KNOWLEDGE_SOURCES[id] }])) };
}

export const buildCompressorKnowledge = buildAssetKnowledge;
