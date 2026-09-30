import { useCallback, useEffect, useState } from 'react';
import { fetchOperationalKpi, getCachedOperationalKpi } from '../modules/om/services/kpiService';
import type { DateRangePreset } from '../modules/om/types';
import { getOperatingStatus, type AssetStatus } from '../utils/assetStatus';

const TELEMETRY_ASSETS = ['CMP#01', 'CMP#02', 'CNC#01'];

export function useAssetStatuses(enabled: boolean, rangePreset: DateRangePreset) {
  const [statuses, setStatuses] = useState<Record<string, AssetStatus>>(() => {
    const initial: Record<string, AssetStatus> = { 'ROBO#01': 'Running' };
    for (const assetId of TELEMETRY_ASSETS) {
      const cached = getCachedOperationalKpi(assetId, undefined, undefined, rangePreset);
      initial[assetId] = cached ? getOperatingStatus(cached.latest.current.run_state, cached.latest.current.load_state, assetId) : 'Unknown';
    }
    return initial;
  });

  const reportRunState = useCallback((runState: number, assetId?: string, loadState?: number) => {
    if (!assetId) return;
    const status = getOperatingStatus(runState, loadState, assetId);
    setStatuses(previous => previous[assetId] === status ? previous : { ...previous, [assetId]: status });
  }, []);

  const refreshStatuses = useCallback(async () => {
    if (!enabled) return;
    // Share O&M's cache and in-flight requests; Robo Welder remains a running frontend preview.
    await Promise.allSettled(TELEMETRY_ASSETS.map(async assetId => {
      const data = await fetchOperationalKpi(assetId, undefined, undefined, rangePreset);
      reportRunState(data.latest.current.run_state, assetId, data.latest.current.load_state);
    }));
  }, [enabled, rangePreset, reportRunState]);

  useEffect(() => {
    if (!enabled) return;
    void refreshStatuses();
    const timer = setInterval(() => { void refreshStatuses(); }, 60000);
    return () => clearInterval(timer);
  }, [enabled, refreshStatuses]);

  return { statuses, reportRunState, refreshStatuses };
}
