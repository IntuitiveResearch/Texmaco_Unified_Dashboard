import { useCallback, useEffect, useState } from 'react';
import { fetchOperationalKpi, getCachedOperationalKpi } from '../modules/om/services/kpiService';
import { fetchWeldingData, getCachedWeldingData, DEFAULT_WELDING_MACHINE } from '../modules/om/services/weldingService';
import type { DateRangePreset } from '../modules/om/types';
import { getOperatingStatus, type AssetStatus } from '../utils/assetStatus';
import { getRangeDates } from '../modules/om/utils/dateUtils';

const TELEMETRY_ASSETS = ['CMP#01', 'CMP#02', 'CNC#01'];

function getRoboLatestCurrent(data: any): number {
  if (!data) return 0;
  const series = data.current_time_series;
  if (Array.isArray(series) && series.length > 0) {
    const last = series[series.length - 1];
    if (typeof last?.peak_current_a === 'number') return last.peak_current_a;
    if (typeof last?.rms_a === 'number') return last.rms_a;
  }
  return 0;
}

export function useAssetStatuses(enabled: boolean, rangePreset: DateRangePreset) {
  const [statuses, setStatuses] = useState<Record<string, AssetStatus>>(() => {
    const dates = getRangeDates(rangePreset);
    const cachedWelding = getCachedWeldingData(DEFAULT_WELDING_MACHINE, dates.start, dates.end);
    const roboCurrent = cachedWelding ? getRoboLatestCurrent(cachedWelding) : 0;
    const initial: Record<string, AssetStatus> = {
      'ROBO#01': roboCurrent > 0 ? 'Online' : 'Offline',
    };
    for (const assetId of TELEMETRY_ASSETS) {
      const cached = getCachedOperationalKpi(assetId, undefined, undefined, rangePreset);
      initial[assetId] = cached
        ? getOperatingStatus(cached.latest.current.run_state, cached.latest.current.load_state, assetId, cached.latest.current.rms_a)
        : 'Online';
    }
    return initial;
  });

  const reportRunState = useCallback((runState: number, assetId?: string, loadState?: number, latestCurrent?: number) => {
    if (!assetId) return;
    const status = getOperatingStatus(runState, loadState, assetId, latestCurrent);
    setStatuses(previous => previous[assetId] === status ? previous : { ...previous, [assetId]: status });
  }, []);

  const refreshStatuses = useCallback(async () => {
    if (!enabled) return;
    const dates = getRangeDates(rangePreset);
    await Promise.allSettled([
      ...TELEMETRY_ASSETS.map(async assetId => {
        const data = await fetchOperationalKpi(assetId, undefined, undefined, rangePreset, true);
        const cur = data.latest?.current?.rms_a ?? 0;
        reportRunState(data.latest.current.run_state, assetId, data.latest.current.load_state, cur);
      }),
      (async () => {
        try {
          const data = await fetchWeldingData(DEFAULT_WELDING_MACHINE, dates.start, dates.end, true);
          const roboCurrent = getRoboLatestCurrent(data);
          reportRunState(roboCurrent > 0 ? 1 : 0, 'ROBO#01', roboCurrent > 0 ? 1 : 0, roboCurrent);
        } catch {
          // Keep previous status on network error
        }
      })(),
    ]);
  }, [enabled, rangePreset, reportRunState]);

  useEffect(() => {
    if (!enabled) return;
    void refreshStatuses();
    const timer = setInterval(() => { void refreshStatuses(); }, 60000);
    return () => clearInterval(timer);
  }, [enabled, refreshStatuses]);

  return { statuses, reportRunState, refreshStatuses };
}

