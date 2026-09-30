export interface WeldingMachineInfo {
  pk: string;
  machine_id: string;
}

export interface WeldingSelectedRange {
  start_date: string;
  end_date: string;
  timezone: string;
}

export interface WeldingTimeMetric {
  seconds: number;
  hours: number;
}

export interface WeldingOperationalSummary {
  availability_percentage: number;
  utilization_percentage: number;
  active_welding_time: WeldingTimeMetric;
  idle_time: WeldingTimeMetric;
  actual_idle_time: WeldingTimeMetric;
  positioning_time: WeldingTimeMetric;
  off_time: WeldingTimeMetric;
  offline_time: WeldingTimeMetric;
  total_energy_kwh: number;
  average_power_when_welding_kw: number;
  total_welding_cycles: number;
  average_cycle_time_seconds: number;
}

export interface RuntimeDistributionItem {
  state: string;
  label: string;
  seconds: number;
  percentage: number;
}

export interface WeldingRuntimeDistribution {
  total_seconds: number;
  distribution: RuntimeDistributionItem[];
}

export interface WeldingCycleAnalysisItem {
  cycle_number: number;
  timestamp: string;
  duration_seconds: number;
  peak_current_a: number;
}

export interface WeldingCurrentCycleFeatures {
  mean_current_a: number;
  rms_current_a: number;
  peak_current_a: number;
  current_stability_percentage: number;
  average_cycle_time_seconds: number;
  average_arc_duration_seconds: number | null;
  cycle_count: number;
}

export interface WeldingApiResponse {
  machine: WeldingMachineInfo;
  selected_range: WeldingSelectedRange;
  operational_summary: WeldingOperationalSummary;
  runtime_distribution: WeldingRuntimeDistribution;
  latest_cycle_number: number;
  cycle_analysis: WeldingCycleAnalysisItem[];
  current_cycle_features: WeldingCurrentCycleFeatures;
  data_quality?: Record<string, any>;
  data_sources?: Record<string, any>;
}

export const DEFAULT_WELDING_MACHINE = 'PI4G/TXMMIGI/26001';
export const WELDING_API_ENDPOINT = 'https://2zkaym7w85.execute-api.ap-south-1.amazonaws.com/welding';

const memoryCache = new Map<string, { data: WeldingApiResponse; timestamp: number }>();
const CACHE_TTL_MS = 15 * 60 * 1000; // 15 mins

function getCacheKey(machine: string, startDate: string, endDate: string): string {
  return `welding_${machine}_${startDate}_${endDate}`;
}

export function getCachedWeldingData(machine: string, startDate: string, endDate: string): WeldingApiResponse | null {
  const key = getCacheKey(machine, startDate, endDate);
  const inMem = memoryCache.get(key);
  if (inMem && Date.now() - inMem.timestamp < CACHE_TTL_MS) {
    return inMem.data;
  }
  if (typeof window !== 'undefined' && window.sessionStorage) {
    try {
      const stored = window.sessionStorage.getItem(key);
      if (stored) {
        const parsed = JSON.parse(stored);
        if (Date.now() - parsed.timestamp < CACHE_TTL_MS) {
          memoryCache.set(key, parsed);
          return parsed.data;
        }
      }
    } catch {
      // ignore
    }
  }
  return null;
}

export function setCachedWeldingData(machine: string, startDate: string, endDate: string, data: WeldingApiResponse): void {
  const key = getCacheKey(machine, startDate, endDate);
  const entry = { data, timestamp: Date.now() };
  memoryCache.set(key, entry);
  if (typeof window !== 'undefined' && window.sessionStorage) {
    try {
      window.sessionStorage.setItem(key, JSON.stringify(entry));
    } catch {
      // ignore
    }
  }
}

export async function fetchWeldingData(
  machine: string = DEFAULT_WELDING_MACHINE,
  startDate: string,
  endDate: string,
  forceRefresh: boolean = false
): Promise<WeldingApiResponse> {
  if (!forceRefresh) {
    const cached = getCachedWeldingData(machine, startDate, endDate);
    if (cached) return cached;
  }

  const query = `machine=${encodeURIComponent(machine)}&start_date=${encodeURIComponent(startDate)}&end_date=${encodeURIComponent(endDate)}`;

  // 1. Try local Vite proxy first
  try {
    const proxyRes = await fetch(`/api/welding?${query}`);
    if (proxyRes.ok) {
      const json = await proxyRes.json();
      if (json && json.operational_summary) {
        setCachedWeldingData(machine, startDate, endDate, json);
        return json as WeldingApiResponse;
      }
    }
  } catch {
    // Proxy unavailable, try direct endpoint
  }

  // 2. Direct AWS API Gateway endpoint
  const directRes = await fetch(`${WELDING_API_ENDPOINT}?${query}`);
  if (!directRes.ok) {
    const errorText = await directRes.text().catch(() => 'Network request failed');
    throw new Error(`Welding API error (${directRes.status}): ${errorText}`);
  }

  const result = await directRes.json();
  if (!result || !result.operational_summary) {
    throw new Error('Invalid welding API payload structure');
  }

  setCachedWeldingData(machine, startDate, endDate, result);
  return result as WeldingApiResponse;
}
