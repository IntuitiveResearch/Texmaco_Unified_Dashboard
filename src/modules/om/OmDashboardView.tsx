import { useState, useEffect, useCallback, forwardRef, useImperativeHandle } from 'react';
import { MachineHeaderCard } from './components/MachineHeaderCard';
import { HealthGauges } from './components/HealthGauges';
import { OperationalSummary } from './components/OperationalSummary';
import { TelemetryCards } from './components/TelemetryCards';
import { BottomRow } from './components/BottomRow';
import { ExpandedGraphModal } from './components/ExpandedGraphModal';
import {
  fetchOperationalKpi,
  fetchOperationalGraphData,
  getCachedOperationalKpi,
  getCachedOperationalGraphData,
  isGraphDataMatchingAsset,
} from './services/kpiService';
import { AVAILABLE_ASSETS } from './data/mockData';
import { OperationalKpiResponse, OperationalGraphDataResponse, TrendSample, DateRangePreset } from './types';
import { getRangeDates } from './utils/dateUtils';
import { ScreenFitContainer } from '../../components/ScreenFitContainer';

export interface OmDashboardRef {
  refresh: () => void;
}

interface OmDashboardViewProps {
  selectedAsset: string;
  rangePreset: DateRangePreset;
  onRunStateChange?: (runState: number, assetId?: string, loadState?: number) => void;
  onRefreshingChange?: (isRefreshing: boolean) => void;
}

function loadOrInitTrend(asset: string, latest: OperationalKpiResponse['latest']): TrendSample[] {
  const key = `om_kpi_trend_${asset}`;
  try {
    const cached = localStorage.getItem(key);
    if (cached) {
      const parsed: TrendSample[] = JSON.parse(cached);
      if (Array.isArray(parsed) && parsed.length > 0) {
        return parsed;
      }
    }
  } catch {
    // ignore storage error
  }

  const curRms = Number(latest.current?.rms_a ?? 0);
  const vibX = Number(latest.motioniq?.axis_x_rms_g ?? 0);
  const vibY = Number(latest.motioniq?.axis_y_rms_g ?? 0);
  const vibZ = Number(latest.motioniq?.axis_z_rms_g ?? 0);
  const tempRate = Number(latest.temperature?.instant_rate_c_per_min ?? 0);
  const timestamp = latest.current?.timestamp || new Date().toISOString();
  const baseTime = new Date(timestamp).getTime() || Date.now();

  const samples: TrendSample[] = [];
  for (let i = 4; i >= 0; i--) {
    samples.push({
      index: 5 - i,
      timestamp: new Date(baseTime - i * 60000).toISOString(),
      current_rms: Number((curRms + (i === 0 ? 0 : Math.sin(i * 1.5) * 0.35)).toFixed(2)),
      vib_x: Number((vibX + (i === 0 ? 0 : Math.sin(i * 1.1) * 0.01)).toFixed(2)),
      vib_y: Number((vibY + (i === 0 ? 0 : Math.cos(i * 0.9) * 0.01)).toFixed(2)),
      vib_z: Number((vibZ + (i === 0 ? 0 : Math.sin(i * 0.7) * 0.01)).toFixed(2)),
      temp_rate: Number((tempRate + (i === 0 ? 0 : Math.cos(i * 1.2) * 0.04)).toFixed(2)),
    });
  }
  return samples;
}

function appendTrendSample(
  asset: string,
  currentSamples: TrendSample[],
  latest: OperationalKpiResponse['latest']
): TrendSample[] {
  const timestamp = latest.current?.timestamp || new Date().toISOString();
  const curRms = Number(latest.current?.rms_a ?? 0);
  const vibX = Number(latest.motioniq?.axis_x_rms_g ?? 0);
  const vibY = Number(latest.motioniq?.axis_y_rms_g ?? 0);
  const vibZ = Number(latest.motioniq?.axis_z_rms_g ?? 0);
  const tempRate = Number(latest.temperature?.instant_rate_c_per_min ?? 0);

  const newSample: TrendSample = {
    index: currentSamples.length + 1,
    timestamp,
    current_rms: curRms,
    vib_x: vibX,
    vib_y: vibY,
    vib_z: vibZ,
    temp_rate: tempRate,
  };

  let updated = [...currentSamples];
  const last = updated[updated.length - 1];
  if (last && last.timestamp === timestamp) {
    updated[updated.length - 1] = newSample;
  } else {
    updated.push(newSample);
  }

  if (updated.length > 60) {
    updated = updated.slice(updated.length - 60);
  }

  try {
    localStorage.setItem(`om_kpi_trend_${asset}`, JSON.stringify(updated));
  } catch {}
  return updated;
}

export const OmDashboardView = forwardRef<OmDashboardRef, OmDashboardViewProps>(
  ({ selectedAsset, rangePreset, onRunStateChange, onRefreshingChange }, ref) => {
    const [data, setData] = useState<OperationalKpiResponse | null>(null);
    const [graphData, setGraphData] = useState<OperationalGraphDataResponse | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [trendSamples, setTrendSamples] = useState<TrendSample[]>([]);
    const [isExpandedModalOpen, setIsExpandedModalOpen] = useState<boolean>(false);
    const [expandedModalGraph, setExpandedModalGraph] = useState<'all' | 'current' | 'vibration' | 'temperature' | 'energyiq'>('all');

    const handleOpenExpandGraphs = (target: 'current' | 'vibration' | 'temperature' | 'energyiq' | 'all' = 'current') => {
      setExpandedModalGraph(target);
      setIsExpandedModalOpen(true);
    };

    const loadData = useCallback(async (asset: string, preset: DateRangePreset, isPoll = false, forceRefresh = false) => {
      const dates = getRangeDates(preset);
      const cachedGraph = getCachedOperationalGraphData(asset);
      const matchingCachedGraph = isGraphDataMatchingAsset(cachedGraph, asset) ? cachedGraph : null;

      // Fast switch: check cache synchronously to render immediately without spinners or network wait
      if (!forceRefresh && !isPoll) {
        const cachedKpi = getCachedOperationalKpi(asset, dates.start, dates.end, preset);
        if (cachedKpi) {
          setData(cachedKpi);
          setGraphData(matchingCachedGraph);
          if (onRunStateChange) {
            onRunStateChange(cachedKpi.latest.current.run_state, asset, cachedKpi.latest.current.load_state);
          }
          setTrendSamples((prev) => {
            if (prev.length === 0) {
              return loadOrInitTrend(asset, cachedKpi.latest);
            }
            return appendTrendSample(asset, prev, cachedKpi.latest);
          });
          setError(null);
          if (onRefreshingChange) onRefreshingChange(false);
          return;
        }
      }

      // When switching assets, immediately set matching cached graph (or null) so previous asset graph never lingers
      if (!isPoll) {
        setGraphData(matchingCachedGraph);
      }

      if (onRefreshingChange) onRefreshingChange(true);
      if (!isPoll) setError(null);

      try {
        const [kpiResponse, graphResponse] = await Promise.all([
          fetchOperationalKpi(asset, dates.start, dates.end, preset, forceRefresh),
          fetchOperationalGraphData(asset, forceRefresh).catch((e) => {
            console.warn('Failed to load operational graph data:', e);
            return null;
          }),
        ]);

        setData(kpiResponse);
        const matchingFetchedGraph = isGraphDataMatchingAsset(graphResponse, asset) ? graphResponse : null;
        setGraphData(matchingFetchedGraph);
        if (onRunStateChange) {
          onRunStateChange(kpiResponse.latest.current.run_state, asset, kpiResponse.latest.current.load_state);
        }

        setTrendSamples((prev) => {
          if (prev.length === 0) {
            return loadOrInitTrend(asset, kpiResponse.latest);
          }
          return appendTrendSample(asset, prev, kpiResponse.latest);
        });
        setError(null);
      } catch (err: any) {
        console.error('Error loading KPI data from endpoint:', err);
        if (!isPoll) {
          setError(err.message || 'Failed to fetch operational KPI data');
        }
      } finally {
        if (onRefreshingChange) onRefreshingChange(false);
      }
    }, [onRefreshingChange, onRunStateChange]);

    useImperativeHandle(ref, () => ({
      refresh: () => {
        loadData(selectedAsset, rangePreset, false, true);
      },
    }));

    useEffect(() => {
      loadData(selectedAsset, rangePreset, false, false);
    }, [loadData, selectedAsset, rangePreset]);

    // 60-second auto-refresh polling (gentle background poll, does not force bust cache)
    useEffect(() => {
      const pollInterval = setInterval(() => {
        loadData(selectedAsset, rangePreset, true, false);
      }, 60000);
      return () => clearInterval(pollInterval);
    }, [loadData, selectedAsset, rangePreset]);

    const currentAssetMeta = AVAILABLE_ASSETS.find((a) => a.id === selectedAsset) || {
      id: selectedAsset,
      name: selectedAsset,
      plant: 'Texmaco - Agarpara',
      deviceId: selectedAsset,
      type: 'Compressor',
      status: 'Running' as const,
    };

    if (!data) {
      return (
        <div className="flex-1 flex items-center justify-center p-6">
          {error ? (
            <div className="bg-white p-6 rounded-xl border border-rose-200 shadow-sm max-w-md w-full text-center space-y-3">
              <div className="w-12 h-12 rounded-full bg-rose-100 text-rose-600 flex items-center justify-center mx-auto text-xl font-bold">
                !
              </div>
              <h2 className="text-base font-bold text-slate-800">Failed to Load Telemetry Data</h2>
              <p className="text-xs text-rose-600 bg-rose-50 p-2.5 rounded font-mono break-all">{error}</p>
              <button
                onClick={() => loadData(selectedAsset, rangePreset, false)}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-semibold cursor-pointer transition-colors shadow-xs"
              >
                Retry Connection
              </button>
            </div>
          ) : (
            <div className="flex flex-col items-center gap-3">
              <div className="w-10 h-10 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
              <p className="text-sm font-semibold text-slate-600">Loading...</p>
            </div>
          )}
        </div>
      );
    }

    return (
      <ScreenFitContainer idealHeight={710} idealWidth={1280} className="bg-[#f4f7fb]">
        <div className="flex-1 flex flex-col min-w-0 h-full max-h-full overflow-y-auto 2xl:overflow-hidden justify-between">
          {/* Main Operational Canvas - visually dense and scaled to fit screen */}
          <div className="flex-1 w-full px-2 sm:px-3 2xl:px-4 pt-1 pb-3 sm:pb-4 space-y-1 sm:space-y-1.2 flex flex-col justify-start min-h-0">
            {/* Top Section: Machine Info Card + Health Gauges */}
            <section className="grid grid-cols-1 lg:grid-cols-12 gap-1.5 shrink-0">
              <div className="lg:col-span-4">
                <MachineHeaderCard
                  compressorId={data.compressor}
                  assetMeta={currentAssetMeta}
                  cycleId={data.latest.current.cycle_id}
                  lastUpdate={data.latest.current.timestamp}
                  runState={data.latest.current.run_state}
                  loadState={data.latest.current.load_state}
                />
              </div>

              <div className="lg:col-span-8">
                <HealthGauges
                  latest={data.latest}
                  kpis={data.kpis}
                  onOpenExpandGraphs={() => handleOpenExpandGraphs('all')}
                />
              </div>
            </section>

            {/* Operational Summary (11 KPIs fitted into compact row) */}
            <section className="w-full shrink-0">
              <OperationalSummary
                kpis={data.kpis}
                selectedRange={rangePreset}
              />
            </section>

            {/* Deep Telemetry Cards (Current, Vibration, Temperature, Electrical MFM) */}
            <section className="w-full shrink-0">
              <TelemetryCards
                latest={data.latest}
                kpis={data.kpis}
                trendSamples={trendSamples}
                graphData={graphData}
                compressorId={selectedAsset}
                onOpenExpandGraphs={handleOpenExpandGraphs}
              />
            </section>

            {/* Bottom Row: Communications Health, Active Advisories, Quick Actions */}
            <section className="w-full shrink-0">
              <BottomRow
                latest={data.latest}
                compressorId={selectedAsset}
                onOpenExpandGraphs={() => handleOpenExpandGraphs('all')}
              />
            </section>
          </div>

          {/* Expanded Telemetry Graphs Modal */}
          <ExpandedGraphModal
            isOpen={isExpandedModalOpen}
            onClose={() => setIsExpandedModalOpen(false)}
            compressorId={selectedAsset}
            graphData={graphData}
            trendSamples={trendSamples}
            selectedGraph={expandedModalGraph}
            latest={data?.latest}
          />
        </div>
      </ScreenFitContainer>
    );
  }
);
