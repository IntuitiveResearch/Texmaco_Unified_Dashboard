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
  actual_idle_time?: WeldingTimeMetric;
  positioning_time: WeldingTimeMetric;
  off_time: WeldingTimeMetric;
  offline_time?: WeldingTimeMetric;
  total_energy_kwh: number;
  average_power_when_welding_kw: number;
  total_welding_cycles: number;
  average_cycle_time_seconds?: number;
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

export interface WeldingCurrentTimeSeriesItem {
  timestamp: string;
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
  runtime_distribution?: WeldingRuntimeDistribution;
  latest_cycle_number?: number;
  current_time_series?: WeldingCurrentTimeSeriesItem[];
  cycle_analysis?: Array<{
    cycle_number: number;
    timestamp: string;
    duration_seconds: number;
    peak_current_a: number;
  }>;
  current_cycle_features?: WeldingCurrentCycleFeatures;
  data_quality?: Record<string, any>;
  data_sources?: Record<string, any>;
}

export const DEFAULT_WELDING_MACHINE = 'MACHINE#PI4G/TXMMIGI/26001';
export const WELDING_API_ENDPOINT = 'https://2zkaym7w85.execute-api.ap-south-1.amazonaws.com/welding';

export const FALLBACK_WELDING_DATA: WeldingApiResponse = {
  machine: {
    pk: 'MACHINE#PI4G/TXMMIGI/26001',
    machine_id: 'PI4G/TXMMIGI/26001',
  },
  selected_range: {
    start_date: '2026-09-29',
    end_date: '2026-09-30',
    timezone: 'Asia/Kolkata',
  },
  operational_summary: {
    availability_percentage: 98.92,
    utilization_percentage: 8.42,
    active_welding_time: {
      seconds: 5905,
      hours: 1.64,
    },
    idle_time: {
      seconds: 31862,
      hours: 8.85,
    },
    actual_idle_time: {
      seconds: 64262,
      hours: 17.85,
    },
    positioning_time: {
      seconds: 32400,
      hours: 9,
    },
    off_time: {
      seconds: 765,
      hours: 0.21,
    },
    offline_time: {
      seconds: 0,
      hours: 0,
    },
    total_energy_kwh: 21.1291,
    average_power_when_welding_kw: 12.88,
    total_welding_cycles: 108,
    average_cycle_time_seconds: 57.33,
  },
  runtime_distribution: {
    total_seconds: 70932,
    distribution: [
      { state: 'ARC', label: 'Active Welding', seconds: 5905, percentage: 8.32 },
      { state: 'IDLE', label: 'Idle', seconds: 31862, percentage: 44.92 },
      { state: 'POSITIONING', label: 'Positioning', seconds: 32400, percentage: 45.68 },
      { state: 'OFF', label: 'Off', seconds: 765, percentage: 1.08 },
    ],
  },
  latest_cycle_number: 77,
  current_time_series: [
    { timestamp: '2026-09-30T12:32:54+05:30', peak_current_a: 21.92 },
    { timestamp: '2026-09-30T12:33:13+05:30', peak_current_a: 20.78 },
    { timestamp: '2026-09-30T12:33:31+05:30', peak_current_a: 20.84 },
    { timestamp: '2026-09-30T12:35:02+05:30', peak_current_a: 22.22 },
    { timestamp: '2026-09-30T13:23:01+05:30', peak_current_a: 24.38 },
    { timestamp: '2026-09-30T13:23:49+05:30', peak_current_a: 22.8 },
    { timestamp: '2026-09-30T13:48:05+05:30', peak_current_a: 22.55 },
    { timestamp: '2026-09-30T13:49:34+05:30', peak_current_a: 23.18 },
    { timestamp: '2026-09-30T13:59:22+05:30', peak_current_a: 20.93 },
    { timestamp: '2026-09-30T14:00:48+05:30', peak_current_a: 21.69 },
    { timestamp: '2026-09-30T14:10:42+05:30', peak_current_a: 22.18 },
    { timestamp: '2026-09-30T14:12:11+05:30', peak_current_a: 21.22 },
    { timestamp: '2026-09-30T14:26:42+05:30', peak_current_a: 22.33 },
    { timestamp: '2026-09-30T14:28:10+05:30', peak_current_a: 21.98 },
    { timestamp: '2026-09-30T14:47:00+05:30', peak_current_a: 21.93 },
    { timestamp: '2026-09-30T14:48:18+05:30', peak_current_a: 22.48 },
    { timestamp: '2026-09-30T14:56:20+05:30', peak_current_a: 21.59 },
    { timestamp: '2026-09-30T14:56:52+05:30', peak_current_a: 20.56 },
    { timestamp: '2026-09-30T14:57:42+05:30', peak_current_a: 20.77 },
    { timestamp: '2026-09-30T15:06:28+05:30', peak_current_a: 21.3 },
    { timestamp: '2026-09-30T15:07:52+05:30', peak_current_a: 21.72 },
    { timestamp: '2026-09-30T15:20:19+05:30', peak_current_a: 21.23 },
    { timestamp: '2026-09-30T15:21:38+05:30', peak_current_a: 21.35 },
    { timestamp: '2026-09-30T15:21:47+05:30', peak_current_a: 19.52 },
    { timestamp: '2026-09-30T15:42:47+05:30', peak_current_a: 20.75 },
    { timestamp: '2026-09-30T15:43:18+05:30', peak_current_a: 21.19 },
    { timestamp: '2026-09-30T15:43:35+05:30', peak_current_a: 20.49 },
    { timestamp: '2026-09-30T15:45:05+05:30', peak_current_a: 22.73 },
    { timestamp: '2026-09-30T15:54:13+05:30', peak_current_a: 21.04 },
    { timestamp: '2026-09-30T15:54:47+05:30', peak_current_a: 21.01 },
    { timestamp: '2026-09-30T15:55:21+05:30', peak_current_a: 21.32 },
    { timestamp: '2026-09-30T15:55:34+05:30', peak_current_a: 20.03 },
    { timestamp: '2026-09-30T16:04:13+05:30', peak_current_a: 20.63 },
    { timestamp: '2026-09-30T16:04:48+05:30', peak_current_a: 21.67 },
    { timestamp: '2026-09-30T16:04:54+05:30', peak_current_a: 19.04 },
    { timestamp: '2026-09-30T16:05:24+05:30', peak_current_a: 21.09 },
    { timestamp: '2026-09-30T16:05:46+05:30', peak_current_a: 21.7 },
    { timestamp: '2026-09-30T16:06:37+05:30', peak_current_a: 21.28 },
    { timestamp: '2026-09-30T16:28:22+05:30', peak_current_a: 20.99 },
    { timestamp: '2026-09-30T16:28:53+05:30', peak_current_a: 19.51 },
    { timestamp: '2026-09-30T16:30:26+05:30', peak_current_a: 21.93 },
    { timestamp: '2026-09-30T16:43:18+05:30', peak_current_a: 23.51 },
    { timestamp: '2026-09-30T16:44:33+05:30', peak_current_a: 22.91 },
    { timestamp: '2026-09-30T16:44:47+05:30', peak_current_a: 20.31 },
    { timestamp: '2026-09-30T16:51:59+05:30', peak_current_a: 21.75 },
    { timestamp: '2026-09-30T16:52:54+05:30', peak_current_a: 21.4 },
    { timestamp: '2026-09-30T16:54:22+05:30', peak_current_a: 21.09 },
    { timestamp: '2026-09-30T17:21:09+05:30', peak_current_a: 20.89 },
    { timestamp: '2026-09-30T17:21:50+05:30', peak_current_a: 20.92 },
    { timestamp: '2026-09-30T17:23:17+05:30', peak_current_a: 21.69 },
    { timestamp: '2026-09-30T17:31:21+05:30', peak_current_a: 20.76 },
    { timestamp: '2026-09-30T17:31:34+05:30', peak_current_a: 20.86 },
    { timestamp: '2026-09-30T17:31:56+05:30', peak_current_a: 20.5 },
    { timestamp: '2026-09-30T17:32:40+05:30', peak_current_a: 21.16 },
    { timestamp: '2026-09-30T17:45:59+05:30', peak_current_a: 20.2 },
    { timestamp: '2026-09-30T17:47:05+05:30', peak_current_a: 21.13 },
    { timestamp: '2026-09-30T17:47:56+05:30', peak_current_a: 21.16 },
    { timestamp: '2026-09-30T17:57:32+05:30', peak_current_a: 20.7 },
    { timestamp: '2026-09-30T17:57:44+05:30', peak_current_a: 20.2 },
    { timestamp: '2026-09-30T17:58:45+05:30', peak_current_a: 21.93 },
    { timestamp: '2026-09-30T17:59:05+05:30', peak_current_a: 22.25 },
    { timestamp: '2026-09-30T18:00:09+05:30', peak_current_a: 20.47 },
    { timestamp: '2026-09-30T18:00:15+05:30', peak_current_a: 17.72 },
    { timestamp: '2026-09-30T18:11:32+05:30', peak_current_a: 21.48 },
    { timestamp: '2026-09-30T18:13:00+05:30', peak_current_a: 21.54 },
    { timestamp: '2026-09-30T18:22:08+05:30', peak_current_a: 22.5 },
    { timestamp: '2026-09-30T18:23:36+05:30', peak_current_a: 22.38 },
    { timestamp: '2026-09-30T18:32:24+05:30', peak_current_a: 21.46 },
    { timestamp: '2026-09-30T18:33:52+05:30', peak_current_a: 22.16 },
    { timestamp: '2026-09-30T18:43:09+05:30', peak_current_a: 21.37 },
    { timestamp: '2026-09-30T18:44:37+05:30', peak_current_a: 21.37 },
    { timestamp: '2026-09-30T19:07:58+05:30', peak_current_a: 23.77 },
    { timestamp: '2026-09-30T19:09:51+05:30', peak_current_a: 23.61 },
    { timestamp: '2026-09-30T19:20:42+05:30', peak_current_a: 23.25 },
    { timestamp: '2026-09-30T19:22:10+05:30', peak_current_a: 22.93 },
    { timestamp: '2026-09-30T19:31:02+05:30', peak_current_a: 21.44 },
    { timestamp: '2026-09-30T19:32:30+05:30', peak_current_a: 21.87 },
  ],
  current_cycle_features: {
    mean_current_a: 21.95,
    rms_current_a: 21.99,
    peak_current_a: 24.44,
    current_stability_percentage: 0,
    average_cycle_time_seconds: 57.33,
    average_arc_duration_seconds: null,
    cycle_count: 103,
  },
  data_quality: {
    hourly_summary_records: 44,
    heartbeat_records: 147,
    state_event_records: 461,
    arc_completed_records: 103,
    cycle_records: 103,
  },
  data_sources: {
    operational_summary: 'Texmaco_welding_hourly',
    cycle_boundaries: 'texmaco_welding_rawdata#EVENTS',
    current_time_series: 'texmaco_welding_rawdata#ARCCOMPLETED',
    latest_cycle_number: 'texmaco_welding_rawdata#HEARTBEAT + #ARCCOMPLETED',
  },
};

const memoryCache = new Map<string, { data: WeldingApiResponse; timestamp: number }>();
const CACHE_TTL_MS = 15 * 60 * 1000;

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
  startDate = '2026-09-29',
  endDate = '2026-09-30',
  forceRefresh = false
): Promise<WeldingApiResponse> {
  const normalizedMachine = machine.includes('PI4G') ? machine : DEFAULT_WELDING_MACHINE;
  const start = startDate || '2026-09-29';
  const end = endDate || '2026-09-30';

  if (!forceRefresh) {
    const cached = getCachedWeldingData(normalizedMachine, start, end);
    if (cached) return cached;
  }

  const query = `machine=${encodeURIComponent(normalizedMachine)}&start_date=${encodeURIComponent(start)}&end_date=${encodeURIComponent(end)}`;

  // 1. Try local Vite proxy first
  try {
    const proxyRes = await fetch(`/api/welding?${query}`);
    if (proxyRes.ok) {
      const json = await proxyRes.json();
      if (json && json.operational_summary) {
        setCachedWeldingData(normalizedMachine, start, end, json);
        return json as WeldingApiResponse;
      }
    }
  } catch {
    // Proxy unavailable
  }

  // 2. Direct AWS API Gateway endpoint
  try {
    const directRes = await fetch(`${WELDING_API_ENDPOINT}?${query}`);
    if (directRes.ok) {
      const result = await directRes.json();
      if (result && result.operational_summary) {
        setCachedWeldingData(normalizedMachine, start, end, result);
        return result as WeldingApiResponse;
      }
    }
  } catch {
    // Direct endpoint unavailable
  }

  // 3. Fallback to user-provided sample data
  setCachedWeldingData(normalizedMachine, start, end, FALLBACK_WELDING_DATA);
  return FALLBACK_WELDING_DATA;
}
