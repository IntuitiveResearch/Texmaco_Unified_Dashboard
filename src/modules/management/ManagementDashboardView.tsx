import React, { useEffect, useState, useMemo, forwardRef, useImperativeHandle } from 'react';
import { fetchDashboardData, getCachedDashboardData } from './api';
import { DashboardData } from './types';
import { KPICard } from './components/KPICard';
import { ChartCard } from './components/ChartCard';
import { ExpandedChartModal } from './components/ExpandedChartModal';
import { ReportModal } from './components/ReportModal';
import { formatPercent } from './utils';
import { format, subDays } from 'date-fns';
import { ScreenFitContainer } from '../../components/ScreenFitContainer';

import {
  Activity,
  Power,
  Clock,
  Zap,
  AlertTriangle,
  Timer,
  ShieldAlert,
  Battery,
  ZapOff,
  Maximize2,
  X
} from 'lucide-react';

import cmp01Img from './assets/CMP01.jpeg';
import cmp02Img from './assets/CMP02.jpeg';
import cnc01Img from './assets/CNC01.jpeg';
import robo01Img from '../../assets/weldwise-robotic-cell.jpg';
import { MachineHeaderCard } from '../om/components/MachineHeaderCard';

import { HeatingCoolingChart } from './components/charts/HeatingCoolingChart';
import { ReliabilityChart } from './components/charts/ReliabilityChart';
import { RuntimeDistributionChart } from './components/charts/RuntimeDistributionChart';
import { AvailabilityTrendChart } from './components/charts/AvailabilityTrendChart';
import { UtilizationPercentageChart } from './components/charts/UtilizationPercentageChart';
import { WorstDowntimeDaysChart } from './components/charts/WorstDowntimeDaysChart';
import { TimeBreakdownChart } from './components/charts/TimeBreakdownChart';

import { ActiveAlertsCard, getManagementAlerts } from './components/ActiveAlertsCard';

type ExpandedChartKey = 'utilization' | 'availability' | 'thermal' | 'interrupts';

const CNC_ASSET_LABEL = 'CNC#01';
const CNC_API_COMPRESSOR = 'MACHINE#PI4G/TXMCNCI/26001';
const ROBO_ASSET_LABEL = 'ROBO#01';
const ROBO_API_COMPRESSOR = 'MACHINE#PI4G/TXMMIGI/26001';
const SECONDS_PER_DAY = 24 * 60 * 60;

const toFiniteNumber = (value: unknown): number => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
};

const getVisualDateSet = (graphs: DashboardData['graphs']): Set<string> => {
  const runtimeDates = new Set(
    (graphs.runtime_distribution || [])
      .filter((item) => (
        toFiniteNumber(item.runtime) +
        toFiniteNumber(item.downtime) +
        toFiniteNumber(item.offline) +
        toFiniteNumber(item.idle)
      ) > 0)
      .map((item) => item.date)
  );

  if (runtimeDates.size > 0) return runtimeDates;

  return new Set([
    ...(graphs.availability || []).map((item) => item.date),
    ...(graphs.utilization || []).map((item) => item.date),
    ...(graphs.reliability || []).map((item) => item.date),
    ...(graphs.cycle_count || []).map((item) => item.date),
  ].filter(Boolean));
};

const filterByVisualDates = <T extends { date: string }>(items: T[] | undefined, visualDates: Set<string>): T[] => {
  if (!items) return [];
  if (visualDates.size === 0) return items;
  return items.filter((item) => visualDates.has(item.date));
};

const sumBy = <T,>(items: T[], selector: (item: T) => unknown): number => (
  items.reduce((sum, item) => sum + toFiniteNumber(selector(item)), 0)
);

const createVisualSummary = (
  summary: DashboardData['summary'],
  graphs: DashboardData['graphs'],
  isCncAsset: boolean,
  visualDates: Set<string>
): DashboardData['summary'] => {
  const runtimeRows = filterByVisualDates(graphs.runtime_distribution, visualDates);
  if (runtimeRows.length === 0) return summary;

  const runtimeSeconds = sumBy(runtimeRows, (item) => item.runtime);
  const downtimeSeconds = sumBy(runtimeRows, (item) => item.downtime);
  const offlineSeconds = sumBy(runtimeRows, (item) => item.offline);
  const idleSeconds = sumBy(runtimeRows, (item) => item.idle);
  const visualSummary = {
    ...summary,
    runtime_seconds: runtimeSeconds,
    downtime_seconds: downtimeSeconds,
    offline_seconds: offlineSeconds,
  };

  if (isCncAsset) {
    const cycleRows = filterByVisualDates(graphs.cycle_count, visualDates);

    return {
      ...visualSummary,
      idle_seconds: idleSeconds,
      availability: summary.availability,
      avg_utilization: summary.avg_utilization,
      cycle_count: cycleRows.length > 0 ? sumBy(cycleRows, (item) => item.cycle_count) : summary.cycle_count,
    };
  }

  const utilizationRows = filterByVisualDates(graphs.utilization, visualDates);
  const loadedRuntimeSeconds = sumBy(utilizationRows, (item) => item.loaded);
  const unloadedRuntimeSeconds = sumBy(utilizationRows, (item) => item.unloaded);
  const idleRuntimeSeconds = sumBy(utilizationRows, (item) => item.idle);
  const actualPeriodSeconds = runtimeRows.length * SECONDS_PER_DAY;

  return {
    ...visualSummary,
    loaded_runtime_seconds: loadedRuntimeSeconds,
    unloaded_runtime_seconds: unloadedRuntimeSeconds,
    idle_runtime_seconds: idleRuntimeSeconds,
    availability: summary.availability,
    runtime_percentage: actualPeriodSeconds > 0 ? (runtimeSeconds / actualPeriodSeconds) * 100 : summary.runtime_percentage,
    downtime_percentage: actualPeriodSeconds > 0 ? (downtimeSeconds / actualPeriodSeconds) * 100 : summary.downtime_percentage,
    offline_percentage: actualPeriodSeconds > 0 ? (offlineSeconds / actualPeriodSeconds) * 100 : summary.offline_percentage,
    idle_percentage: actualPeriodSeconds > 0 ? (idleRuntimeSeconds / actualPeriodSeconds) * 100 : summary.idle_percentage,
  };
};

const getAverageUtilization = (
  summary: DashboardData['summary'],
  graphs: DashboardData['graphs'],
  isCncAsset: boolean,
  visualDates: Set<string>
): number => {
  if (isCncAsset) {
    return toFiniteNumber(summary.avg_utilization);
  }

  const utilizationList = filterByVisualDates(graphs.utilization, visualDates);
  const runtimeDistList = filterByVisualDates(graphs.runtime_distribution, visualDates);
  const runtimeMap = new Map(runtimeDistList.map((r) => [r.date, r.runtime]));
  const utilizationPercentages = utilizationList.map((item) => {
    const runtime = runtimeMap.get(item.date) ?? (item.loaded + item.unloaded + item.idle);
    const percentage = runtime > 0 ? (item.loaded / runtime) * 100 : 0;
    return percentage > 100 ? 100 : percentage;
  });

  return utilizationPercentages.length > 0
    ? utilizationPercentages.reduce((acc, val) => acc + val, 0) / utilizationPercentages.length
    : summary.runtime_seconds > 0 && summary.loaded_runtime_seconds > 0
    ? (summary.loaded_runtime_seconds / summary.runtime_seconds) * 100
    : 0;
};

const PLANT_ID_MAP: Record<string, string> = {
  'CMP#01': '011885',
  'CMP#02': '011884',
  'CNC#01': 'CN60I1626089',
  'ROBO#01': 'PI4G/TXMMIGI/26001',
  'CMP01': '011885',
  'CMP02': '011884',
  'CNC01': 'CN60I1626089',
  'ROBO01': 'PI4G/TXMMIGI/26001',
};

const ASSET_IMAGE_MAP: Record<string, string> = {
  'CMP#01': cmp01Img,
  'CMP01': cmp01Img,
  'CMP#02': cmp02Img,
  'CMP02': cmp02Img,
  'CNC#01': cnc01Img,
  'CNC01': cnc01Img,
  'ROBO#01': robo01Img,
  'ROBO01': robo01Img,
};

export interface ManagementDashboardRef {
  refresh: () => void;
  openAiReport: () => void;
}

interface ManagementDashboardViewProps {
  selectedAsset: string;
  datePreset: string;
  customStartDate?: string;
  customEndDate?: string;
  onCustomDateChange?: (start: string, end: string) => void;
  isReportModalOpen: boolean;
  onCloseReportModal: () => void;
  onOpenReportModal: () => void;
  onSelectAsset?: (assetId: string) => void;
  onSelectDatePreset?: (preset: string) => void;
  onRefreshingChange?: (isRefreshing: boolean) => void;
  theme?: 'dark' | 'light';
  onToggleTheme?: () => void;
}

export const ManagementDashboardView = forwardRef<ManagementDashboardRef, ManagementDashboardViewProps>(
  (
    {
      selectedAsset,
      datePreset,
      customStartDate,
      customEndDate,
      onCustomDateChange,
      isReportModalOpen,
      onCloseReportModal,
      onOpenReportModal,
      onSelectAsset,
      onSelectDatePreset,
      onRefreshingChange,
      theme: propTheme = 'dark',
      onToggleTheme,
    },
    ref
  ) => {
    const [data, setData] = useState<DashboardData | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [theme, setTheme] = useState<'dark' | 'light'>(propTheme);
    const [showImageModal, setShowImageModal] = useState(false);
    const [expandedChart, setExpandedChart] = useState<ExpandedChartKey | null>(null);

    useEffect(() => {
      if (propTheme) {
        setTheme(propTheme);
      }
    }, [propTheme]);

    // Asset state
    const [compressor, setCompressor] = useState(selectedAsset || 'CMP#01');
    const [preset, setPreset] = useState<'7d' | '30d' | 'custom'>(
      datePreset === '7days' || datePreset === '7d' ? '7d' : datePreset === 'custom' ? 'custom' : '30d'
    );
    const [startDate, setStartDate] = useState(
      customStartDate || format(subDays(new Date(), 30), 'yyyy-MM-dd')
    );
    const [endDate, setEndDate] = useState(
      customEndDate || format(new Date(), 'yyyy-MM-dd')
    );

    // Sync from parent props
    useEffect(() => {
      if (selectedAsset && selectedAsset !== compressor) {
        setCompressor(selectedAsset);
      }
    }, [selectedAsset]);

    useEffect(() => {
      if (datePreset === 'custom') {
        setPreset('custom');
        if (customStartDate) setStartDate(customStartDate);
        if (customEndDate) setEndDate(customEndDate);
      } else {
        const mappedPreset = datePreset === '7days' || datePreset === '7d' ? '7d' : '30d';
        setPreset(mappedPreset);
        const days = mappedPreset === '7d' ? 7 : 30;
        setStartDate(format(subDays(new Date(), days), 'yyyy-MM-dd'));
        setEndDate(format(new Date(), 'yyyy-MM-dd'));
      }
    }, [datePreset, customStartDate, customEndDate]);

    const isRoboAsset = compressor === ROBO_ASSET_LABEL || compressor.includes('ROBO');
    const isCncAsset = compressor === CNC_ASSET_LABEL || compressor.includes('CNC');
    const requestCompressor = isRoboAsset
      ? ROBO_API_COMPRESSOR
      : isCncAsset
      ? CNC_API_COMPRESSOR
      : compressor;

    const loadData = async (forceRefresh = false) => {
      // Fast switch: check cache immediately to avoid spinner and latency
      if (!forceRefresh) {
        const cached = getCachedDashboardData(requestCompressor, startDate, endDate);
        if (cached) {
          setData(cached);
          setError(null);
          setLoading(false);
          if (onRefreshingChange) onRefreshingChange(false);
          return;
        }
      }

      setLoading(true);
      setError(null);
      if (onRefreshingChange) onRefreshingChange(true);

      try {
        const dashboardData = await fetchDashboardData(requestCompressor, startDate, endDate, forceRefresh);
        setData(dashboardData);
      } catch (err: any) {
        console.error('Error fetching management dashboard:', err);
        setError(err.message || 'Failed to fetch dashboard data');
      } finally {
        setLoading(false);
        if (onRefreshingChange) onRefreshingChange(false);
      }
    };

    useImperativeHandle(ref, () => ({
      refresh: () => loadData(true),
      openAiReport: () => onOpenReportModal(),
    }));

    useEffect(() => {
      loadData(false);
    }, [requestCompressor, startDate, endDate]);

    const visualDateSet = useMemo(() => {
      return data ? getVisualDateSet(data.graphs) : new Set<string>();
    }, [data]);

    const rawSummary = data?.summary;
    const rawGraphs = data?.graphs;

    const graphs = useMemo(() => {
      if (!rawGraphs) return null;
      return {
        runtime_distribution: filterByVisualDates(rawGraphs.runtime_distribution, visualDateSet),
        current_analysis: filterByVisualDates(rawGraphs.current_analysis, visualDateSet),
        thermal_analysis: filterByVisualDates(rawGraphs.thermal_analysis, visualDateSet),
        thermal_rates: filterByVisualDates(rawGraphs.thermal_rates, visualDateSet),
        utilization: filterByVisualDates(rawGraphs.utilization, visualDateSet),
        reliability: filterByVisualDates(rawGraphs.reliability, visualDateSet),
        events: filterByVisualDates(rawGraphs.events, visualDateSet),
        cycle_count: filterByVisualDates(rawGraphs.cycle_count, visualDateSet),
        time_breakdown: rawGraphs.time_breakdown,
        availability: filterByVisualDates(rawGraphs.availability, visualDateSet),
      };
    }, [rawGraphs, visualDateSet]);

    const summary = useMemo(() => {
      if (!rawSummary || !rawGraphs) return null;
      return createVisualSummary(rawSummary, rawGraphs, isCncAsset, visualDateSet);
    }, [rawSummary, rawGraphs, isCncAsset, visualDateSet]);

    const managementAlerts = useMemo(() => {
      if (!graphs || !summary || isCncAsset) return [];
      return getManagementAlerts(summary, graphs.thermal_rates);
    }, [graphs, summary, isCncAsset]);

    const avgUtilization = useMemo(() => {
      if (!summary || !graphs) return 0;
      return getAverageUtilization(summary, graphs, isCncAsset, visualDateSet);
    }, [summary, graphs, isCncAsset, visualDateSet]);

    const visualDayCount = useMemo(() => {
      if (!graphs) return 0;
      return Math.max(visualDateSet.size, graphs.runtime_distribution.length);
    }, [graphs, visualDateSet]);


    if (!data && !error) {
      return (
        <div className={`management-root ${theme} min-h-[400px] flex items-center justify-center p-6 w-full h-full`}>
          <div className="flex flex-col items-center gap-3">
            <div className="w-10 h-10 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
            <p className="text-sm font-semibold text-slate-600 dark:text-slate-300">Loading...</p>
          </div>
        </div>
      );
    }

    if (error && !data) {
      return (
        <div className={`management-root ${theme} min-h-screen flex items-center justify-center p-6 w-full h-full`}>
          <div className="flex flex-col items-center gap-4 text-center max-w-md p-6 bg-[var(--panel)] border border-[var(--line)] rounded-xl shadow-lg">
            <AlertTriangle size={32} className="text-[var(--coral)]" />
            <h2 className="text-[var(--text)] font-bold text-lg">Telemetry Offline</h2>
            <p className="text-[var(--muted)] text-sm">{error}</p>
            <button
              onClick={() => loadData(true)}
              className="mt-4 px-4 py-2 bg-[color-mix(in_srgb,var(--cyan)_20%,transparent)] text-[var(--cyan)] text-sm font-bold uppercase rounded hover:bg-[color-mix(in_srgb,var(--cyan)_30%,transparent)] transition-colors cursor-pointer"
            >
              Retry Connection
            </button>
          </div>
        </div>
      );
    }

    if (!summary || !graphs) {
      return (
        <div className={`management-root ${theme} min-h-screen flex items-center justify-center p-6 w-full h-full`}>
          <div className="flex flex-col items-center gap-4">
            <div className="w-10 h-10 border-4 border-[var(--cyan)] border-t-transparent rounded-full animate-spin" />
            <p className="text-[var(--text)] text-sm font-semibold font-mono tracking-wider animate-pulse">
              INITIALIZING ANALYTICS...
            </p>
          </div>
        </div>
      );
    }

    const expandedChartConfig =
      expandedChart === 'utilization'
        ? {
            title: 'Utilization %',
            subtitle: 'Percentage of active working time vs total time.',
            content: (
              <UtilizationPercentageChart
                utilization={graphs.utilization}
                runtimeDistribution={graphs.runtime_distribution}
                showPointLabels
              />
            ),
          }
        : expandedChart === 'availability'
        ? {
            title: 'Availability Trend',
            subtitle: 'Daily availability percentage.',
            content: graphs.availability ? (
              <AvailabilityTrendChart data={graphs.availability} showPointLabels />
            ) : (
              <div className="flex items-center justify-center h-full text-zinc-500">No Data Available</div>
            ),
          }
        : expandedChart === 'thermal' && !isCncAsset
        ? {
            title: 'Heating vs Cooling Velocity',
            subtitle: 'How quickly the compressor heats and cools.',
            content: <HeatingCoolingChart data={graphs.thermal_rates} />,
          }
        : expandedChart === 'interrupts'
        ? {
            title: isCncAsset ? 'Production Cycle' : 'Interrupt Cycles',
            subtitle: isCncAsset ? 'Daily production cycle count.' : 'Equipment reliability metrics and run cycle health.',
            content: isCncAsset ? (
              <ReliabilityChart data={graphs.cycle_count || []} valueKey="cycle_count" barName="Production Cycles" showBarLabels />
            ) : (
              <ReliabilityChart data={graphs.reliability} showBarLabels />
            ),
          }
        : null;

    return (
      <ScreenFitContainer idealHeight={780} idealWidth={1280} className={`management-root ${theme}`}>
        <div className={`management-root ${theme} font-sans overflow-hidden flex flex-col w-full h-full flex-1 transition-colors duration-200`}>
          <div className="w-full max-w-[1840px] mx-auto px-2 sm:px-4 2xl:px-6 py-1.5 flex flex-col flex-1 h-full min-h-0 justify-between">
            {/* KPI Grid */}
            <div
              className={`grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 ${
                isCncAsset ? 'xl:grid-cols-6' : 'xl:grid-cols-7'
              } gap-1.5 2xl:gap-2 mb-1.5 shrink-0`}
            >
            <KPICard
              title="Availability"
              value={formatPercent(summary.availability)}
              colorTheme="emerald"
              icon={<Activity size={15} />}
            />
            <KPICard
              title="Avg Utilization"
              value={`${avgUtilization.toFixed(1)}%`}
              colorTheme="cyan"
              icon={<Zap size={15} />}
            />
            {isCncAsset ? (
              <>
                <KPICard
                  title="Arc Time"
                  value={(summary.runtime_seconds / 3600).toFixed(1) + ' h'}
                  colorTheme="emerald"
                  icon={<Power size={15} />}
                />
                <KPICard
                  title="Idle Time"
                  value={(toFiniteNumber(summary.idle_seconds) / 3600).toFixed(1) + ' h'}
                  colorTheme="amber"
                  icon={<Battery size={15} />}
                />
                <KPICard
                  title="Downtime"
                  value={(summary.downtime_seconds / 3600).toFixed(1) + ' h'}
                  colorTheme="coral"
                  icon={<Clock size={15} />}
                />
                <KPICard
                  title="Cycle Count"
                  value={toFiniteNumber(summary.cycle_count).toLocaleString()}
                  colorTheme="purple"
                  icon={<Timer size={15} />}
                />
              </>
            ) : (
              <>
                <KPICard
                  title="Downtime"
                  value={(summary.downtime_seconds / 3600).toFixed(1) + ' h'}
                  colorTheme="coral"
                  icon={<Clock size={15} />}
                />
                <KPICard
                  title="MTBF"
                  value={(summary.mtbi_seconds / 3600).toFixed(2) + ' h'}
                  colorTheme="purple"
                  icon={<Timer size={15} />}
                />
                <KPICard
                  title="MTBR"
                  value={(summary.recovery_time_seconds / 3600).toFixed(1) + ' h'}
                  colorTheme="coral"
                  icon={<ZapOff size={15} />}
                />
                <KPICard
                  title="Interruptions"
                  value={summary.trip_count.toLocaleString()}
                  colorTheme="coral"
                  icon={<AlertTriangle size={15} />}
                />
                <KPICard
                  title="Alerts"
                  value={managementAlerts.length.toLocaleString()}
                  colorTheme={managementAlerts.length > 0 ? 'coral' : 'emerald'}
                  icon={<ShieldAlert size={15} />}
                />
              </>
            )}
          </div>

          {/* Row 2: Daily Runtime Distribution Chart + Machine Header Card */}
          <div className="grid grid-cols-1 xl:grid-cols-12 gap-1.5 2xl:gap-2 mb-1.5 flex-1 min-h-0">
            <ChartCard
              title={isCncAsset ? 'Daily Running vs Idle vs Downtime' : 'Daily Runtime vs Downtime vs Utilization'}
              subtitle={
                <div className="flex items-center gap-2 mt-0.5 mb-0.5 flex-wrap">
                  <span className="inline-flex items-center px-2 py-0.2 rounded-full text-[10px] font-bold bg-[color-mix(in_srgb,var(--emerald)_20%,transparent)] text-[var(--emerald)] border border-[color-mix(in_srgb,var(--emerald)_30%,transparent)] uppercase tracking-wider">
                    {isCncAsset ? 'running' : 'load'}
                  </span>
                  <span className="inline-flex items-center px-2 py-0.2 rounded-full text-[10px] font-bold bg-[color-mix(in_srgb,var(--amber)_20%,transparent)] text-[var(--amber)] border border-[color-mix(in_srgb,var(--amber)_30%,transparent)] uppercase tracking-wider">
                    {isCncAsset ? 'idle' : 'unload'}
                  </span>
                  <span className="inline-flex items-center px-2 py-0.2 rounded-full text-[10px] font-bold bg-[color-mix(in_srgb,var(--coral)_20%,transparent)] text-[var(--coral)] border border-[color-mix(in_srgb,var(--coral)_30%,transparent)] uppercase tracking-wider">
                    downtime
                  </span>
                </div>
              }
              className="xl:col-span-7 2xl:col-span-8 flex flex-col h-full min-h-0"
              bodyClassName="min-h-0 flex-1 h-full"
            >
              <RuntimeDistributionChart
                runtimeDistribution={graphs.runtime_distribution}
                utilization={graphs.utilization}
                mode={isCncAsset ? 'cnc' : 'compressor'}
              />
            </ChartCard>

            {/* Machine Header Card - Moved to right of bar graphs, without Asset Tag, Cycle ID, or Status Indicator Dot */}
            <div className="xl:col-span-5 2xl:col-span-4 h-full min-h-0">
              <MachineHeaderCard
                compressorId={compressor}
                assetMeta={{
                  id: compressor,
                  name: compressor,
                  plant: 'Texmaco - Agarpara',
                  deviceId: compressor,
                  type: isCncAsset ? 'CNC' : 'Compressor',
                  status: 'Running',
                }}
                runState={1}
                hideAssetTag={true}
                hideCycleId={true}
                hideStatusIndicator={true}
                hideStatusDot={true}
                className="h-full"
              />
            </div>
          </div>

          {/* Row 3: Other Analytical Charts Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-4 gap-1.5 2xl:gap-2 mb-1.5 flex-1 min-h-0">
            <ChartCard
              title="Utilization %"
              subtitle="Percentage of active working time vs total time."
              className="flex flex-col h-full min-h-0"
              bodyClassName="min-h-0 flex-1 h-full"
              onClick={() => setExpandedChart('utilization')}
            >
              <UtilizationPercentageChart
                utilization={graphs.utilization}
                runtimeDistribution={graphs.runtime_distribution}
              />
            </ChartCard>

            <ChartCard
              title="Availability Trend"
              subtitle="Daily availability percentage."
              className="flex flex-col h-full min-h-0"
              bodyClassName="min-h-0 flex-1 h-full"
              onClick={() => setExpandedChart('availability')}
            >
              {graphs.availability && <AvailabilityTrendChart data={graphs.availability} />}
            </ChartCard>

            {!isCncAsset && (
              <ChartCard
                title="Heating vs Cooling Velocity"
                subtitle="How quickly the compressor heats and cools."
                className="flex flex-col h-full min-h-0"
                bodyClassName="min-h-0 flex-1 h-full"
                onClick={() => setExpandedChart('thermal')}
              >
                <HeatingCoolingChart data={graphs.thermal_rates} />
              </ChartCard>
            )}

            <ChartCard
              title={isCncAsset ? 'Production Cycle' : 'Interrupt Cycles'}
              subtitle={isCncAsset ? 'Daily production cycle count.' : 'Equipment reliability metrics and run cycle health.'}
              className="flex flex-col h-full min-h-0"
              bodyClassName="min-h-0 flex-1 h-full"
              onClick={() => setExpandedChart('interrupts')}
            >
              {isCncAsset ? (
                <ReliabilityChart data={graphs.cycle_count || []} valueKey="cycle_count" barName="Production Cycles" />
              ) : (
                <ReliabilityChart data={graphs.reliability} />
              )}
            </ChartCard>

            {isCncAsset && (
              <ChartCard
                title={`Time Breakdown (${visualDayCount} Day${visualDayCount === 1 ? '' : 's'})`}
                subtitle="Running, idle, and downtime split."
                className="flex flex-col h-full min-h-0"
                bodyClassName="min-h-0 flex-1 h-full"
              >
                <TimeBreakdownChart summary={summary} mode="cnc" />
              </ChartCard>
            )}
          </div>

          {/* Row 4: Downtime, Alerts, Time Breakdown */}
          <div className={`grid grid-cols-1 ${isCncAsset ? 'lg:grid-cols-2' : 'lg:grid-cols-3'} gap-1.5 2xl:gap-2 flex-1 min-h-0`}>
            <ChartCard
              title="Worst 5 Days by Downtime"
              subtitle="Highest daily downtime during the selected period."
              className="flex flex-col h-full min-h-0"
              bodyClassName="min-h-0 flex-1 h-full"
            >
              <WorstDowntimeDaysChart data={graphs.runtime_distribution} />
            </ChartCard>

            <ActiveAlertsCard summary={summary} thermalRates={graphs.thermal_rates} isCnc={isCncAsset} />

            {!isCncAsset && (
              <ChartCard
                title={`Time Breakdown (${visualDayCount} Day${visualDayCount === 1 ? '' : 's'})`}
                subtitle="Load, unload, and unplanned downtime split."
                className="flex flex-col h-full min-h-0"
                bodyClassName="min-h-0 flex-1 h-full"
              >
                <TimeBreakdownChart summary={summary} mode="compressor" />
              </ChartCard>
            )}
          </div>
        </div>

        {/* Intuitive AI Report Modal */}
        {isReportModalOpen && (
          <ReportModal
            compressor={compressor}
            onClose={onCloseReportModal}
          />
        )}

        {/* Expanded Chart Modal */}
        {expandedChartConfig && (
          <ExpandedChartModal
            title={expandedChartConfig.title}
            subtitle={expandedChartConfig.subtitle}
            onClose={() => setExpandedChart(null)}
          >
            {expandedChartConfig.content}
          </ExpandedChartModal>
        )}

        {/* Asset Equipment Full Image Modal */}
        {showImageModal && ASSET_IMAGE_MAP[compressor] && (
          <div
            className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-black/80 backdrop-blur-md animate-in fade-in duration-200"
            onClick={() => setShowImageModal(false)}
          >
            <div
              className="bg-[var(--panel)] border border-[var(--line)] rounded-2xl max-w-2xl w-full overflow-hidden shadow-2xl p-5 flex flex-col gap-4 animate-in zoom-in-95 duration-200"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-bold text-[17px] text-[var(--text)] m-0">{compressor} Equipment View</h3>
                  <p className="text-[12px] text-[var(--muted)] m-0 mt-0.5">
                    {isCncAsset ? 'Duce Pack Cutter' : 'Air Compressor'} · Plant ID: {PLANT_ID_MAP[compressor] || 'N/A'}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setShowImageModal(false)}
                  className="p-1 rounded-md text-[var(--muted)] hover:text-[var(--text)] hover:bg-[var(--chip)] transition-colors cursor-pointer"
                >
                  <X size={18} />
                </button>
              </div>
              <div className="flex-1 min-h-[300px] flex items-center justify-center bg-[var(--panel2)] rounded-xl border border-[var(--line)] p-4 overflow-hidden">
                <img
                  src={ASSET_IMAGE_MAP[compressor]}
                  alt={compressor}
                  className="max-w-full max-h-[60vh] object-contain rounded-lg shadow-lg"
                />
              </div>
            </div>
          </div>
        )}
        </div>
      </ScreenFitContainer>
    );
  }
);
