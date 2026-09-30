// Synthetic data for layout/regression checks, never used as a production fallback.
import { getCompressorEquipment } from '../../shared/compressor-equipment.mjs';

export const validReport = () => ({
  overall_health: 'Fair', severity: 'Medium', executive_summary: 'Recurring interruptions reduce availability. Verify the operating causes and the freshness of the latest sensor readings.',
  conditions: [
    { domain: 'Availability', condition: 'Availability Degraded', concern: 'Medium', detail: 'Availability was 39.3% over the historical period. Recent daily values fluctuate, indicating inconsistent operating continuity. Planned stops and demand changes must be separated from equipment-related downtime.' },
    { domain: 'Reliability', condition: 'Recurring Interruptions', concern: 'High', detail: 'The history contains 226 interruptions. These events identify a reliability concern but do not confirm 226 mechanical failures. Correlate shutdown times with controller records before assigning a cause.' },
    { domain: 'Electrical', condition: 'Current Variation', concern: 'Medium', detail: 'The observed historical peak current was 173.8 A. Current variation may reflect load changes or start/stop operation; the supplied data does not establish an overload or an electrical protection fault.' },
    { domain: 'Thermal', condition: 'Temperature Evidence Limited', concern: 'Unknown', detail: 'Absolute temperature coverage is incomplete. The latest thermal-rate reading cannot establish maximum temperature or overheating. Verify temperature readings and cooling response under comparable load.' },
    { domain: 'Vibration', condition: 'Snapshot Requires Verification', concern: 'Unknown', detail: 'Three-axis RMS vibration is available as a snapshot, but no historical vibration series is supplied. Without a verified timestamp and equipment baseline, a worsening trend or bearing fault cannot be established.' },
  ],
  root_causes: [
    { cause: 'Load / control cycling', status: 'Suspected', key_evidence: 'Frequent interruptions and variable runtime suggest repeated operating transitions; event-aligned controller data is missing.', confidence: 'Medium', verification: 'Align controller event logs with current and run-state transitions.' },
    { cause: 'Demand-related shutdowns', status: 'Suspected', key_evidence: 'Low availability coexists with substantial loaded utilization; demand or scheduling may contribute to the downtime.', confidence: 'Low', verification: 'Compare downtime with shift schedules and compressed-air demand.' },
    { cause: 'Mechanical cause unresolved', status: 'Not established', key_evidence: 'Only a vibration snapshot is available. No baseline, spectrum or persistent trend supports a mechanical diagnosis.', confidence: 'Insufficient', verification: 'Collect repeat vibration measurements at comparable operating load.' },
  ],
  risk_timeline: {
    now: 'Recurring interruptions can disrupt compressed-air continuity. Review operating events and confirm sensor freshness before assigning the cause or escalating maintenance.',
    weeks: 'Use the next review cycle to collect synchronized event records and a vibration baseline, then assess whether targeted maintenance reduces interruptions.',
    if_ignored: 'If the operating interruptions persist, availability may remain inconsistent. Equipment damage and failure timing cannot be inferred from the supplied evidence.',
  },
  recommendations: [
    { category: 'Immediate', actions: ['Review controller shutdown codes against current and runtime records.', 'Verify the latest sensor timestamps before diagnosis.'], why_it_matters: 'Separates operating transitions from fault-related stops and prevents action on stale readings.', timing: 'Next operating review', responsible_role: 'Maintenance engineer', verification: 'Match recorded interruptions with confirmed controller events.' },
    { category: 'Preventive', actions: ['Compare load/unload cycling with demand and approved control settings.', 'Establish vibration and temperature baselines at comparable load.'], why_it_matters: 'Supports targeted maintenance decisions and distinguishes process effects from equipment deterioration.', timing: 'Next planned inspection', responsible_role: 'Reliability engineer', verification: 'Document baseline readings and the event-to-cause assessment.' },
    { category: 'Monitor', actions: ['Track daily availability and interruptions after corrective actions.', 'Collect repeat current, temperature and vibration measurements.'], why_it_matters: 'Confirms whether the intervention improves continuity and reveals persistent deviations.', timing: 'Daily review', responsible_role: 'Operations supervisor', verification: 'Compare post-action measurements with the established baseline.' },
  ],
  limitations: ['No historical vibration series is available.', 'Root causes are hypotheses requiring field verification.'],
});

export const sampleResult = () => ({
  report: validReport(),
  context: {
    asset: { id: 'CMP#02', device_type: 'compressor', plant: 'Texmaco - Agarpara', equipment: getCompressorEquipment('CMP#02') },
    start_date: '2026-08-29', end_date: '2026-09-27', snapshot_date: '2026-09-28', timezone: 'Asia/Kolkata',
    fetched_at: '2026-09-28T12:00:00Z', generated_at: '2026-09-28T12:01:00Z',
    coverage: { requested_days: 30, available_days: 28, missing_dates: ['2026-09-02', '2026-09-03'], missing_dates_by_series: {} },
    latest: { vibration: { available: true, measured_at: null, freshness: { status: 'unknown', age_seconds: null } } },
    kpis: { availability_pct: 39.3, today_availability_pct: null, today_interruptions: null, interruptions: 226, restarts: 227, utilization_pct: 85.8, maximum_temperature_c: null, peak_current_a: 173.8 },
    trends: [83, 89, null, 58, 90, 79, 83].map((availability_pct, i) => ({ date: `2026-09-${21 + i}`, availability_pct, runtime_hours: i === 2 ? null : [12, 18, 0, 14, 21, 19, 17][i], downtime_hours: i === 2 ? null : [2, 3, 0, 9, 1, 4, 2][i] })),
    prompt_version: 'compressor-rca-prescriptive-v5-knowledge', model: 'fixture',
  },
});
