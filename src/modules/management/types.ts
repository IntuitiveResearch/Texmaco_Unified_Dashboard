export interface DashboardSummary {
  runtime_seconds: number;
  downtime_seconds: number;
  idle_seconds?: number;
  offline_seconds: number;
  availability: number;
  avg_utilization?: number;
  runtime_percentage: number;
  downtime_percentage: number;
  offline_percentage: number;
  confidence: number;
  trip_count: number;
  cycle_count?: number;
  restart_count: number;
  mtbi_seconds: number;
  recovery_time_seconds: number;
  average_runtime_seconds: number;
  longest_runtime_seconds: number;
  longest_downtime_seconds: number;
  average_current: number;
  median_current: number;
  minimum_current: number;
  maximum_current: number;
  p95_current: number;
  standard_deviation_current: number;
  variance_current: number;
  peak_current: number;
  loaded_runtime_seconds: number;
  unloaded_runtime_seconds: number;
  idle_runtime_seconds: number;
  idle_percentage: number;
  high_current_events: number;
  high_current_duration: number;
  current_sampling_interval: number;
  current_coverage: number;
  average_temperature: number;
  median_temperature: number;
  minimum_temperature: number;
  maximum_temperature: number;
  p95_temperature: number;
  standard_deviation_temperature: number;
  variance_temperature: number;
  temperature_range: number;
  high_temperature_events: number;
  high_temperature_duration: number;
  average_temperature_rise: number;
  average_temperature_fall: number;
  temperature_drift: number;
  temperature_sampling_interval: number;
  temperature_coverage: number;
}

export interface CurrentAnalysis {
  date: string;
  average: number;
  median: number;
  p95: number;
  peak: number;
}

export interface ThermalAnalysis {
  date: string;
  average: number;
  median: number;
  maximum: number;
  deviation: number;
}

export interface ThermalRates {
  date: string;
  heating_rate: number;
  cooling_rate: number;
}

export interface Utilization {
  date: string;
  loaded: number;
  unloaded: number;
  idle: number;
  value?: number;
}

export interface Reliability {
  date: string;
  interruptions: number;
  restarts: number;
  average_run_length: number;
  mtbi: number;
  recovery_time: number;
  cycle_count?: number;
}

export interface Events {
  date: string;
  high_current_events: number;
  high_temperature_events: number;
}

export interface RuntimeDistribution {
  date: string;
  runtime: number;
  downtime: number;
  offline: number;
  idle?: number;
}

export interface Availability {
  date: string;
  value: number;
}

export interface DashboardData {
  summary: DashboardSummary;
  graphs: {
    runtime_distribution: RuntimeDistribution[];
    current_analysis: CurrentAnalysis[];
    thermal_analysis: ThermalAnalysis[];
    thermal_rates: ThermalRates[];
    utilization: Utilization[];
    reliability: Reliability[];
    events: Events[];
    cycle_count?: Array<{ date: string; cycle_count: number }>;
    time_breakdown?: Array<Record<string, number>> | Record<string, number>;
    availability?: Availability[];
  };
}
