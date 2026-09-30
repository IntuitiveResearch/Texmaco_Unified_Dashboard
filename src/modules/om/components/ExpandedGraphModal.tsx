import React, { useEffect, useState, useMemo } from 'react';
import {
  X,
  RotateCcw,
  Activity,
  Waves,
  Thermometer,
  Zap,
  Info,
} from 'lucide-react';
import { InteractiveGraph, SeriesConfig } from './InteractiveGraph';
import { OperationalGraphDataResponse, TrendSample, OperationalKpiResponse } from '../types';
import { isGraphDataMatchingAsset } from '../services/kpiService';
import { WeldingCurrentTimeSeriesItem } from '../services/weldingService';

interface ExpandedGraphModalProps {
  isOpen: boolean;
  onClose: () => void;
  compressorId: string;
  graphData: OperationalGraphDataResponse | null;
  trendSamples: TrendSample[];
  selectedGraph?: 'all' | 'current' | 'vibration' | 'temperature' | 'energyiq';
  latest?: OperationalKpiResponse['latest'];
  weldingTimeSeries?: WeldingCurrentTimeSeriesItem[];
}

// Safe helper to extract latest numeric value from a series without throwing
const getLatestVal = (series?: SeriesConfig, fallback: string = '0.00'): string => {
  if (!series || !Array.isArray(series.data) || series.data.length === 0) return fallback;
  const last = series.data[series.data.length - 1];
  if (last && typeof last.value === 'number' && !isNaN(last.value)) {
    return last.value.toFixed(2);
  }
  return fallback;
};

export const ExpandedGraphModal: React.FC<ExpandedGraphModalProps> = ({
  isOpen,
  onClose,
  compressorId,
  graphData,
  trendSamples,
  selectedGraph = 'current',
  latest,
  weldingTimeSeries,
}) => {
  const [resetKey, setResetKey] = useState<number>(0);

  // Close on Escape key press
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  // Prevent background scroll when modal is open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen]);

  const isCnc01 =
    compressorId === 'CNC#01' ||
    compressorId === 'CNC01' ||
    compressorId?.toUpperCase()?.includes('CNC#01') ||
    compressorId?.toUpperCase()?.includes('CNC01') ||
    compressorId?.includes('TXMCNCI');

  const isRobo01 =
    compressorId === 'ROBO#01' ||
    compressorId === 'ROBO01' ||
    compressorId?.toUpperCase()?.includes('ROBO') ||
    compressorId?.includes('TXMMIGI');

  const isSingleOnly = isCnc01 || isRobo01;

  const [activeGraph, setActiveGraph] = useState<'current' | 'vibration' | 'temperature' | 'energyiq' | 'all'>(
    isSingleOnly ? 'current' : (selectedGraph || 'current')
  );

  useEffect(() => {
    if (isSingleOnly) {
      setActiveGraph('current');
    } else if (selectedGraph) {
      setActiveGraph(selectedGraph);
    }
  }, [selectedGraph, isSingleOnly]);

  // Asset identifiers
  const isCmp01 =
    compressorId === 'CMP#01' ||
    compressorId === 'CMP01' ||
    compressorId?.toUpperCase()?.includes('CMP#01') ||
    compressorId?.toUpperCase()?.includes('CMP01');

  // Asset graph validation
  const activeGraphData = useMemo(() => {
    return isGraphDataMatchingAsset(graphData, compressorId) ? graphData : null;
  }, [graphData, compressorId]);

  // Prepare Current series
  const currentSeries: SeriesConfig[] = useMemo(() => {
    if (isRobo01) {
      const roboData = (weldingTimeSeries && weldingTimeSeries.length > 0)
        ? weldingTimeSeries.map((item) => {
            const timeStr = item.timestamp.includes('T')
              ? item.timestamp.split('T')[1].slice(0, 8)
              : item.timestamp;
            return {
              timestamp: item.timestamp,
              time: timeStr,
              value: item.peak_current_a,
            };
          })
        : [];
      return [
        {
          name: 'Peak Current Live Trend',
          data: roboData,
          color: '#10b981',
          unit: 'A',
          areaColor: 'rgba(16, 185, 129, 0.18)',
        },
      ];
    }

    return [
      {
        name: activeGraphData?.graphs?.current?.label || (isCnc01 ? 'Average Current Live Trend' : 'RMS Current'),
        data: activeGraphData?.graphs?.current?.series || [],
        color: '#10b981',
        unit: activeGraphData?.graphs?.current?.unit || 'A',
        areaColor: 'rgba(16, 185, 129, 0.18)',
      },
    ];
  }, [isRobo01, isCnc01, weldingTimeSeries, activeGraphData?.graphs?.current]);

  // Prepare Vibration series
  const vibSeries: SeriesConfig[] = useMemo(() => {
    if (Array.isArray(activeGraphData?.graphs?.vibration?.series)) {
      return [
        {
          name: activeGraphData?.graphs?.vibration?.label || 'Vibration Live Trend',
          data: activeGraphData.graphs.vibration.series || [],
          color: '#3b82f6',
          unit: activeGraphData?.graphs?.vibration?.unit || 'g',
          areaColor: 'rgba(59, 130, 246, 0.18)',
        },
      ];
    }

    const vib3Axis = activeGraphData?.graphs?.vibration?.series as { x?: any[]; y?: any[]; z?: any[] } | undefined;
    return [
      {
        name: 'X Axis RMS',
        data: vib3Axis?.x || [],
        color: '#3b82f6',
        unit: activeGraphData?.graphs?.vibration?.unit || 'g',
      },
      {
        name: 'Y Axis RMS',
        data: vib3Axis?.y || [],
        color: '#f59e0b',
        unit: activeGraphData?.graphs?.vibration?.unit || 'g',
      },
      {
        name: 'Z Axis RMS',
        data: vib3Axis?.z || [],
        color: '#10b981',
        unit: activeGraphData?.graphs?.vibration?.unit || 'g',
      },
    ];
  }, [activeGraphData?.graphs?.vibration?.series, activeGraphData?.graphs?.vibration?.label, activeGraphData?.graphs?.vibration?.unit]);

  // Prepare Temperature series
  const tempSeries: SeriesConfig[] = useMemo(() => {
    if (isCmp01 && Array.isArray(activeGraphData?.graphs?.temperature?.series)) {
      return [
        {
          name: activeGraphData?.graphs?.temperature?.label || 'element one temperature: Live Trend',
          data: activeGraphData.graphs.temperature.series || [],
          color: '#ef4444',
          unit: activeGraphData?.graphs?.temperature?.unit || '°C',
          areaColor: 'rgba(239, 68, 68, 0.2)',
        },
      ];
    }

    return [
      {
        name: 'Instant Rate',
        data: (Array.isArray(activeGraphData?.graphs?.temperature?.series) ? activeGraphData.graphs.temperature.series : []) || [],
        color: '#ef4444',
        unit: activeGraphData?.graphs?.temperature?.unit || '°C/min',
        areaColor: 'rgba(239, 68, 68, 0.2)',
      },
    ];
  }, [isCmp01, activeGraphData?.graphs?.temperature?.series, activeGraphData?.graphs?.temperature?.label, activeGraphData?.graphs?.temperature?.unit]);

  const handleResetZoom = () => {
    setResetKey((k) => k + 1);
  };

  const metaMap = {
    current: {
      title: isCnc01 ? 'Average Current Live Trend - Expanded Analytics' : 'Current (I) - Expanded Analytics',
      tabTitle: isCnc01 ? 'Average Current' : 'Current (I)',
      subtitle: isCnc01
        ? 'High-resolution telemetry trend for CNC#01 Average Current'
        : 'High-resolution telemetry trend and RMS Current waveform',
      icon: Activity,
      iconBg: 'bg-emerald-500',
      bgColor: 'bg-emerald-500',
      color: 'text-white',
      badgeColor: 'text-emerald-800 bg-emerald-50 border-emerald-200',
      latestValue: `${getLatestVal(currentSeries[0])} A`,
    },
    vibration: {
      title: 'Vibration (g) - Expanded Analytics',
      tabTitle: 'Vibration (g)',
      subtitle: isCmp01
        ? 'High-resolution single acceleration RMS vibration trend'
        : 'High-resolution Tri-Axial (X, Y, Z) acceleration & vibration kinematics',
      icon: Waves,
      iconBg: 'bg-blue-600',
      bgColor: 'bg-blue-600',
      color: 'text-white',
      badgeColor: 'text-blue-800 bg-blue-50 border-blue-200',
      latestValue: `${isCmp01 ? 'RMS' : 'X'}: ${getLatestVal(vibSeries[0])} g`,
    },
    temperature: {
      title: 'Temperature - Expanded Analytics',
      tabTitle: 'Temperature',
      subtitle: isCmp01
        ? 'High-resolution thermal monitoring and temperature trend'
        : 'High-resolution thermal kinetics and temperature rate monitoring',
      icon: Thermometer,
      iconBg: 'bg-rose-500',
      bgColor: 'bg-rose-500',
      color: 'text-white',
      badgeColor: 'text-rose-800 bg-rose-50 border-rose-200',
      latestValue: `${getLatestVal(tempSeries[0])} ${isCmp01 ? '°C' : '°C/min'}`,
    },
    energyiq: {
      title: 'EnergyIQ - Expanded Analytics',
      tabTitle: 'EnergyIQ',
      subtitle: 'Electrical power quality, 3-phase voltage, current, and energy metrics',
      icon: Zap,
      iconBg: 'bg-amber-500',
      bgColor: 'bg-amber-500',
      color: 'text-white',
      badgeColor: 'text-amber-800 bg-amber-50 border-amber-200',
      latestValue: `${latest?.mfm?.power_kw?.toFixed(1) ?? '0.0'} kW`,
    },
    all: {
      title: 'All Subsystem Graphs',
      tabTitle: 'All Graphs',
      subtitle: 'Overview of all telemetry metrics (Current, Vibration, Temperature, EnergyIQ)',
      icon: Activity,
      iconBg: 'bg-purple-600',
      bgColor: 'bg-purple-600',
      color: 'text-white',
      badgeColor: 'text-purple-800 bg-purple-50 border-purple-200',
      latestValue: '',
    },
  };

  const currentMeta = metaMap[activeGraph] || metaMap.current;
  const HeaderIcon = currentMeta.icon;
  const availableTabs = isCnc01
    ? (['current'] as const)
    : (['current', 'vibration', 'temperature', 'energyiq', 'all'] as const);

  if (!isOpen) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Expanded Telemetry Graph"
      className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-2 sm:p-4 animate-in fade-in duration-200"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-2xl border border-slate-200 shadow-2xl w-full max-w-5xl h-[88vh] flex flex-col overflow-hidden animate-in zoom-in-95 duration-150"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Top Header */}
        <div className="bg-slate-50 px-4 py-2.5 border-b border-slate-200 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className={`w-8 h-8 rounded-lg ${currentMeta.bgColor} flex items-center justify-center shadow-xs shrink-0`}>
              <HeaderIcon className={`w-4 h-4 ${currentMeta.color}`} />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <h2 className="text-sm sm:text-base font-bold text-slate-900 tracking-tight leading-tight truncate">
                  {currentMeta.title}
                </h2>
                <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-slate-200 text-slate-700 font-bold shrink-0 border border-slate-300/60">
                  {compressorId}
                </span>
              </div>
              <p className="text-[11px] text-slate-500 font-medium truncate">
                {currentMeta.subtitle}
              </p>
            </div>
          </div>

          {/* Controls: Reset Zoom & Close */}
          <div className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={handleResetZoom}
              title="Reset Zoom on All Views"
              className="flex items-center gap-1 text-[11px] font-semibold text-slate-700 hover:text-slate-900 bg-white hover:bg-slate-50 border border-slate-200 px-2.5 py-1.5 rounded-lg shadow-2xs transition-colors cursor-pointer"
            >
              <RotateCcw className="w-3 h-3" />
              <span>Reset Zoom</span>
            </button>
            <button
              type="button"
              onClick={onClose}
              title="Close Modal (Esc)"
              className="p-1.5 text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer border border-slate-200 bg-white shadow-2xs"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Modal Graph Switcher Navigation Tabs */}
        <div className="px-4 py-1.5 bg-white border-b border-slate-200 flex items-center justify-between shrink-0 overflow-x-auto gap-2">
          <div className="flex items-center gap-1">
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mr-1 hidden sm:inline">
              View:
            </span>
            {availableTabs.map((gKey) => {
              const tabMeta = metaMap[gKey];
              const TabIcon = tabMeta.icon;
              const isActive = activeGraph === gKey;
              return (
                <button
                  key={gKey}
                  type="button"
                  onClick={() => setActiveGraph(gKey)}
                  className={`flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-semibold transition-all cursor-pointer ${
                    isActive
                      ? 'bg-blue-600 text-white shadow-xs'
                      : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
                  }`}
                >
                  <TabIcon className="w-3.5 h-3.5" />
                  <span>{tabMeta.tabTitle}</span>
                </button>
              );
            })}
          </div>

          <div className="text-[11px] text-slate-400 font-medium hidden md:block">
            Use mouse wheel or drag to zoom • Click Reset Zoom to restore
          </div>
        </div>

        {/* Modal Main Content Workspace */}
        <div className="flex-1 overflow-y-auto p-3 sm:p-5 bg-[#f8fafc] min-h-0">
          <div key={resetKey} className="w-full flex flex-col gap-4">
              {/* 1. CURRENT (A) */}
              {(activeGraph === 'current' || activeGraph === 'all') && (
                <div className="bg-white rounded-xl border border-emerald-200/90 p-3 sm:p-4 shadow-xs">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <div className="w-6 h-6 rounded-full bg-emerald-500 text-white flex items-center justify-center shrink-0 shadow-2xs">
                        <Activity className="w-3.5 h-3.5" />
                      </div>
                      <div>
                        <h3 className="text-sm sm:text-base font-bold text-slate-900">
                          {isCnc01 ? 'CNC#01 Average Current Live Trend' : 'Current (I) - RMS Current Live Trend'}
                        </h3>
                        <span className="text-xs text-slate-500 font-mono">
                          Unit: {graphData?.graphs?.current?.unit || 'A'} • Signal: {isCnc01 ? 'Average Current' : 'RMS Amperes'}
                        </span>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-mono font-bold text-emerald-800 bg-emerald-50 border border-emerald-200 px-2.5 py-0.5 rounded-full shadow-2xs">
                        Latest: {getLatestVal(currentSeries[0])} A
                      </span>
                    </div>
                  </div>
                  <InteractiveGraph
                    id="modal-current"
                    title={isCnc01 ? 'Average Current Live Trend' : 'RMS Current'}
                    series={currentSeries}
                    unit={activeGraphData?.graphs?.current?.unit || 'A'}
                    colorTheme="emerald"
                    heightClass={activeGraph === 'all' ? 'h-[280px] sm:h-[320px]' : 'h-[460px] sm:h-[520px] 2xl:h-[580px]'}
                    isSyncActive={false}
                    showSyncButton={false}
                  />
                </div>
              )}

              {/* 2. VIBRATION (g) */}
              {!isCnc01 && (activeGraph === 'vibration' || activeGraph === 'all') && (
                <div className="bg-white rounded-xl border border-blue-200/90 p-3 sm:p-4 shadow-xs">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <div className="w-6 h-6 rounded-full bg-blue-600 text-white flex items-center justify-center shrink-0 shadow-2xs">
                        <Waves className="w-3.5 h-3.5" />
                      </div>
                      <div>
                        <h3 className="text-sm sm:text-base font-bold text-slate-900">
                          {isCmp01 ? 'Vibration (g) - Acceleration RMS Live Trend' : 'Vibration (g) - Tri-Axial Live Trend'}
                        </h3>
                        <span className="text-xs text-slate-500 font-mono">
                          {isCmp01
                            ? `Unit: ${activeGraphData?.graphs?.vibration?.unit || 'g'} • Single-Axis RMS Telemetry`
                            : `Unit: ${activeGraphData?.graphs?.vibration?.unit || 'g'} • Channels: X, Y, Z Axis RMS`}
                        </span>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 text-xs font-mono font-semibold">
                      {isCmp01 ? (
                        <span className="text-blue-700 bg-blue-50 border border-blue-200 px-2.5 py-0.5 rounded-full font-bold shadow-2xs">
                          Acceleration RMS: {getLatestVal(vibSeries[0])} g
                        </span>
                      ) : (
                        <>
                          <span className="text-blue-700 bg-blue-50 border border-blue-200 px-2 py-0.5 rounded">
                            X: {getLatestVal(vibSeries[0])} g
                          </span>
                          <span className="text-amber-700 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded">
                            Y: {getLatestVal(vibSeries[1])} g
                          </span>
                          <span className="text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded">
                            Z: {getLatestVal(vibSeries[2])} g
                          </span>
                        </>
                      )}
                    </div>
                  </div>
                  <InteractiveGraph
                    id="modal-vibration"
                    title="Vibration"
                    series={vibSeries}
                    unit={activeGraphData?.graphs?.vibration?.unit || 'g'}
                    colorTheme="blue"
                    heightClass={activeGraph === 'all' ? 'h-[280px] sm:h-[320px]' : 'h-[460px] sm:h-[520px] 2xl:h-[580px]'}
                    isSyncActive={false}
                    showSyncButton={false}
                  />
                </div>
              )}

              {/* 3. TEMPERATURE */}
              {!isCnc01 && (activeGraph === 'temperature' || activeGraph === 'all') && (
                <div className="bg-white rounded-xl border border-rose-200/90 p-3 sm:p-4 shadow-xs">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <div className="w-6 h-6 rounded-full bg-rose-500 text-white flex items-center justify-center shrink-0 shadow-2xs">
                        <Thermometer className="w-3.5 h-3.5" />
                      </div>
                      <div>
                        <h3 className="text-sm sm:text-base font-bold text-slate-900">
                          {isCmp01 ? 'Temperature - element one temperature: Live Trend' : 'Temperature - Instant Rate Trend'}
                        </h3>
                        <span className="text-xs text-slate-500 font-mono">
                          {isCmp01
                            ? `Unit: ${activeGraphData?.graphs?.temperature?.unit || '°C'} • Thermal Monitoring`
                            : `Unit: ${activeGraphData?.graphs?.temperature?.unit || '°C/min'} • Thermal Kinetics`}
                        </span>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-mono font-bold text-rose-800 bg-rose-50 border border-rose-200 px-2.5 py-0.5 rounded-full shadow-2xs">
                        Latest: {getLatestVal(tempSeries[0])} {isCmp01 ? '°C' : '°C/min'}
                      </span>
                    </div>
                  </div>
                  <InteractiveGraph
                    id="modal-temperature"
                    title={isCmp01 ? 'Temperature' : 'Temperature Rate'}
                    series={tempSeries}
                    unit={activeGraphData?.graphs?.temperature?.unit || (isCmp01 ? '°C' : '°C/min')}
                    colorTheme="rose"
                    heightClass={activeGraph === 'all' ? 'h-[280px] sm:h-[320px]' : 'h-[460px] sm:h-[520px] 2xl:h-[580px]'}
                    isSyncActive={false}
                    showSyncButton={false}
                  />
                </div>
              )}

              {/* 4. ELECTRICAL (MFM384 / EnergyIQ) */}
              {!isCnc01 && (activeGraph === 'energyiq' || activeGraph === 'all') && (
                <div className="bg-white rounded-xl border border-amber-200/90 p-3 sm:p-4 shadow-xs">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <div className="w-6 h-6 rounded-full bg-amber-500 text-white flex items-center justify-center shrink-0 shadow-2xs">
                        <Zap className="w-3.5 h-3.5" />
                      </div>
                      <div>
                        <h3 className="text-sm sm:text-base font-bold text-slate-900">
                          EnergyIQ - Electrical Analytics (MFM384)
                        </h3>
                        <span className="text-xs text-slate-500 font-mono">
                          Unit: kW / kWh / V / A • Power Quality & Energy Monitoring
                        </span>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-mono font-bold text-amber-800 bg-amber-50 border border-amber-200 px-2.5 py-0.5 rounded-full shadow-2xs">
                        Power: {latest?.mfm?.power_kw?.toFixed(1) ?? '0.0'} kW
                      </span>
                    </div>
                  </div>

                  {/* Electrical Overview Grid */}
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mb-3">
                    <div className="bg-amber-50/70 border border-amber-200/70 rounded-lg p-2 text-center">
                      <span className="text-[10px] uppercase font-bold text-slate-500 block mb-0.5">3-Phase Voltage (V)</span>
                      <span className="text-xs font-mono font-bold text-slate-900">
                        V1: {latest?.mfm?.v1n ?? 0} | V2: {latest?.mfm?.v2n ?? 0} | V3: {latest?.mfm?.v3n ?? 0}
                      </span>
                      <span className="text-[10.5px] text-slate-500 block mt-0.5">Avg: {latest?.mfm?.avg_v ?? 0} V</span>
                    </div>
                    <div className="bg-amber-50/70 border border-amber-200/70 rounded-lg p-2 text-center">
                      <span className="text-[10px] uppercase font-bold text-slate-500 block mb-0.5">3-Phase Current (A)</span>
                      <span className="text-xs font-mono font-bold text-slate-900">
                        I1: {latest?.mfm?.i1 ?? 0} | I2: {latest?.mfm?.i2 ?? 0} | I3: {latest?.mfm?.i3 ?? 0}
                      </span>
                      <span className="text-[10.5px] text-slate-500 block mt-0.5">Imb: {latest?.mfm?.i_imbalance_pct ?? 0}%</span>
                    </div>
                    <div className="bg-amber-50/70 border border-amber-200/70 rounded-lg p-2 text-center">
                      <span className="text-[10px] uppercase font-bold text-slate-500 block mb-0.5">Power & PF</span>
                      <span className="text-xs font-mono font-bold text-slate-900">
                        {latest?.mfm?.power_kw?.toFixed(1) ?? '0.0'} kW • PF {latest?.mfm?.pf?.toFixed(2) ?? '0.00'}
                      </span>
                      <span className="text-[10.5px] text-slate-500 block mt-0.5">Freq: {latest?.mfm?.freq_hz ?? 0} Hz</span>
                    </div>
                    <div className="bg-amber-50/70 border border-amber-200/70 rounded-lg p-2 text-center">
                      <span className="text-[10px] uppercase font-bold text-slate-500 block mb-0.5">Energy & Imbalance</span>
                      <span className="text-xs font-mono font-bold text-slate-900">
                        {latest?.mfm?.energy_kwh?.toFixed(1) ?? '0.0'} kWh
                      </span>
                      <span className="text-[10.5px] text-slate-500 block mt-0.5">V Imb: {latest?.mfm?.v_imbalance_pct ?? 0}%</span>
                    </div>
                  </div>

                  <InteractiveGraph
                    id="modal-energyiq"
                    title="EnergyIQ"
                    series={[]}
                    unit="kW"
                    colorTheme="amber"
                    heightClass={activeGraph === 'all' ? 'h-[200px] sm:h-[240px]' : 'h-[360px] sm:h-[420px]'}
                    isSyncActive={false}
                    showSyncButton={false}
                  />
                </div>
              )}
            </div>
        </div>

        {/* Modal Footer */}
        <footer className="px-4 py-2.5 border-t border-slate-200 bg-white flex items-center justify-between text-xs text-slate-500 shrink-0">
          <div className="flex items-center gap-2">
            <span className="font-semibold text-slate-700">Intuitive Robotics Analytics</span>
            <span>•</span>
            <span>Esc key or click outside to close</span>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="px-3 py-1 rounded bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold transition-colors cursor-pointer border border-slate-200 shadow-2xs"
          >
            Close Viewer
          </button>
        </footer>
      </div>
    </div>
  );
};
