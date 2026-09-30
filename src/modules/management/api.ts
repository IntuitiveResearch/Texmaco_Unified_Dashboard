import { DashboardData } from "./types";

const defaultSummary: DashboardData["summary"] = {
  runtime_seconds: 0,
  downtime_seconds: 0,
  idle_seconds: 0,
  offline_seconds: 0,
  availability: 0,
  avg_utilization: 0,
  runtime_percentage: 0,
  downtime_percentage: 0,
  offline_percentage: 0,
  confidence: 0,
  trip_count: 0,
  cycle_count: 0,
  restart_count: 0,
  mtbi_seconds: 0,
  recovery_time_seconds: 0,
  average_runtime_seconds: 0,
  longest_runtime_seconds: 0,
  longest_downtime_seconds: 0,
  average_current: 0,
  median_current: 0,
  minimum_current: 0,
  maximum_current: 0,
  p95_current: 0,
  standard_deviation_current: 0,
  variance_current: 0,
  peak_current: 0,
  loaded_runtime_seconds: 0,
  unloaded_runtime_seconds: 0,
  idle_runtime_seconds: 0,
  idle_percentage: 0,
  high_current_events: 0,
  high_current_duration: 0,
  current_sampling_interval: 0,
  current_coverage: 0,
  average_temperature: 0,
  median_temperature: 0,
  minimum_temperature: 0,
  maximum_temperature: 0,
  p95_temperature: 0,
  standard_deviation_temperature: 0,
  variance_temperature: 0,
  temperature_range: 0,
  high_temperature_events: 0,
  high_temperature_duration: 0,
  average_temperature_rise: 0,
  average_temperature_fall: 0,
  temperature_drift: 0,
  temperature_sampling_interval: 0,
  temperature_coverage: 0,
};

const toNumber = (value: unknown): number => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
};

const normalizeSummary = (summary: Partial<DashboardData["summary"]> = {}): DashboardData["summary"] => {
  return Object.fromEntries(
    Object.entries(defaultSummary).map(([key, fallback]) => [
      key,
      key in summary ? toNumber(summary[key as keyof DashboardData["summary"]]) : fallback,
    ])
  ) as DashboardData["summary"];
};

const asArray = <T>(value: unknown): T[] => Array.isArray(value) ? value : [];

const normalizeDashboardData = (raw: any): DashboardData => {
  const graphs = raw?.graphs || {};
  const rawSummary = {
    ...(raw?.summary || {}),
    ...(raw?.availability !== undefined ? { availability: raw.availability } : {}),
  };

  return {
    summary: normalizeSummary(rawSummary),
    graphs: {
      runtime_distribution: asArray(graphs.runtime_distribution || graphs.runtime),
      current_analysis: asArray(graphs.current_analysis),
      thermal_analysis: asArray(graphs.thermal_analysis),
      thermal_rates: asArray(graphs.thermal_rates),
      utilization: asArray(graphs.utilization),
      reliability: asArray(graphs.reliability),
      events: asArray(graphs.events),
      cycle_count: asArray(graphs.cycle_count),
      time_breakdown: asArray(graphs.time_breakdown),
      availability: asArray(graphs.availability),
    },
  };
};

const CACHE_TTL_MS = 15 * 60 * 1000; // 15 minutes TTL

interface CacheEntry {
  data: DashboardData;
  timestamp: number;
}

const cache = new Map<string, CacheEntry>();
const inFlightRequests = new Map<string, Promise<DashboardData>>();

export const getCachedDashboardData = (
  compressor: string,
  startDate: string,
  endDate: string
): DashboardData | null => {
  const cacheKey = `${compressor}:${startDate}:${endDate}`;
  const now = Date.now();

  const cached = cache.get(cacheKey);
  if (cached) {
    if (now - cached.timestamp < CACHE_TTL_MS) {
      return cached.data;
    }
    cache.delete(cacheKey);
  }

  if (typeof window !== 'undefined' && window.sessionStorage) {
    try {
      const stored = window.sessionStorage.getItem(`mgmt_${cacheKey}`);
      if (stored) {
        const parsed: CacheEntry = JSON.parse(stored);
        if (now - parsed.timestamp < CACHE_TTL_MS) {
          cache.set(cacheKey, parsed);
          return parsed.data;
        }
        window.sessionStorage.removeItem(`mgmt_${cacheKey}`);
      }
    } catch {}
  }

  return null;
};

export const MANAGEMENT_DASHBOARD_ENDPOINT = 'https://2zkaym7w85.execute-api.ap-south-1.amazonaws.com/dashboard';

export const fetchDashboardData = async (
  compressor: string,
  startDate: string,
  endDate: string,
  forceRefresh = false
): Promise<DashboardData> => {
  const cacheKey = `${compressor}:${startDate}:${endDate}`;

  // Return cached result if still within 15 minutes TTL
  if (!forceRefresh) {
    const cached = getCachedDashboardData(compressor, startDate, endDate);
    if (cached) {
      return cached;
    }
  }

  // De-duplicate concurrent requests for the same parameters
  if (inFlightRequests.has(cacheKey)) {
    return inFlightRequests.get(cacheKey)!;
  }

  const requestPromise = (async () => {
    try {
      let response: Response;
      try {
        response = await fetch("/api/dashboard", {
          method: "POST",
          headers: {
            "Content-Type": "application/json"
          },
          body: JSON.stringify({
            compressor: compressor,
            start_date: startDate,
            end_date: endDate
          })
        });
        if (!response.ok) {
          throw new Error(`Proxy returned HTTP ${response.status}`);
        }
      } catch {
        // Direct hardcoded fallback for Vercel/production deployment
        response = await fetch(MANAGEMENT_DASHBOARD_ENDPOINT, {
          method: "POST",
          headers: {
            "Content-Type": "application/json"
          },
          body: JSON.stringify({
            compressor: compressor,
            start_date: startDate,
            end_date: endDate
          })
        });
      }

      if (!response.ok) {
        throw new Error(`Failed to fetch dashboard data (HTTP ${response.status})`);
      }
      
      const raw = await response.json();
      const normalized = normalizeDashboardData(raw);

      // Store normalized data in memory & sessionStorage cache
      const entry: CacheEntry = {
        data: normalized,
        timestamp: Date.now()
      };
      cache.set(cacheKey, entry);
      if (typeof window !== 'undefined' && window.sessionStorage) {
        try {
          window.sessionStorage.setItem(`mgmt_${cacheKey}`, JSON.stringify(entry));
        } catch {}
      }

      return normalized;
    } finally {
      inFlightRequests.delete(cacheKey);
    }
  })();

  inFlightRequests.set(cacheKey, requestPromise);
  return requestPromise;
};
