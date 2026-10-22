import React, { useEffect, useState, useMemo } from 'react';
import { fetchDashboardData } from './api';
import { DashboardData } from './types';
import { KPICard } from './components/KPICard';
import { ChartCard } from './components/ChartCard';
import { ExpandedChartModal } from './components/ExpandedChartModal';
import { ReportModal } from './components/ReportModal';
import { formatSecondsToHoursMinutes, formatNumber, formatPercent } from './utils';
import { format, subDays } from 'date-fns';

import {
  Activity,
  Power,
  Clock,
  Thermometer,
  Zap,
  AlertTriangle,
  Timer,
  ShieldAlert,
  Battery,
  BatteryCharging,
  ZapOff,
  Sun,
  Moon,
  Bot,
  LogOut,
  Maximize2,
  X
} from 'lucide-react';

import cmp01Img from './assets/CMP01.jpeg';
import cmp02Img from './assets/CMP02.jpeg';
import cnc01Img from './assets/CNC01.jpeg';
import robo01Img from '../../assets/weldwise-robotic-cell.jpg';

import { CurrentAveragePeakChart } from './components/charts/CurrentAveragePeakChart';
import { CurrentMedianP95Chart } from './components/charts/CurrentMedianP95Chart';
import { ThermalAnalysisChart } from './components/charts/ThermalAnalysisChart';
import { HeatingCoolingChart } from './components/charts/HeatingCoolingChart';
import { RuntimeUtilizationChart } from './components/charts/RuntimeUtilizationChart';
import { SustainedIdleChart } from './components/charts/SustainedIdleChart';
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
  isCncOrRobo: boolean,
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
    runtime_seconds: runtimeSeconds > 0 ? runtimeSeconds : summary.runtime_seconds,
    downtime_seconds: downtimeSeconds > 0 ? downtimeSeconds : summary.downtime_seconds,
    offline_seconds: offlineSeconds,
  };

  if (isCncOrRobo) {
    const cycleRows = filterByVisualDates(graphs.cycle_count, visualDates);

    return {
      ...visualSummary,
      idle_seconds: idleSeconds > 0 ? idleSeconds : summary.idle_seconds,
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
  isCncOrRobo: boolean,
  visualDates: Set<string>
): number => {
  if (isCncOrRobo) {
    return toFiniteNumber(summary.avg_utilization);
  }

  const utilizationList = filterByVisualDates(graphs.utilization, visualDates);
  const runtimeDistList = filterByVisualDates(graphs.runtime_distribution, visualDates);
  const runtimeMap = new Map(runtimeDistList.map(r => [r.date, r.runtime]));
  const utilizationPercentages = utilizationList.map(item => {
    const runtime = runtimeMap.get(item.date) ?? (item.loaded + item.unloaded + item.idle);
    const percentage = runtime > 0 ? (item.loaded / runtime) * 100 : 0;
    return percentage > 100 ? 100 : percentage;
  });

  return utilizationPercentages.length > 0
    ? utilizationPercentages.reduce((acc, val) => acc + val, 0) / utilizationPercentages.length
    : (summary.runtime_seconds > 0 && summary.loaded_runtime_seconds > 0
      ? (summary.loaded_runtime_seconds / summary.runtime_seconds) * 100
      : 0);
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

export default function App() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [theme, setTheme] = useState('light');
  const [showReportModal, setShowReportModal] = useState(false);
  const [showImageModal, setShowImageModal] = useState(false);
  const [expandedChart, setExpandedChart] = useState<ExpandedChartKey | null>(null);
  const [isLoggedIn, setIsLoggedIn] = useState(() => {
    return localStorage.getItem('isLoggedIn') === 'true';
  });

  const [compressor, setCompressor] = useState('CMP#01');
  const [preset, setPreset] = useState('30d');
  const [startDate, setStartDate] = useState(format(subDays(new Date(), 30), 'yyyy-MM-dd'));
  const [endDate, setEndDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const isRoboAsset = compressor === ROBO_ASSET_LABEL || compressor.includes('ROBO');
  const isCncAsset = compressor === CNC_ASSET_LABEL || compressor.includes('CNC');
  const isCncOrRobo = isCncAsset || isRoboAsset;
  const requestCompressor = isRoboAsset
    ? ROBO_API_COMPRESSOR
    : isCncAsset
    ? CNC_API_COMPRESSOR
    : compressor;

  useEffect(() => {
    if (theme === 'light') {
      document.documentElement.classList.add('light');
    } else {
      document.documentElement.classList.remove('light');
    }
  }, [theme]);

  useEffect(() => {
    setLoading(true);
    setError(null);

    const fetchData = (forceRefresh = false) => {
      fetchDashboardData(requestCompressor, startDate, endDate, forceRefresh).then((res) => {
        setData(res);
        setLoading(false);
      }).catch(err => {
        console.error(err);
        setError('Failed to load telemetry data. Please try again.');
        setLoading(false);
      });
    };

    fetchData();
    const interval = setInterval(() => fetchData(true), 15 * 60 * 1000);
    return () => clearInterval(interval);
  }, [requestCompressor, startDate, endDate]);

  const handlePresetChange = (newPreset: string) => {
    setPreset(newPreset);
    const today = new Date();
    setEndDate(format(today, 'yyyy-MM-dd'));
    if (newPreset === '7d') {
      setStartDate(format(subDays(today, 7), 'yyyy-MM-dd'));
    } else if (newPreset === '30d') {
      setStartDate(format(subDays(today, 30), 'yyyy-MM-dd'));
    }
  };

  const [loginError, setLoginError] = useState(false);

  const handleCustomDateChange = (start: string, end: string) => {
    setPreset('custom');
    setStartDate(start);
    setEndDate(end);
  };

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    const form = e.target as HTMLFormElement;
    const username = (form.elements[0] as HTMLInputElement).value;
    const password = (form.elements[1] as HTMLInputElement).value;

    if (username === 'Texmaco_Management' && password === 'Texmaco_Management@123') {
      localStorage.setItem('isLoggedIn', 'true');
      setIsLoggedIn(true);
      setLoginError(false);
    } else {
      setLoginError(true);
    }
  };

  const handleLogout = () => {
    localStorage.setItem('isLoggedIn', 'false');
    setIsLoggedIn(false);
  };

  if (!isLoggedIn) {
    return (
      <div className="min-h-screen bg-[var(--bg)] flex items-center justify-center p-4">
        <div className="bg-[var(--panel)] border border-[var(--line)] rounded-2xl shadow-2xl w-full max-w-md p-8 animate-in fade-in zoom-in-95 duration-300">
          <div className="flex flex-col items-center mb-8">
            <div className="w-16 h-16 bg-[color-mix(in_srgb,var(--cyan)_15%,transparent)] rounded-full flex items-center justify-center text-[var(--cyan)] mb-4">
              <ShieldAlert size={32} />
            </div>
            <h1 className="text-2xl font-bold text-[var(--text)] mb-2">Secure Login</h1>
            <p className="text-[var(--muted)] text-center text-[14px]">
              Compressor Management Dashboard
            </p>
          </div>
          <form onSubmit={handleLogin} className="space-y-4">
            {loginError && (
              <div className="p-3 bg-[color-mix(in_srgb,var(--coral)_15%,transparent)] border border-[color-mix(in_srgb,var(--coral)_30%,transparent)] text-[var(--coral)] text-sm rounded-lg text-center font-medium">
                Invalid credentials. Try admin / admin
              </div>
            )}
            <div>
              <label className="block text-[13px] font-bold text-[var(--muted)] uppercase tracking-wider mb-2">Username</label>
              <input
                type="text"
                required
                className="w-full bg-[var(--bg)] border border-[var(--line)] rounded-lg px-4 py-3 text-[var(--text)] focus:outline-none focus:border-[var(--cyan)] transition-colors"
                placeholder="Enter username"
              />
            </div>
            <div>
              <label className="block text-[13px] font-bold text-[var(--muted)] uppercase tracking-wider mb-2">Password</label>
              <input
                type="password"
                required
                className="w-full bg-[var(--bg)] border border-[var(--line)] rounded-lg px-4 py-3 text-[var(--text)] focus:outline-none focus:border-[var(--cyan)] transition-colors"
                placeholder="Enter password"
              />
            </div>
            <button
              type="submit"
              className="w-full bg-[var(--cyan)] text-white font-bold py-3 rounded-lg mt-6 hover:bg-[color-mix(in_srgb,var(--cyan)_80%,black)] transition-colors shadow-lg"
            >
              Sign In
            </button>
          </form>
        </div>
      </div>
    );
  }

  if (loading && !data) {
    return (
      <div className="min-h-screen bg-[var(--bg)] flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="w-10 h-10 border-3 border-[var(--line)] border-t-[var(--cyan)] rounded-full animate-spin"></div>
          <div className="text-[var(--cyan)] font-mono tracking-widest text-xs uppercase">Loading Telemetry...</div>
        </div>
      </div>
    );
  }

  if (error && !data) {
    return (
      <div className="min-h-screen bg-[var(--bg)] flex items-center justify-center">
        <div className="flex flex-col items-center gap-4 text-center max-w-md p-6 bg-[var(--panel)] border border-[var(--line)] rounded-xl shadow-lg">
          <AlertTriangle size={32} className="text-[var(--coral)]" />
          <h2 className="text-[var(--text)] font-bold text-lg">Telemetry Offline</h2>
          <p className="text-[var(--muted)] text-sm">{error}</p>
          <button
            onClick={() => setCompressor(compressor)} // Trigger re-render/fetch
            className="mt-4 px-4 py-2 bg-[color-mix(in_srgb,var(--cyan)_20%,transparent)] text-[var(--cyan)] text-sm font-bold uppercase rounded hover:bg-[color-mix(in_srgb,var(--cyan)_30%,transparent)] transition-colors cursor-pointer"
          >
            Retry Connection
          </button>
        </div>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="min-h-screen bg-[var(--bg)] flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="w-10 h-10 border-3 border-[var(--line)] border-t-[var(--cyan)] rounded-full animate-spin"></div>
          <div className="text-[var(--cyan)] font-mono tracking-widest text-xs uppercase">Connecting to Telemetry Stream...</div>
        </div>
      </div>
    );
  }

  const { summary: rawSummary, graphs: rawGraphs } = data;
  const visualDateSet = getVisualDateSet(rawGraphs);
  const graphs = {
    ...rawGraphs,
    runtime_distribution: filterByVisualDates(rawGraphs.runtime_distribution, visualDateSet),
    current_analysis: filterByVisualDates(rawGraphs.current_analysis, visualDateSet),
    thermal_analysis: filterByVisualDates(rawGraphs.thermal_analysis, visualDateSet),
    thermal_rates: filterByVisualDates(rawGraphs.thermal_rates, visualDateSet),
    utilization: filterByVisualDates(rawGraphs.utilization, visualDateSet),
    reliability: filterByVisualDates(rawGraphs.reliability, visualDateSet),
    events: filterByVisualDates(rawGraphs.events, visualDateSet),
    availability: filterByVisualDates(rawGraphs.availability, visualDateSet),
    cycle_count: filterByVisualDates(rawGraphs.cycle_count, visualDateSet),
  };
  const summary = createVisualSummary(rawSummary, rawGraphs, isCncOrRobo, visualDateSet);
  const avgUtilization = getAverageUtilization(summary, graphs, isCncOrRobo, visualDateSet);
  const managementAlerts = getManagementAlerts(summary, graphs.thermal_rates, isCncOrRobo, avgUtilization);
  const visualDayCount = Math.max(visualDateSet.size, graphs.runtime_distribution.length);
  const dashboardTitle = isRoboAsset ? 'Robotic Welder Dashboard' : isCncAsset ? 'Duce Pack Cutter Dashboard' : 'Compressor Management Dashboard';

  const expandedChartConfig = expandedChart === 'utilization'
    ? {
      title: 'Utilization %',
      subtitle: 'Percentage of active working time vs total time.',
      content: <UtilizationPercentageChart utilization={graphs.utilization} runtimeDistribution={graphs.runtime_distribution} showPointLabels />
    }
    : expandedChart === 'availability'
      ? {
        title: 'Availability Trend',
        subtitle: 'Daily availability percentage.',
        content: graphs.availability
          ? <AvailabilityTrendChart data={graphs.availability} showPointLabels />
          : <div className="flex items-center justify-center h-full text-zinc-500">No Data Available</div>
      }
      : expandedChart === 'thermal' && !isCncOrRobo
        ? {
          title: 'Heating vs Cooling Velocity',
          subtitle: 'How quickly the compressor heats and cools.',
          content: <HeatingCoolingChart data={graphs.thermal_rates} />
        }
        : expandedChart === 'interrupts'
          ? {
            title: isCncOrRobo ? 'Production Cycle' : 'Interrupt Cycles',
            subtitle: isCncOrRobo ? 'Daily production cycle count.' : 'Equipment reliability metrics and run cycle health.',
            content: isCncOrRobo
              ? <ReliabilityChart data={graphs.cycle_count || []} valueKey="cycle_count" barName="Production Cycles" showBarLabels />
              : <ReliabilityChart data={graphs.reliability} showBarLabels />
          }
          : null;

  return (
    <div className="min-h-screen font-sans overflow-x-hidden flex flex-col">
      <div className="w-full max-w-[1760px] mx-auto px-4 sm:px-6 pt-3 pb-4">

        {/* Header Section */}
        <div className="mb-3 flex flex-col xl:flex-row xl:items-center justify-between gap-3">
          <div>
            <h1 className="font-bold text-[20px] m-0 mb-0.5 leading-tight tracking-tight text-[var(--text)]">
              {dashboardTitle}
              {PLANT_ID_MAP[compressor] && ` (Plant ID : ${PLANT_ID_MAP[compressor]})`}
            </h1>
            <div className="text-[11.5px] text-[var(--muted)] font-normal">
              Last updated: <span className="font-medium text-[var(--text)]">{format(new Date(), 'dd MMM yyyy, HH:mm')}</span>
            </div>
          </div>
          <div className="flex items-center gap-2.5 flex-wrap">
            {loading && (
              <div className="flex items-center gap-1.5 bg-[color-mix(in_srgb,var(--cyan)_12%,var(--panel))] border border-[color-mix(in_srgb,var(--cyan)_30%,transparent)] text-[var(--cyan)] px-2.5 py-1.5 rounded-lg text-[12px] font-semibold animate-pulse">
                <div className="w-3.5 h-3.5 border-2 border-[var(--cyan)] border-t-transparent rounded-full animate-spin" />
                <span>Loading...</span>
              </div>
            )}
            {['CMP#01', 'CMP#02'].includes(compressor) && <button
              onClick={() => setShowReportModal(true)}
              className="flex items-center gap-1.5 bg-[var(--cyan)] text-white px-3 py-1.5 rounded-lg text-[12px] font-semibold hover:bg-[color-mix(in_srgb,var(--cyan)_80%,black)] transition-colors shadow-sm"
            >
              <Bot size={15} />
              Intuitive AI
            </button>}
            <div className="flex items-center gap-1.5">
              <span className="text-[10.5px] text-[var(--muted)] font-semibold tracking-[0.5px] uppercase">Asset</span>
              <select
                value={compressor}
                onChange={(e) => setCompressor(e.target.value)}
                className="bg-[var(--panel)] border border-[var(--line)] text-[var(--text)] rounded-lg px-2.5 py-1.5 text-[12px] font-semibold outline-none cursor-pointer"
              >
                <option value="CMP#01">CMP#01</option>
                <option value="CMP#02">CMP#02</option>
                <option value={CNC_ASSET_LABEL}>{CNC_ASSET_LABEL}</option>
                <option value={ROBO_ASSET_LABEL}>{ROBO_ASSET_LABEL}</option>
              </select>
            </div>

            <div className="flex items-center gap-1 bg-[var(--panel)] border border-[var(--line)] p-1 rounded-full shadow-sm">
              <button
                onClick={() => handlePresetChange('7d')}
                className={`px-3 py-[4px] text-[11.5px] font-semibold rounded-full transition-all duration-150 ${preset === '7d' ? 'bg-[color-mix(in_srgb,var(--cyan)_16%,var(--panel))] text-[var(--text)] font-bold' : 'text-[var(--muted)] hover:text-[var(--text)]'}`}
              >
                7 Days
              </button>
              <button
                onClick={() => handlePresetChange('30d')}
                className={`px-3 py-[4px] text-[11.5px] font-semibold rounded-full transition-all duration-150 ${preset === '30d' ? 'bg-[color-mix(in_srgb,var(--cyan)_16%,var(--panel))] text-[var(--text)] font-bold' : 'text-[var(--muted)] hover:text-[var(--text)]'}`}
              >
                30 Days
              </button>
              <button
                onClick={() => handlePresetChange('custom')}
                className={`px-3 py-[4px] text-[11.5px] font-semibold rounded-full transition-all duration-150 ${preset === 'custom' ? 'bg-[color-mix(in_srgb,var(--cyan)_16%,var(--panel))] text-[var(--text)] font-bold' : 'text-[var(--muted)] hover:text-[var(--text)]'}`}
              >
                Custom
              </button>
            </div>

            {preset === 'custom' && (
              <div className="flex items-center gap-2">
                <input
                  type="date"
                  value={startDate}
                  onChange={(e) => handleCustomDateChange(e.target.value, endDate)}
                  className="bg-[var(--panel)] border border-[var(--line)] text-[var(--text)] rounded-lg px-2 py-1.5 text-[12.5px] outline-none"
                />
                <span className="text-[var(--muted)] text-[12px]">to</span>
                <input
                  type="date"
                  value={endDate}
                  onChange={(e) => handleCustomDateChange(startDate, e.target.value)}
                  className="bg-[var(--panel)] border border-[var(--line)] text-[var(--text)] rounded-lg px-2 py-1.5 text-[12.5px] outline-none"
                />
              </div>
            )}

            <button
              onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
              className="w-8 h-8 flex items-center justify-center rounded-full bg-[var(--panel)] border border-[var(--line)] text-[var(--text)] hover:bg-[var(--panel2)] transition-colors"
              title="Toggle Theme"
            >
              {theme === 'dark' ? <Sun size={16} /> : <Moon size={16} />}
            </button>
            <button
              onClick={handleLogout}
              className="w-8 h-8 flex items-center justify-center rounded-full bg-[var(--panel)] border border-[var(--line)] text-[var(--text)] hover:bg-[color-mix(in_srgb,var(--coral)_15%,var(--panel))] hover:text-[var(--coral)] hover:border-[var(--coral)] transition-colors"
              title="Logout"
            >
              <LogOut size={16} />
            </button>
          </div>
        </div>

        {/* KPI Grid */}
        <div className={`grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 ${isCncOrRobo ? 'xl:grid-cols-6' : 'xl:grid-cols-7'} gap-2.5 mb-3`}>
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
          {isCncOrRobo ? (
            <>
              <KPICard
                title={isRoboAsset ? "Arc Time" : "Runtime"}
                value={(summary.runtime_seconds / 3600).toFixed(1) + ' h'}
                colorTheme="emerald"
                icon={<Power size={15} />}
              />
              <KPICard
                title={isRoboAsset ? "Total Idle Time" : "Idle Time"}
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
                title="Interuptions"
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

        {/* Row 2: Daily Runtime Distribution Chart + Equipment Image Card */}
        <div className={`grid grid-cols-1 ${isCncOrRobo ? 'xl:grid-cols-6' : 'xl:grid-cols-7'} gap-3 mb-3`}>
          <ChartCard
            title={isCncOrRobo ? "Daily Running vs Idle vs Downtime" : "Daily Runtime vs Downtime vs Utilization"}
            subtitle={
              <div className="flex items-center gap-2 mt-2 mb-1 flex-wrap">
                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-[color-mix(in_srgb,var(--emerald)_20%,transparent)] text-[var(--emerald)] border border-[color-mix(in_srgb,var(--emerald)_30%,transparent)] uppercase tracking-wider">
                  {isCncOrRobo ? 'running' : 'load'}
                </span>
                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-[color-mix(in_srgb,var(--amber)_20%,transparent)] text-[var(--amber)] border border-[color-mix(in_srgb,var(--amber)_30%,transparent)] uppercase tracking-wider">
                  {isCncOrRobo ? 'idle' : 'unload'}
                </span>
                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-[color-mix(in_srgb,var(--coral)_20%,transparent)] text-[var(--coral)] border border-[color-mix(in_srgb,var(--coral)_30%,transparent)] uppercase tracking-wider">
                  downtime
                </span>
              </div>
            }
            className={isCncOrRobo ? "xl:col-span-4" : "xl:col-span-5"}
            bodyClassName="min-h-[185px]"
          >
            <RuntimeDistributionChart runtimeDistribution={graphs.runtime_distribution} utilization={graphs.utilization} mode={isCncOrRobo ? 'cnc' : 'compressor'} />
          </ChartCard>

          {/* Machine Photo Card - Width matching Interruptions & Alerts */}
          <div className="xl:col-span-2 bg-[var(--panel)] border border-[var(--line)] rounded-xl p-3.5 flex flex-col justify-between shadow-sm relative overflow-hidden group">
            <div className="flex items-center justify-between mb-2">
              <div>
                <h3 className="font-bold text-[13px] text-[var(--text)] tracking-tight m-0 flex items-center gap-1.5">
                  <span>{compressor}</span>
                  {PLANT_ID_MAP[compressor] && (
                    <span className="text-[11px] font-semibold text-[var(--muted)]">
                      (Plant ID: {PLANT_ID_MAP[compressor]})
                    </span>
                  )}
                </h3>
              </div>
              {ASSET_IMAGE_MAP[compressor] && (
                <button
                  type="button"
                  onClick={() => setShowImageModal(true)}
                  className="p-1 rounded-md text-[var(--muted)] hover:text-[var(--text)] hover:bg-[var(--chip)] transition-colors cursor-pointer"
                  title="Expand equipment photo"
                >
                  <Maximize2 size={13} />
                </button>
              )}
            </div>

            <div
              onClick={() => setShowImageModal(true)}
              className="flex-1 min-h-[175px] h-[185px] rounded-lg overflow-hidden border border-[var(--line)] bg-[var(--panel2)] flex items-center justify-center p-2.5 relative cursor-pointer group/img select-none"
            >
              {ASSET_IMAGE_MAP[compressor] ? (
                <>
                  <div className="w-full h-full flex items-center justify-center relative">
                    <img
                      src={ASSET_IMAGE_MAP[compressor]}
                      alt={compressor}
                      className="max-w-full max-h-full object-contain rounded-md shadow-sm group-hover/img:scale-105 transition-transform duration-300"
                    />
                  </div>
                  <div className="absolute inset-0 bg-black/40 opacity-0 group-hover/img:opacity-100 transition-opacity flex items-end justify-between p-2.5 rounded-lg">
                    <span className="text-[11px] text-white font-semibold flex items-center gap-1.5 drop-shadow">
                      <Maximize2 size={12} /> Click to expand full image
                    </span>
                  </div>
                </>
              ) : (
                <div className="w-full h-full flex items-center justify-center text-[var(--muted)] text-[12px]">
                  No Equipment Photo Available
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Row 3: Other Analytical Charts Grid */}
        <div className="flex-1 grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-4 gap-3">

          <ChartCard
            title="Utilization %"
            subtitle="Percentage of active working time vs total time."
            bodyClassName="min-h-[118px]"
            onClick={() => setExpandedChart('utilization')}
          >
            <UtilizationPercentageChart utilization={graphs.utilization} runtimeDistribution={graphs.runtime_distribution} />
          </ChartCard>

          <ChartCard
            title="Availability Trend"
            subtitle="Daily availability percentage."
            bodyClassName="min-h-[118px]"
            onClick={() => setExpandedChart('availability')}
          >
            {graphs.availability && <AvailabilityTrendChart data={graphs.availability} />}
          </ChartCard>

          {!isCncOrRobo && (
            <ChartCard
              title="Heating vs Cooling Velocity"
              subtitle="How quickly the compressor heats and cools."
              bodyClassName="min-h-[118px]"
              onClick={() => setExpandedChart('thermal')}
            >
              <HeatingCoolingChart data={graphs.thermal_rates} />
            </ChartCard>
          )}

          <ChartCard
            title={isCncOrRobo ? "Production Cycle" : "Interrupt Cycles"}
            subtitle={isCncOrRobo ? "Daily production cycle count." : "Equipment reliability metrics and run cycle health."}
            bodyClassName="min-h-[118px]"
            onClick={() => setExpandedChart('interrupts')}
          >
            {isCncOrRobo ? (
              <ReliabilityChart data={graphs.cycle_count || []} valueKey="cycle_count" barName="Production Cycles" />
            ) : (
              <ReliabilityChart data={graphs.reliability} />
            )}
          </ChartCard>

          {isCncOrRobo && (
            <ChartCard
              title={`Time Breakdown (${visualDayCount} Day${visualDayCount === 1 ? '' : 's'})`}
              subtitle="Running, idle, and downtime split."
              bodyClassName="min-h-[118px]"
            >
              <TimeBreakdownChart summary={summary} mode="cnc" />
            </ChartCard>
          )}

        </div>

        <div className={`mt-3 grid grid-cols-1 ${isCncOrRobo ? 'lg:grid-cols-2' : 'lg:grid-cols-3'} gap-3`}>
          <ChartCard
            title="Worst 5 Days by Downtime"
            subtitle="Highest daily downtime during the selected period."
            bodyClassName="min-h-[122px]"
          >
            <WorstDowntimeDaysChart data={graphs.runtime_distribution} />
          </ChartCard>
          <ActiveAlertsCard summary={summary} thermalRates={graphs.thermal_rates} isCncOrRobo={isCncOrRobo} avgUtilization={avgUtilization} />
          {!isCncOrRobo && (
            <ChartCard
              title={`Time Breakdown (${visualDayCount} Day${visualDayCount === 1 ? '' : 's'})`}
              subtitle="Load, unload, and unplanned downtime split."
              bodyClassName="min-h-[122px]"
            >
              <TimeBreakdownChart summary={summary} mode="compressor" />
            </ChartCard>
          )}
        </div>
      </div>

      {showReportModal && (
        <ReportModal
          compressor={compressor}
          onClose={() => setShowReportModal(false)}
        />
      )}

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
                <p className="text-[12px] text-[var(--muted)] m-0 mt-0.5">{dashboardTitle} · Plant ID: {PLANT_ID_MAP[compressor] || 'N/A'}</p>
              </div>
              <button
                onClick={() => setShowImageModal(false)}
                className="w-8 h-8 rounded-full flex items-center justify-center text-[var(--muted)] hover:text-[var(--text)] hover:bg-[var(--chip)] transition-colors cursor-pointer"
                title="Close"
              >
                <X size={18} />
              </button>
            </div>
            <div className="w-full max-h-[70vh] rounded-xl overflow-hidden bg-black/20 flex items-center justify-center border border-[var(--line)]">
              <img
                src={ASSET_IMAGE_MAP[compressor]}
                alt={compressor}
                className="w-full h-full max-h-[70vh] object-contain rounded-xl"
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
