import { OperationalKpiResponse, TrendSample, AssetMeta } from '../types';

export const AVAILABLE_ASSETS: AssetMeta[] = [
  {
    id: 'CMP#02',
    name: 'Compressor 2',
    plant: 'Texmaco - Agarpara',
    deviceId: 'Texmaco-CMP02-Satellite',
    type: 'Compressor',
    status: 'Running',
  },
  {
    id: 'CMP#01',
    name: 'Compressor 1',
    plant: 'Texmaco - Agarpara',
    deviceId: 'Texmaco-CMP01-Aux',
    type: 'Compressor',
    status: 'Running',
  },
  {
    id: 'CNC#01',
    name: 'CNC 1 (Duce Pack Cutter)',
    plant: 'Texmaco - Agarpara',
    deviceId: 'MACHINE#PI4G/TXMCNCI/26001',
    type: 'CNC',
    status: 'Running',
  },
  {
    id: 'ROBO#01',
    name: 'Robo Welder',
    plant: 'Texmaco - Agarpara',
    deviceId: 'MACHINE#PI4G/TXMMIGI/26001',
    type: 'Robotic Welder',
    status: 'Running',
  },
];

export function getMockKpiData(
  compressor = 'CMP#02',
  startDate = '2026-08-08',
  endDate = '2026-09-08'
): OperationalKpiResponse {
  const isCmp2 = compressor === 'CMP#02' || compressor === 'CMP02';
  const isTexmacoMaster = compressor === 'Texmaco-CMP01-Master';

  return {
    compressor,
    date_range: {
      start_date: startDate,
      end_date: endDate,
    },
    kpis: {
      availability: isCmp2 ? 48.35 : isTexmacoMaster ? 46.3 : 47.12,
      utilization: isCmp2 ? 48.35 : isTexmacoMaster ? 31.7 : 39.8,
      runtime_hours: isCmp2 ? 171.07 : isTexmacoMaster ? 77.78 : 142.5,
      stopped_time_hours: isCmp2 ? 182.73 : isTexmacoMaster ? 90.32 : 160.2,
      loaded_hours: isCmp2 ? 77.64 : isTexmacoMaster ? 24.68 : 68.4,
      unloaded_hours: isCmp2 ? 94.05 : isTexmacoMaster ? 53.09 : 74.1,
      mtbr_seconds: isCmp2 ? 19313.89 : 18450.25,
      mtbf_seconds: isCmp2 ? 11010.88 : 12420.5,
      interruptions: isCmp2 ? 35 : 42,
      load_pct: isCmp2 ? 45.22 : 38.5,
      unload_pct: isCmp2 ? 54.78 : 61.5,
    },
    latest: {
      current: {
        type: 'CURRENT',
        timestamp: '2026-09-08T19:14:39.767',
        cycle_id: 148,
        rms_a: isCmp2 ? 69.53 : 156.99,
        load_pct: isCmp2 ? -7.0 : 38.5,
        run_state: 1,
        load_state: isCmp2 ? 0 : 1,
        health_score: isCmp2 ? 62.8 : 41.1,
        anomaly_score: isCmp2 ? 0.59 : 1.43,
        diag_flags: 3,
      },
      temperature: {
        type: 'TEMPERATURE',
        timestamp: '2026-09-08T19:14:44.888',
        cycle_id: 148,
        instant_rate_c_per_min: isCmp2 ? -1.5 : -0.75,
        cooling_rate_c_per_min: 0.0,
        sustained_rise_min: isCmp2 ? 0.0 : 46.0,
        rise_incidents: 81,
        cooling_phase: 1,
        stress_hours: 0.0,
        rolling_variance: 0.05,
        health_score: isCmp2 ? 0.3 : 8.2,
        diag_flags: 5,
      },
      motioniq: {
        type: 'MOTIONIQ',
        timestamp: '2026-09-08T19:14:55.146',
        cycle_id: 148,
        axis_x_rms_g: isCmp2 ? 0.21 : 0.23,
        axis_y_rms_g: isCmp2 ? 0.26 : 0.30,
        axis_z_rms_g: isCmp2 ? 0.25 : 0.35,
        axis_x_kurtosis: isCmp2 ? 2.31 : 3.04,
        axis_y_kurtosis: isCmp2 ? 2.08 : 1.78,
        axis_z_kurtosis: isCmp2 ? 2.74 : 2.40,
        axis_x_crest: isCmp2 ? 2.95 : 2.80,
        axis_y_crest: isCmp2 ? 3.02 : 3.10,
        axis_z_crest: isCmp2 ? 3.46 : 3.35,
        max_kurtosis: isCmp2 ? 2.74 : 3.04,
        state_tag: 1,
        health_score: isCmp2 ? 2.1 : 5.3,
      },
      mfm: {
        type: 'MFM',
        timestamp: '2026-09-08T19:14:50.007',
        cycle_id: 148,
        avg_v: 0.0,
        v1n: 0.0,
        v2n: 0.0,
        v3n: 0.0,
        i1: 0.0,
        i2: 0.0,
        i3: 0.0,
        power_kw: 0.0,
        pf: 1.0,
        freq_hz: 0.0,
        energy_kwh: 15.5,
        v_imbalance_pct: 0.0,
        i_imbalance_pct: 0.0,
        health_score: 0.0,
      },
      kpi: {
        type: 'KPI',
        timestamp: '2026-09-08T19:14:34.705',
        cycle_id: 148,
        availability_pct: 46.6,
        utilization_pct: 44.6,
        runtime_hours: 159.62,
        stopped_hours: 183.03,
        loaded_hours: 71.15,
        unloaded_hours: 88.47,
        mtbi_hours: 1.75,
        run_cycles: 97,
        stop_cycles: 91,
        load_cycles: 3709,
        unload_cycles: 3708,
        active_advisory_count: 0,
      },
    },
    records_found: 15,
  };
}

export function generateTrendSamples(baseRms = 69.53, baseTempRate = -1.5): TrendSample[] {
  const samples: TrendSample[] = [];
  const now = Date.now();

  for (let i = 49; i >= 0; i--) {
    const timestamp = new Date(now - i * 30000).toISOString();
    // Simulate realistic jitter
    const wave = Math.sin(i * 0.4) * 12 + Math.cos(i * 0.2) * 8;
    const noise = (Math.random() - 0.5) * 6;
    const current_rms = Math.max(20, Math.min(280, baseRms + wave + noise));

    // Vibration X, Y, Z
    const vib_x = Number((0.21 + Math.sin(i * 0.3) * 0.04 + (Math.random() - 0.5) * 0.02).toFixed(2));
    const vib_y = Number((0.26 + Math.cos(i * 0.25) * 0.05 + (Math.random() - 0.5) * 0.02).toFixed(2));
    const vib_z = Number((0.35 + Math.sin(i * 0.2) * 0.08 + (Math.random() - 0.5) * 0.03).toFixed(2));

    // Temperature Rate around -1.5 or 0
    const temp_rate = Number((baseTempRate + Math.sin(i * 0.5) * 0.6 + (Math.random() - 0.5) * 0.3).toFixed(2));

    samples.push({
      index: 50 - i,
      timestamp,
      current_rms,
      vib_x,
      vib_y,
      vib_z,
      temp_rate,
    });
  }

  return samples;
}
