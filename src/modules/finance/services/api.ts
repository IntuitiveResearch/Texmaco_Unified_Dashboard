import {
  CostCategory,
  FinancialIntelResponse,
  KpiMetric,
  MonthlyTrendData,
  PlantData,
  SavingOpportunity,
} from '../types';

export interface SaveAssumptionsPayload {
  asset: string;
  asset_type: string;
  electricity_tariff: number;
  downtime_cost_per_hour: number;
  maintenance_event_count: number;
  average_maintenance_cost: number;
  average_spares_labour_cost: number;
  average_production_value: number;
}

export interface SaveAssumptionsResponse {
  message: string;
  asset: string;
}

export const API_ENDPOINT = 'https://2zkaym7w85.execute-api.ap-south-1.amazonaws.com/financial_intel';

// Cache configuration: 15 minutes TTL (15 * 60 * 1000 ms) for fast asset and tab switches
export const CACHE_TTL_MS = 15 * 60 * 1000;

interface CacheEntry<T> {
  data: T;
  timestamp: number;
}

const memoryCache = new Map<string, CacheEntry<FinancialIntelResponse>>();
const inFlightRequests = new Map<string, Promise<FinancialIntelResponse>>();

function getCacheKey(asset: string, range: string): string {
  return `fin_intel_${asset.trim()}_${normalizeRange(range)}`;
}

/**
 * Retrieves valid cached response if available and not older than 15 minutes.
 */
export function getCachedIntel(asset: string, range: string): FinancialIntelResponse | null {
  const key = getCacheKey(asset, range);
  const now = Date.now();

  // 1. Check in-memory cache
  const inMem = memoryCache.get(key);
  if (inMem) {
    if (now - inMem.timestamp < CACHE_TTL_MS) {
      return inMem.data;
    }
    // Expired: remove from memory cache
    memoryCache.delete(key);
  }

  // 2. Check browser sessionStorage fallback
  if (typeof window !== 'undefined' && window.sessionStorage) {
    try {
      const stored = window.sessionStorage.getItem(key);
      if (stored) {
        const parsed: CacheEntry<FinancialIntelResponse> = JSON.parse(stored);
        if (now - parsed.timestamp < CACHE_TTL_MS) {
          memoryCache.set(key, parsed);
          return parsed.data;
        }
        window.sessionStorage.removeItem(key);
      }
    } catch {
      // Storage access gracefully handled
    }
  }

  return null;
}

/**
 * Stores a response in the 5-minute cache.
 */
export function setCachedIntel(
  asset: string,
  range: string,
  data: FinancialIntelResponse
): void {
  const key = getCacheKey(asset, range);
  const entry: CacheEntry<FinancialIntelResponse> = {
    data,
    timestamp: Date.now(),
  };

  memoryCache.set(key, entry);

  if (typeof window !== 'undefined' && window.sessionStorage) {
    try {
      window.sessionStorage.setItem(key, JSON.stringify(entry));
    } catch {
      // Storage quota or restriction handled
    }
  }
}

/**
 * Purges cache entries that are older than 5 minutes.
 */
export function pruneExpiredIntelCache(): void {
  const now = Date.now();
  for (const [key, entry] of memoryCache.entries()) {
    if (now - entry.timestamp >= CACHE_TTL_MS) {
      memoryCache.delete(key);
    }
  }

  if (typeof window !== 'undefined' && window.sessionStorage) {
    try {
      const keysToRemove: string[] = [];
      for (let i = 0; i < window.sessionStorage.length; i++) {
        const k = window.sessionStorage.key(i);
        if (k && k.startsWith('fin_intel_')) {
          const stored = window.sessionStorage.getItem(k);
          if (stored) {
            const parsed = JSON.parse(stored);
            if (now - parsed.timestamp >= CACHE_TTL_MS) {
              keysToRemove.push(k);
            }
          }
        }
      }
      keysToRemove.forEach((k) => window.sessionStorage.removeItem(k));
    } catch {
      // Ignore storage errors
    }
  }
}

/**
 * Explicitly clears the cache for a specific asset or all assets.
 */
export function clearFinancialIntelCache(assetFilter?: string): void {
  if (assetFilter) {
    const prefix = `fin_intel_${assetFilter.trim()}_`;
    for (const key of memoryCache.keys()) {
      if (key.startsWith(prefix)) {
        memoryCache.delete(key);
      }
    }
    if (typeof window !== 'undefined' && window.sessionStorage) {
      try {
        const keysToRemove: string[] = [];
        for (let i = 0; i < window.sessionStorage.length; i++) {
          const k = window.sessionStorage.key(i);
          if (k && k.startsWith(prefix)) {
            keysToRemove.push(k);
          }
        }
        keysToRemove.forEach((k) => window.sessionStorage.removeItem(k));
      } catch {
        // Ignore storage errors
      }
    }
  } else {
    memoryCache.clear();
    if (typeof window !== 'undefined' && window.sessionStorage) {
      try {
        const keysToRemove: string[] = [];
        for (let i = 0; i < window.sessionStorage.length; i++) {
          const k = window.sessionStorage.key(i);
          if (k && k.startsWith('fin_intel_')) {
            keysToRemove.push(k);
          }
        }
        keysToRemove.forEach((k) => window.sessionStorage.removeItem(k));
      } catch {
        // Ignore storage errors
      }
    }
  }
}

// Background timer to prune expired entries every 60 seconds
if (typeof window !== 'undefined') {
  setInterval(() => {
    pruneExpiredIntelCache();
  }, 60 * 1000);
}

export function normalizeRange(range: string): '1m' | '3m' | '6m' | '1y' {
  const r = range.toLowerCase().trim();
  if (r === '1y' || r === '12m' || r.includes('year') || r.includes('12')) return '1y';
  if (r === '6m' || r.includes('6')) return '6m';
  if (r === '1m' || (r.includes('1') && !r.includes('12') && !r.includes('year'))) return '1m';
  return '3m';
}

export function formatLakhsCurrency(amount: number): string {
  if (amount === 0) return '₹ 0 Lakhs';
  const lakhs = amount / 100000;
  if (lakhs >= 100) {
    return `₹ ${(lakhs / 100).toFixed(2)} Cr`;
  }
  if (lakhs >= 1) {
    return `₹ ${lakhs.toFixed(1)} Lakhs`;
  }
  if (lakhs >= 0.05) {
    return `₹ ${lakhs.toFixed(2)} Lakhs`;
  }
  return `₹ ${Math.round(amount).toLocaleString('en-IN')}`;
}

export async function fetchFinancialIntel(
  asset: string,
  range: string,
  forceRefresh = false
): Promise<FinancialIntelResponse> {
  const normalizedRange = normalizeRange(range);
  const cacheKey = getCacheKey(asset, normalizedRange);

  // Check 15-minute cache unless a fresh forced refresh is requested
  if (!forceRefresh) {
    const cached = getCachedIntel(asset, normalizedRange);
    if (cached) {
      return cached;
    }
  }

  // De-duplicate concurrent requests for the same asset & range
  if (inFlightRequests.has(cacheKey)) {
    return inFlightRequests.get(cacheKey)!;
  }

  const requestPromise = (async () => {
    const query = `asset=${encodeURIComponent(asset)}&range=${encodeURIComponent(normalizedRange)}`;
    let resultData: FinancialIntelResponse | null = null;

    // First attempt via local Vite proxy to avoid browser CORS restrictions
    try {
      const proxyResponse = await fetch(`/api/financial_intel?${query}`);
      if (proxyResponse.ok) {
        const data = await proxyResponse.json();
        if (data && typeof data.financial_exposure?.total_exposure === 'number') {
          resultData = data as FinancialIntelResponse;
        } else if (data && data.message) {
          throw new Error(data.message);
        }
      }
    } catch (proxyErr: any) {
      console.warn('Proxy GET encountered issue, attempting direct AWS API Gateway...', proxyErr?.message || proxyErr);
    }

    if (!resultData) {
      // Fallback to direct AWS API Gateway endpoint
      const directResponse = await fetch(`${API_ENDPOINT}?${query}`);
      if (!directResponse.ok) {
        const errText = await directResponse.text().catch(() => 'Network request failed');
        throw new Error(`Failed to fetch financial intel: ${errText}`);
      }

      const result = await directResponse.json();
      if (!result || typeof result.financial_exposure?.total_exposure !== 'number') {
        throw new Error(result?.message || 'Financial API returned no exposure data');
      }
      resultData = result as FinancialIntelResponse;
    }

    // Cache response with 15-minute lifespan
    if (resultData && resultData.financial_exposure) {
      setCachedIntel(asset, normalizedRange, resultData);
    }

    return resultData;
  })().finally(() => {
    inFlightRequests.delete(cacheKey);
  });

  inFlightRequests.set(cacheKey, requestPromise);
  return requestPromise;
}

export function mapFinancialIntelToDashboardData(
  data: FinancialIntelResponse,
  fallbackPlantName = 'Plant Facility'
): PlantData {
  const totalExpLakhs = Number((data.financial_exposure.total_exposure / 100000).toFixed(1));

  // 1. Five KPI Cards
  const kpis: KpiMetric[] = [
    {
      id: 'downtime',
      title: 'Downtime Cost Exposure',
      value: formatLakhsCurrency(data.financial_exposure.downtime_cost),
      amountLakhs: Number((data.financial_exposure.downtime_cost / 100000).toFixed(2)),
      subtext: `${data.operational.downtime_hours.toFixed(1)} hrs unplanned downtime`,
      trendText: `${data.period.calculation_days} days monitored`,
      trendDirection: 'up',
      trendPositive: false,
      color: 'red',
      icon: 'Clock',
    },
    {
      id: 'energy',
      title: 'Energy Waste Cost',
      value: formatLakhsCurrency(data.financial_exposure.energy_waste_cost),
      amountLakhs: Number((data.financial_exposure.energy_waste_cost / 100000).toFixed(2)),
      subtext: `${Math.round(data.financial_exposure.energy_waste_kwh).toLocaleString('en-IN')} kWh excess consumption`,
      trendText: 'Energy waste loss',
      trendDirection: 'down',
      trendPositive: true,
      color: 'green',
      icon: 'Zap',
    },
    {
      id: 'idle',
      title: 'Idle / Unproductive Cost',
      value: formatLakhsCurrency(data.financial_exposure.idle_unproductive_cost),
      amountLakhs: Number((data.financial_exposure.idle_unproductive_cost / 100000).toFixed(2)),
      subtext: `${data.operational.financial_unproductive_hours.toFixed(1)} hrs ${data.operational.financial_unproductive_type || 'idle'} running`,
      trendText: `${data.operational.financial_unproductive_type === 'idle' ? 'Idle running' : 'Unloaded running'}`,
      trendDirection: 'up',
      trendPositive: false,
      color: 'amber',
      icon: 'Settings',
    },
    {
      id: 'maintenance',
      title: 'Maintenance Cost Exposure',
      value: formatLakhsCurrency(data.financial_exposure.maintenance_cost),
      amountLakhs: Number((data.financial_exposure.maintenance_cost / 100000).toFixed(2)),
      subtext: `${data.operational.records_found} operational records`,
      trendText: 'Maintenance baseline',
      trendDirection: 'up',
      trendPositive: false,
      color: 'red',
      icon: 'Wrench',
    },
    {
      id: 'total_exposure',
      title: 'Total Exposure',
      value: formatLakhsCurrency(data.financial_exposure.total_exposure),
      amountLakhs: totalExpLakhs,
      subtext: 'Across all 4 cost categories',
      trendText: 'Combined loss & waste',
      trendDirection: 'up',
      trendPositive: false,
      color: 'blue',
      icon: 'IndianRupee',
    },
  ];

  // 2. Cost Distribution Categories
  const categoryStyleMap: Record<string, { color: string; bgFill: string }> = {
    'Downtime': { color: '#f43f5e', bgFill: 'bg-rose-500' },
    'Energy Waste': { color: '#10b981', bgFill: 'bg-emerald-500' },
    'Idle / Unproductive': { color: '#f59e0b', bgFill: 'bg-amber-500' },
    'Maintenance': { color: '#3b82f6', bgFill: 'bg-blue-500' },
  };

  const costCategories: CostCategory[] = (data.cost_distribution || []).map((cat, idx) => {
    const style = categoryStyleMap[cat.category] || { color: '#64748b', bgFill: 'bg-slate-500' };
    return {
      id: `cat-${idx}-${cat.category}`,
      name: cat.category,
      percentage: Number(cat.percentage.toFixed(1)),
      amountLakhs: Number((cat.value / 100000).toFixed(2)),
      color: style.color,
      bgFill: style.bgFill,
    };
  });

  // 3. Exposure Trend Data
  const trendData: MonthlyTrendData[] = (data.financial_exposure_trend || []).map((t) => ({
    month: t.month,
    total: Number((t.total_exposure / 100000).toFixed(2)),
    downtimeLoss: Number((t.downtime_cost / 100000).toFixed(2)),
    energyWaste: Number((t.energy_waste_cost / 100000).toFixed(2)),
    idleCost: Number((t.idle_unproductive_cost / 100000).toFixed(2)),
    maintenance: Number((t.maintenance_cost / 100000).toFixed(2)),
  }));

  // 4. Saving Opportunities Table
  const savingOpportunities: SavingOpportunity[] = (data.saving_opportunities || []).map((item, idx) => {
    let estimatedRange = '';
    const minLakhs = (item.estimated_min_value / 100000).toFixed(1);
    const maxLakhs = (item.estimated_max_value / 100000).toFixed(1);
    if (minLakhs === maxLakhs) {
      estimatedRange = `${minLakhs} Lakhs`;
    } else {
      estimatedRange = `${minLakhs} – ${maxLakhs} Lakhs`;
    }

    const priorityNormalized: 'High' | 'Medium' | 'Low' =
      item.priority?.toUpperCase() === 'HIGH'
        ? 'High'
        : item.priority?.toUpperCase() === 'MEDIUM'
        ? 'Medium'
        : 'Low';

    return {
      id: `opp-${idx}`,
      opportunity: item.name,
      currentSituation: `${item.current_value.toLocaleString('en-IN')} ${item.current_unit}`,
      estimatedValueRange: estimatedRange,
      priority: priorityNormalized,
      minValue: Number((item.estimated_min_value / 100000).toFixed(2)),
      maxValue: Number((item.estimated_max_value / 100000).toFixed(2)),
    };
  });

  return {
    name: fallbackPlantName,
    totalExposure: totalExpLakhs,
    downtimeHours: Number(data.operational.downtime_hours.toFixed(1)),
    kpis,
    costCategories,
    trendData,
    savingOpportunities,
    keyTakeaway: data.key_takeaway,
  };
}

export function buildPayloadFromAssumptions(
  asset: { asset: string; asset_type: string },
  assumptions: Array<{ id: string; rawNumber: number }>
): SaveAssumptionsPayload {
  const findValue = (id: string, fallback: number): number => {
    const item = assumptions.find((a) => a.id === id);
    return item && typeof item.rawNumber === 'number' && !isNaN(item.rawNumber)
      ? item.rawNumber
      : fallback;
  };

  return {
    asset: asset.asset,
    asset_type: asset.asset_type,
    electricity_tariff: findValue('tariff', 8.5),
    downtime_cost_per_hour: findValue('downtime_cost', 25000),
    maintenance_event_count: findValue('maint_events', 4),
    average_maintenance_cost: findValue('maint_event_cost', 25000),
    average_spares_labour_cost: findValue('spares_cost', 20000),
    average_production_value: findValue('production_value', 50000),
  };
}

export async function saveFinancialAssumptions(
  payload: SaveAssumptionsPayload
): Promise<SaveAssumptionsResponse> {
  let lastErrorMsg = '';

  // 1. Try /api/financial_intel proxy first
  try {
    const proxyResponse = await fetch('/api/financial_intel', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      },
      body: JSON.stringify(payload),
    });

    if (proxyResponse.ok) {
      const data = await proxyResponse.json();
      if (data && (data.message || data.asset)) {
        return data as SaveAssumptionsResponse;
      }
    } else {
      const errDetail = await proxyResponse.text().catch(() => proxyResponse.statusText);
      lastErrorMsg = `Proxy /api/financial_intel (${proxyResponse.status}): ${errDetail}`;
    }
  } catch (proxyErr: any) {
    console.warn('Proxy /api/financial_intel error:', proxyErr?.message || proxyErr);
    lastErrorMsg = proxyErr?.message || 'Proxy network error';
  }

  // 2. Try /financial_intel alternative proxy
  try {
    const altResponse = await fetch('/financial_intel', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      },
      body: JSON.stringify(payload),
    });

    if (altResponse.ok) {
      const data = await altResponse.json();
      if (data && (data.message || data.asset)) {
        return data as SaveAssumptionsResponse;
      }
    } else {
      const errDetail = await altResponse.text().catch(() => altResponse.statusText);
      lastErrorMsg = `Proxy /financial_intel (${altResponse.status}): ${errDetail}`;
    }
  } catch (altErr: any) {
    console.warn('Proxy /financial_intel error:', altErr?.message || altErr);
  }

  // 3. Direct AWS API Gateway call as secondary fallback
  try {
    const directResponse = await fetch(API_ENDPOINT, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      },
      body: JSON.stringify(payload),
    });

    if (directResponse.ok) {
      const data = await directResponse.json();
      return data as SaveAssumptionsResponse;
    }
    const errText = await directResponse.text().catch(() => directResponse.statusText);
    throw new Error(`AWS endpoint returned status ${directResponse.status}: ${errText}`);
  } catch (directErr: any) {
    console.error('Direct POST error:', directErr);
    throw new Error(
      `Failed to save assumptions: ${directErr?.message || lastErrorMsg || 'Network/CORS constraint'}`
    );
  }
}
