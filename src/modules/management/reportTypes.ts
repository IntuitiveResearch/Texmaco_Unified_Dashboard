export interface PrescriptiveReport {
  overall_health: 'Excellent' | 'Good' | 'Fair' | 'Poor' | 'Critical' | 'Insufficient data';
  severity: 'Low' | 'Medium' | 'High' | 'Critical' | 'Unknown';
  executive_summary: string;
  conditions: Array<{ domain: 'Availability' | 'Reliability' | 'Electrical' | 'Thermal' | 'Vibration' | 'Production' | 'Process'; condition: string; detail: string; concern: 'High' | 'Medium' | 'Low' | 'Unknown' }>;
  root_causes: Array<{ cause: string; status: 'Suspected' | 'Not established'; key_evidence: string; confidence: 'High' | 'Medium' | 'Low' | 'Insufficient'; verification: string; knowledge_rule_id?: string; supporting_observation_ids?: string[] }>;
  risk_timeline: { now: string; weeks: string; if_ignored: string };
  recommendations: Array<{
    category: 'Immediate' | 'Preventive' | 'Monitor'; actions: string[]; why_it_matters: string;
    timing: string; responsible_role: string; verification: string;
  }>;
  limitations: string[];
}

export interface CompressorEquipmentProfile {
  manufacturer: string; model: string; assignment_status: string; source: string;
  nameplate_ratings?: Record<string, unknown> | null;
  serial_number: string | null; manufacture_year: number | null;
  drive_type: string | null; cooling_type: string | null;
  rated_motor_current_a: number | null;
  temperature_limits_c: Record<string, number> | null;
  vibration_limits: Record<string, unknown> | null;
  sensor_locations: Record<string, string> | null; manual_reference: string | null;
}

export interface ReportResponse {
  report: PrescriptiveReport;
  context: {
    asset: { id: string; original_id?: string; device_type: string; plant: string; name?: string; plant_id?: string; equipment?: CompressorEquipmentProfile };
    start_date: string; end_date: string; snapshot_date: string; timezone: string;
    fetched_at: string; generated_at: string; scope: string;
    coverage: { requested_days: number; available_days: number; missing_dates: string[]; missing_dates_by_series: Record<string, string[]> };
    latest: Record<string, { available: boolean; measured_at: string | null; freshness: { status: string; age_seconds: number | null } }>;
    trends: Array<{ date: string; availability_pct: number | null; runtime_hours: number | null; downtime_hours: number | null }>;
    kpis: {
      availability_pct: number | null;
      interruptions: number | null;
      restarts: number | null;
      utilization_pct: number | null;
      maximum_temperature_c: number | null;
      peak_current_a: number | null;
      today_availability_pct: number | null;
      today_interruptions: number | null;
      cycle_count?: number | null;
      active_hours?: number | null;
      idle_hours?: number | null;
      energy_kwh?: number | null;
      idle_seconds?: number | null;
      downtime_seconds?: number | null;
      runtime_seconds?: number | null;
    };
    prompt_version: string; model: string;
    knowledge_version?: string; knowledge_rule_ids?: string[];
  };
}
