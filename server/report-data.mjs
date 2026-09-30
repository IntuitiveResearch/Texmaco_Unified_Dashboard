import { getCompressorEquipment } from '../shared/compressor-equipment.mjs';

// Reporting uses raw API responses, never the UI's zero/mock fallback normalizers.
export const SUPPORTED_ASSETS = ['CMP#01', 'CMP#02'];
export const TIMEZONE = 'Asia/Kolkata';
const DAY = 86400000;
const numeric = value => (typeof value === 'number' || (typeof value === 'string' && value.trim() !== ''))
  && Number.isFinite(Number(value)) ? Number(value) : null;
const object = value => value && typeof value === 'object' && !Array.isArray(value) ? value : {};

export function unwrapResponse(raw) {
  const value = raw?.body !== undefined ? (typeof raw.body === 'string' ? JSON.parse(raw.body) : raw.body) : raw;
  if (!value || typeof value !== 'object' || value.error || raw?.statusCode >= 400) {
    throw new Error('Telemetry source returned an invalid response.');
  }
  return value;
}

export function reportWindow(now = new Date()) {
  const parts = Object.fromEntries(new Intl.DateTimeFormat('en-GB', {
    timeZone: TIMEZONE, year: 'numeric', month: '2-digit', day: '2-digit',
  }).formatToParts(now).map(p => [p.type, p.value]));
  const today = `${parts.year}-${parts.month}-${parts.day}`;
  const midnight = Date.parse(`${today}T00:00:00Z`);
  const date = offset => new Date(midnight + offset * DAY).toISOString().slice(0, 10);
  return { start_date: date(-30), end_date: date(-1), snapshot_date: today, timezone: TIMEZONE };
}

const SUMMARY_FIELDS = `runtime_seconds downtime_seconds offline_seconds availability runtime_percentage downtime_percentage offline_percentage trip_count restart_count mtbi_seconds recovery_time_seconds average_runtime_seconds longest_runtime_seconds longest_downtime_seconds average_current median_current minimum_current maximum_current p95_current standard_deviation_current variance_current peak_current loaded_runtime_seconds unloaded_runtime_seconds idle_runtime_seconds idle_percentage high_current_events high_current_duration current_sampling_interval current_coverage average_temperature median_temperature minimum_temperature maximum_temperature p95_temperature standard_deviation_temperature variance_temperature temperature_range high_temperature_events high_temperature_duration average_temperature_rise average_temperature_fall temperature_drift temperature_sampling_interval temperature_coverage`.split(' ');
const GRAPH_FIELDS = {
  runtime_distribution: ['runtime', 'downtime', 'offline'],
  availability: ['value'],
  current_analysis: ['average', 'median', 'p95', 'peak'],
  thermal_analysis: ['average', 'median', 'maximum', 'deviation'],
  thermal_rates: ['heating_rate', 'cooling_rate'],
  utilization: ['loaded', 'unloaded', 'idle'],
  reliability: ['interruptions', 'restarts', 'average_run_length', 'mtbi', 'recovery_time'],
  events: ['high_current_events', 'high_temperature_events'],
  vibration_analysis: ['average', 'median', 'maximum', 'peak', 'axis_x_rms_g', 'axis_y_rms_g', 'axis_z_rms_g'],
};

function pickNumbers(raw, fields) {
  return Object.fromEntries(fields.map(key => [key, numeric(raw?.[key])]));
}

function freshness(timestamp, now) {
  if (!timestamp || !/(Z|[+-]\d{2}:?\d{2})$/i.test(timestamp)) return { status: 'unknown', age_seconds: null };
  const parsed = Date.parse(timestamp);
  if (!Number.isFinite(parsed)) return { status: 'unknown', age_seconds: null };
  const seconds = (now.getTime() - parsed) / 1000;
  return { status: seconds < -60 ? 'future_timestamp' : seconds > 300 ? 'stale' : 'recent', age_seconds: Math.round(seconds) };
}

function sensor(raw, kind, now) {
  const fields = {
    current: ['rms_a', 'run_state', 'load_state', 'diag_flags'],
    temperature: ['temperature_c', 'instant_rate_c_per_min', 'cooling_rate_c_per_min', 'sustained_rise_min', 'rise_incidents', 'cooling_phase', 'stress_hours', 'rolling_variance', 'diag_flags'],
    vibration: ['axis_x_rms_g', 'axis_y_rms_g', 'axis_z_rms_g', 'axis_x_kurtosis', 'axis_y_kurtosis', 'axis_z_kurtosis', 'axis_x_crest', 'axis_y_crest', 'axis_z_crest', 'max_kurtosis', 'state_tag'],
  }[kind];
  const source = object(raw);
  const values = pickNumbers(source, fields);
  if (typeof raw !== 'object' && numeric(raw) !== null) {
    values[kind === 'current' ? 'rms_a' : kind === 'temperature' ? 'temperature_c' : 'scalar_value'] = numeric(raw);
  }
  const measured_at = typeof source.timestamp === 'string' ? source.timestamp.slice(0, 80) : null;
  return {
    available: Object.values(values).some(v => v !== null), values, measured_at,
    freshness: freshness(measured_at, now),
    units: kind === 'current' ? 'rms_a: A' : kind === 'temperature'
      ? 'temperature_c: deg C; *_c_per_min: deg C/min; *_min: minutes; stress_hours: hours'
      : 'axis_*_rms_g: g; kurtosis and crest: dimensionless; scalar_value: unknown unit',
  };
}

export function assembleReportInput(asset, historyRaw, snapshotRaw, now = new Date()) {
  if (!SUPPORTED_ASSETS.includes(asset)) throw new Error('Reports support Compressor 1 and 2 only.');
  const history = unwrapResponse(historyRaw);
  const snapshot = unwrapResponse(snapshotRaw);
  if (snapshot.compressor && snapshot.compressor.replace('#', '') !== asset.replace('#', '')) {
    throw new Error('Latest telemetry belongs to a different asset.');
  }
  const window = reportWindow(now);
  const equipment = getCompressorEquipment(asset);
  const limitations = ['G 160 V2 model and nameplate ratings are assumed to match both compressors; manufacture year is unassigned.'];
  if (!equipment.serial_number) limitations.push('Individual compressor serial number is unassigned.');
  const summary = pickNumbers(history.summary, SUMMARY_FIELDS);
  const daily = {};
  const missingDates = {};
  const requestedDates = Array.from({ length: 30 }, (_, i) => new Date(Date.parse(`${window.start_date}T00:00:00Z`) + i * DAY).toISOString().slice(0, 10));
  for (const [key, fields] of Object.entries(GRAPH_FIELDS)) {
    const rows = history.graphs?.[key] ?? (key === 'runtime_distribution' ? history.graphs?.runtime : undefined);
    const seen = new Set();
    daily[key] = (Array.isArray(rows) ? rows : []).filter(row => {
      const date = row?.date;
      if (!requestedDates.includes(date) || seen.has(date)) return false;
      seen.add(date);
      return true;
    }).map(row => ({ date: row.date, ...pickNumbers(row, fields) })).sort((a, b) => a.date.localeCompare(b.date));
    const measuredDates = new Set(daily[key].filter(row => fields.some(f => row[f] !== null)).map(row => row.date));
    missingDates[key] = requestedDates.filter(date => !measuredDates.has(date));
  }
  if (!Object.values(summary).some(v => v !== null) && !Object.values(daily).flat().some(row => Object.entries(row).some(([key, value]) => key !== 'date' && value !== null))) {
    throw new Error('No historical measurements are available for this report.');
  }
  const observed = new Set(Object.values(daily).flat().filter(row => Object.entries(row).some(([k, v]) => k !== 'date' && v !== null)).map(row => row.date));
  const missing = requestedDates.filter(d => !observed.has(d));
  if (missing.length) limitations.push(`${missing.length} of 30 requested historical dates have no daily measurements.`);
  for (const key of ['current_analysis', 'thermal_analysis', 'thermal_rates', 'vibration_analysis']) {
    if (missingDates[key].length) limitations.push(`${key}: ${30 - missingDates[key].length}/30 days available.`);
  }
  const rawLatest = object(snapshot.latest);
  const latest = {
    current: sensor(rawLatest.current, 'current', now),
    temperature: sensor(rawLatest.temperature, 'temperature', now),
    vibration: sensor(rawLatest.motioniq ?? rawLatest.vibration, 'vibration', now),
  };
  for (const [name, reading] of Object.entries(latest)) {
    if (!reading.available) limitations.push(`Latest ${name} measurements are unavailable.`);
    else if (reading.freshness.status !== 'recent') limitations.push(`Latest ${name} freshness: ${reading.freshness.status}; measurement timestamp: ${reading.measured_at ?? 'not supplied'}.`);
  }
  if (latest.vibration.values.scalar_value !== undefined) limitations.push('Latest scalar vibration has no documented unit; absolute severity thresholds cannot be applied.');
  limitations.push('Historical thermal-rate units and sensor sampling/coverage units are not specified by the API; do not assume them.');
  const runs = new Map(daily.runtime_distribution.map(row => [row.date, row.runtime]));
  const utilizations = daily.utilization.flatMap(row => {
    const runtime = runs.get(row.date);
    return row.loaded !== null && runtime > 0 && row.loaded >= 0 && row.loaded <= runtime ? [row.loaded / runtime * 100] : [];
  });
  const tempMaxima = daily.thermal_analysis.map(row => row.maximum).filter(v => v !== null);
  const currentPeaks = [summary.peak_current, summary.maximum_current, ...daily.current_analysis.map(row => row.peak)].filter(v => v !== null);
  // Only label aggregates "today" when the source explicitly confirms the requested period.
  const todayScope = snapshot.date_range?.start_date === window.snapshot_date && snapshot.date_range?.end_date === window.snapshot_date;
  const today_kpis = {
    availability_pct: todayScope ? numeric(snapshot.kpis?.availability) : null,
    interruptions: todayScope ? numeric(snapshot.kpis?.interruptions) : null,
  };
  if (!todayScope) limitations.push('Today-specific availability and interruptions are unavailable: snapshot aggregate date scope is not confirmed.');
  const chart_days = requestedDates.slice(-7).map(date => {
    const runtime = daily.runtime_distribution.find(row => row.date === date);
    const availability = daily.availability.find(row => row.date === date)?.value ?? null;
    return { date, availability_pct: availability !== null && availability >= 0 && availability <= 100 ? availability : null,
      runtime_hours: runtime?.runtime !== null && runtime?.runtime >= 0 ? runtime.runtime / 3600 : null,
      downtime_hours: runtime?.downtime !== null && runtime?.downtime >= 0 ? runtime.downtime / 3600 : null };
  });
  return {
    asset: { id: asset, device_type: 'compressor', plant: 'Texmaco - Agarpara', equipment },
    report_context: { ...window, fetched_at: now.toISOString(), scope: '30 completed calendar days plus latest available snapshot' },
    historical: {
      summary, daily, chart_days,
      coverage: { requested_days: 30, available_days: observed.size, missing_dates: missing, missing_dates_by_series: missingDates },
      derived: {
        mean_daily_loaded_utilization_pct: utilizations.length ? utilizations.reduce((a, b) => a + b, 0) / utilizations.length : null,
        utilization_observed_days: utilizations.length,
        maximum_observed_temperature_c: tempMaxima.length ? Math.max(...tempMaxima) : summary.maximum_temperature,
        peak_current_a: currentPeaks.length ? Math.max(...currentPeaks) : null,
      },
      metric_definitions: {
        runtime_distribution: 'seconds; offline is separate from downtime',
        utilization: 'daily loaded/unloaded/idle durations in seconds',
        mean_daily_loaded_utilization_pct: 'Unweighted mean of loaded/runtime * 100 for valid days with runtime > 0; excludes missing or invalid days',
        current_analysis: 'amperes', thermal_analysis: 'degrees C', thermal_rates: 'unit unspecified by source API',
        reliability: 'interruptions/restarts are counts; mtbi, average_run_length, recovery_time are seconds; interruptions are not proven failures',
        availability: 'percent as provided by historical API',
      },
    },
    latest,
    today_kpis,
    data_quality: { missing_summary_fields: SUMMARY_FIELDS.filter(k => summary[k] === null), limitations },
  };
}
