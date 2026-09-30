import { useState, useEffect, useCallback } from 'react';
import { Sidebar } from './components/Sidebar';
import { Header } from './components/Header';
import { MachineHeaderCard } from './components/MachineHeaderCard';
import { HealthGauges } from './components/HealthGauges';
import { OperationalSummary } from './components/OperationalSummary';
import { TelemetryCards } from './components/TelemetryCards';
import { BottomRow } from './components/BottomRow';
import { ExpandedGraphModal } from './components/ExpandedGraphModal';
import { fetchOperationalKpi, fetchOperationalGraphData } from './services/kpiService';
import { AVAILABLE_ASSETS } from './data/mockData';
import { OperationalKpiResponse, OperationalGraphDataResponse, TrendSample, AuthUser, DateRangePreset } from './types';
import { LoginScreen } from './components/LoginScreen';
import { getSavedAuthUser, logoutUser } from './services/authService';
import { getRangeDates } from './utils/dateUtils';

/**
 * Loads previous trend history from localStorage or generates an initial 5-sample
 * recent baseline using the real latest telemetry values so the trend line is visible immediately.
 */
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

  // Create initial 5 samples leading up to current reading
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

/**
 * Appends a new live sample from the endpoint into the historical series (capped at 60 minutes)
 * and persists to localStorage.
 */
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

  // Keep up to 60 samples (representing the last 60 minutes)
  if (updated.length > 60) {
    updated = updated.slice(updated.length - 60);
  }

  // Re-index cleanly
  updated = updated.map((s, i) => ({ ...s, index: i + 1 }));

  try {
    localStorage.setItem(`om_kpi_trend_${asset}`, JSON.stringify(updated));
  } catch {
    // ignore storage error
  }

  return updated;
}

export default function App() {
  const [currentUser, setCurrentUser] = useState<AuthUser | null>(() => getSavedAuthUser());
  const [selectedAsset, setSelectedAsset] = useState<string>('CMP#02');
  const [rangePreset, setRangePreset] = useState<DateRangePreset>('30days');
  const initial30Days = getRangeDates('30days');
  const [startDate, setStartDate] = useState<string>(initial30Days.start);
  const [endDate, setEndDate] = useState<string>(initial30Days.end);

  const [data, setData] = useState<OperationalKpiResponse | null>(null);
  const [graphData, setGraphData] = useState<OperationalGraphDataResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [trendSamples, setTrendSamples] = useState<TrendSample[]>([]);
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);
  const [secondsUntilNextPoll, setSecondsUntilNextPoll] = useState<number>(60);
  const [isExpandedModalOpen, setIsExpandedModalOpen] = useState<boolean>(false);
  const [expandedModalGraph, setExpandedModalGraph] = useState<'all' | 'current' | 'vibration' | 'temperature' | 'energyiq'>('all');
  const [activeSidebarTab, setActiveSidebarTab] = useState<string>('dashboard');

  const handleOpenExpandGraphs = (target: 'current' | 'vibration' | 'temperature' | 'energyiq' | 'all' = 'current') => {
    setExpandedModalGraph(target);
    setIsExpandedModalOpen(true);
  };

  const loadData = useCallback(async (asset: string, start?: string, end?: string, isPoll = false) => {
    let finalStart = start;
    let finalEnd = end;
    if (!finalStart || !finalEnd || finalStart.trim() === '' || finalEnd.trim() === '') {
      const dates = getRangeDates(rangePreset);
      finalStart = dates.start;
      finalEnd = dates.end;
    }

    setIsRefreshing(true);
    if (!isPoll) setError(null);
    try {
      const [kpiResponse, graphResponse] = await Promise.all([
        fetchOperationalKpi(asset, finalStart, finalEnd, rangePreset),
        fetchOperationalGraphData(asset).catch((e) => {
          console.warn('Failed to load operational graph data:', e);
          return null;
        }),
      ]);

      setData(kpiResponse);
      if (graphResponse) {
        setGraphData(graphResponse);
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
      setIsRefreshing(false);
    }
  }, [rangePreset]);

  // Initial load on asset or date change (only when authenticated)
  useEffect(() => {
    if (currentUser) {
      loadData(selectedAsset, startDate, endDate, false);
    }
  }, [loadData, selectedAsset, startDate, endDate, currentUser]);

  // 1-second countdown clock for next poll (only when authenticated)
  useEffect(() => {
    if (!currentUser) return;
    const timer = setInterval(() => {
      setSecondsUntilNextPoll((sec) => (sec <= 1 ? 60 : sec - 1));
    }, 1000);
    return () => clearInterval(timer);
  }, [currentUser]);

  // 1-minute (60 seconds) polling interval to fetch changing values from endpoint
  useEffect(() => {
    if (!currentUser) return;
    const pollInterval = setInterval(() => {
      loadData(selectedAsset, startDate, endDate, true);
      setSecondsUntilNextPoll(60);
    }, 60000);

    return () => clearInterval(pollInterval);
  }, [loadData, selectedAsset, startDate, endDate, currentUser]);

  const handleSelectAsset = (newAssetId: string) => {
    setSelectedAsset(newAssetId);
    setSecondsUntilNextPoll(60);
    setTrendSamples([]);
    loadData(newAssetId, startDate, endDate, false);
  };

  const handleDateRangeChange = (newStart?: string, newEnd?: string, preset?: DateRangePreset) => {
    const effectivePreset = preset || rangePreset;
    let finalStart = newStart;
    let finalEnd = newEnd;

    if (!finalStart || !finalEnd || finalStart.trim() === '' || finalEnd.trim() === '') {
      const dates = getRangeDates(effectivePreset);
      finalStart = dates.start;
      finalEnd = dates.end;
    }

    setStartDate(finalStart);
    setEndDate(finalEnd);
    if (preset) {
      setRangePreset(preset);
    }
    setSecondsUntilNextPoll(60);
    loadData(selectedAsset, finalStart, finalEnd, false);
  };

  const handleRefresh = () => {
    setSecondsUntilNextPoll(60);
    loadData(selectedAsset, startDate, endDate, false);
  };

  const handleLogout = () => {
    logoutUser();
    setCurrentUser(null);
  };

  // If user is not authenticated, show the login screen
  if (!currentUser) {
    return <LoginScreen onLoginSuccess={(user) => setCurrentUser(user)} />;
  }

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
      <div className="min-h-screen bg-slate-100 flex items-center justify-center p-4">
        {error ? (
          <div className="bg-white p-6 rounded-xl border border-rose-200 shadow-sm max-w-md w-full text-center space-y-3">
            <div className="w-12 h-12 rounded-full bg-rose-100 text-rose-600 flex items-center justify-center mx-auto text-xl font-bold">
              !
            </div>
            <h2 className="text-base font-bold text-slate-800">Failed to Load Telemetry Data</h2>
            <p className="text-xs text-rose-600 bg-rose-50 p-2.5 rounded font-mono break-all">{error}</p>
            <p className="text-xs text-slate-500">
              Please verify your network connection and retry.
            </p>
            <button
              onClick={handleRefresh}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-semibold cursor-pointer transition-colors shadow-xs"
            >
              Retry Connection
            </button>
          </div>
        ) : (
          <div className="flex flex-col items-center gap-3">
            <div className="w-10 h-10 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
            <p className="text-sm font-semibold text-slate-600">Loading Operational KPI Data...</p>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#f4f7fb] text-slate-800 flex flex-row font-sans">
      {/* Left Sidebar */}
      <Sidebar
        currentTab={activeSidebarTab}
        onSelectTab={setActiveSidebarTab}
      />

      {/* Main Workspace Area */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Header with Asset ID, Brand Philosophy, and User Profile */}
        <Header
          selectedAsset={selectedAsset}
          onSelectAsset={handleSelectAsset}
          startDate={startDate}
          endDate={endDate}
          rangeType={rangePreset}
          onDateRangeChange={handleDateRangeChange}
          lastUpdate={data.latest.current.timestamp}
          isRefreshing={isRefreshing}
          onRefresh={handleRefresh}
          nextPollInSeconds={secondsUntilNextPoll}
          runState={data.latest.current.run_state}
          currentUser={currentUser}
          onLogout={handleLogout}
        />

        {/* Main Dashboard Content */}
        <main className="flex-1 w-full px-2 sm:px-3 2xl:px-4 py-1.5 space-y-1.5">
          {/* Top Section: Machine Info Card + Health Gauges */}
          <section className="grid grid-cols-1 lg:grid-cols-12 gap-1.5">
            <div className="lg:col-span-4">
              <MachineHeaderCard
                compressorId={data.compressor}
                assetMeta={currentAssetMeta}
                cycleId={data.latest.current.cycle_id}
                lastUpdate={data.latest.current.timestamp}
                runState={data.latest.current.run_state}
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

          {/* Operational Summary (11 KPIs fitted into compact single row) */}
          <section className="w-full">
            <OperationalSummary
              kpis={data.kpis}
              selectedRange={rangePreset}
            />
          </section>

          {/* Deep Telemetry Cards (Current, Vibration, Temperature, Electrical MFM) */}
          <section className="w-full">
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
          <section className="w-full">
            <BottomRow
              latest={data.latest}
              onOpenExpandGraphs={() => handleOpenExpandGraphs('all')}
            />
          </section>
        </main>

        {/* Expanded Telemetry Graphs Modal Popup */}
        <ExpandedGraphModal
          isOpen={isExpandedModalOpen}
          onClose={() => setIsExpandedModalOpen(false)}
          compressorId={selectedAsset}
          graphData={graphData}
          trendSamples={trendSamples}
          selectedGraph={expandedModalGraph}
          latest={data?.latest}
        />

        {/* Dashboard Sub-Footer */}
        <footer className="border-t border-slate-200 bg-white py-1 px-3 sm:px-4 text-[10.5px] text-slate-400 flex flex-wrap items-center justify-between gap-1">
          <div className="flex items-center gap-2 text-[11px] 2xl:text-xs">
            <span>Assets</span>
            <span className="text-slate-300">|</span>
            <span>Data</span>
            <span className="text-slate-300">|</span>
            <span>People</span>
            <span className="text-slate-300">|</span>
            <span>Sustainability</span>
            <span className="text-slate-300">|</span>
            <span>Growth</span>
          </div>
          <div className="text-[11px] 2xl:text-xs">
            <span className="font-semibold text-slate-600">IntuitiveIntelligence™</span>
            <span className="text-slate-300 mx-2">|</span>
            <span>Real Assets. Real Intelligence. A Stronger Tomorrow.</span>
          </div>
        </footer>
      </div>
    </div>
  );
}
