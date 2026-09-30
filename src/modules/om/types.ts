export interface DateRange {
  start_date: string;
  end_date: string;
}

export interface KpiMetrics {
  availability: number;
  utilization: number;
  runtime_hours: number;
  stopped_time_hours: number;
  loaded_hours: number;
  unloaded_hours: number;
  mtbr_seconds: number;
  mtbf_seconds: number;
  interruptions: number;
  load_pct: number;
  unload_pct: number;
}

export interface CurrentTelemetry {
  type: 'CURRENT';
  timestamp: string;
  cycle_id: number;
  rms_a: number;
  load_pct: number;
  run_state: number;
  load_state: number;
  health_score: number;
  anomaly_score: number;
  diag_flags: number;
}

export interface TemperatureTelemetry {
  type: 'TEMPERATURE';
  timestamp: string;
  cycle_id: number;
  instant_rate_c_per_min: number;
  cooling_rate_c_per_min: number;
  sustained_rise_min: number;
  rise_incidents: number;
  cooling_phase: number;
  stress_hours: number;
  rolling_variance: number;
  health_score: number;
  diag_flags: number;
}

export interface MotionIqTelemetry {
  type: 'MOTIONIQ';
  timestamp: string;
  cycle_id: number;
  axis_x_rms_g: number;
  axis_y_rms_g: number;
  axis_z_rms_g: number;
  axis_x_kurtosis: number;
  axis_y_kurtosis: number;
  axis_z_kurtosis: number;
  axis_x_crest: number;
  axis_y_crest: number;
  axis_z_crest: number;
  max_kurtosis: number;
  state_tag: number;
  health_score: number;
}

export interface MfmTelemetry {
  type: 'MFM';
  timestamp: string;
  cycle_id: number;
  avg_v: number;
  v1n: number;
  v2n: number;
  v3n: number;
  i1: number;
  i2: number;
  i3: number;
  power_kw: number;
  pf: number;
  freq_hz: number;
  energy_kwh: number;
  v_imbalance_pct: number;
  i_imbalance_pct: number;
  health_score: number;
}

export interface KpiTelemetry {
  type: 'KPI';
  timestamp: string;
  cycle_id: number;
  availability_pct: number;
  utilization_pct: number;
  runtime_hours: number;
  stopped_hours: number;
  loaded_hours: number;
  unloaded_hours: number;
  mtbi_hours: number;
  run_cycles: number;
  stop_cycles: number;
  load_cycles: number;
  unload_cycles: number;
  active_advisory_count: number;
}

export interface LatestTelemetry {
  current: CurrentTelemetry;
  temperature: TemperatureTelemetry;
  motioniq: MotionIqTelemetry;
  mfm: MfmTelemetry;
  kpi: KpiTelemetry;
}

export interface OperationalKpiResponse {
  compressor: string;
  date_range: DateRange;
  kpis: KpiMetrics;
  latest: LatestTelemetry;
  records_found: number;
}

export interface TrendSample {
  index: number;
  timestamp: string;
  current_rms: number;
  vib_x: number;
  vib_y: number;
  vib_z: number;
  temp_rate: number;
}

export interface AssetMeta {
  id: string;
  name: string;
  plant: string;
  deviceId: string;
  type: string;
  status: 'Running' | 'Stopped' | 'Standby';
}

export interface AuthUser {
  uid: string;
  loginTime: string;
  rememberMe: boolean;
}

export type DateRangePreset = 'today' | '7days' | '30days' | 'custom';

export interface GraphDataPoint {
  timestamp: string;
  time: string;
  value: number;
}

export interface CurrentGraphData {
  label?: string;
  metric: string;
  unit: string;
  series: GraphDataPoint[];
}

export interface VibrationGraphData {
  label?: string;
  metric?: string;
  unit: string;
  series:
    | GraphDataPoint[]
    | {
        x: GraphDataPoint[];
        y: GraphDataPoint[];
        z: GraphDataPoint[];
      };
}

export interface TemperatureGraphData {
  label?: string;
  metric: string;
  unit: string;
  series: GraphDataPoint[];
}

export interface OperationalGraphDataResponse {
  date: string;
  timezone: string;
  data_scope: string;
  compressor?: string;
  machine_type?: string;
  pk?: string;
  graphs: {
    current: CurrentGraphData;
    vibration?: VibrationGraphData;
    temperature?: TemperatureGraphData;
  };
  counts?: {
    current?: number;
    vibration_x?: number;
    vibration_y?: number;
    vibration_z?: number;
    temperature?: number;
  };
}

