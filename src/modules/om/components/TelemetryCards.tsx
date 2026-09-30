import React, { useEffect, useState, useMemo } from 'react';
import { Activity, Thermometer, Zap, Info, Waves, Maximize2 } from 'lucide-react';
import { LatestTelemetry, TrendSample, KpiMetrics, OperationalGraphDataResponse } from '../types';
import { fetchOperationalGraphData, isGraphDataMatchingAsset } from '../services/kpiService';
import { InteractiveGraph, SeriesConfig } from './InteractiveGraph';
import { WeldingCurrentTimeSeriesItem } from '../services/weldingService';

interface TelemetryCardsProps {
  latest: LatestTelemetry;
  kpis: KpiMetrics;
  trendSamples: TrendSample[];
  graphData?: OperationalGraphDataResponse | null;
  compressorId?: string;
  onOpenExpandGraphs?: (targetGraph?: 'current' | 'vibration' | 'temperature' | 'energyiq' | 'all') => void;
  isRobo?: boolean;
  weldingTimeSeries?: WeldingCurrentTimeSeriesItem[];
}

const TelemetryCardsComponent: React.FC<TelemetryCardsProps> = ({
  latest,
  kpis,
  trendSamples,
  graphData: propGraphData,
  compressorId = 'CMP#02',
  onOpenExpandGraphs,
  isRobo = false,
  weldingTimeSeries,
}) => {
  const current = latest.current;
  const temp = latest.temperature;
  const motion = latest.motioniq;
  const mfm = latest.mfm;

  const [internalGraphData, setInternalGraphData] = useState<OperationalGraphDataResponse | null>(null);

  // Clear internal graph data immediately when compressorId changes to avoid showing stale data from previous asset
  useEffect(() => {
    setInternalGraphData(null);
  }, [compressorId]);

  // Validate that active graph data strictly matches the currently selected asset
  const activeGraphData = useMemo(() => {
    if (isGraphDataMatchingAsset(propGraphData, compressorId)) {
      return propGraphData;
    }
    if (isGraphDataMatchingAsset(internalGraphData, compressorId)) {
      return internalGraphData;
    }
    return null;
  }, [propGraphData, internalGraphData, compressorId]);

  const isCmp01 =
    compressorId === 'CMP#01' ||
    compressorId === 'CMP01' ||
    compressorId?.toUpperCase()?.includes('CMP#01') ||
    compressorId?.toUpperCase()?.includes('CMP01');

  const isCnc01 =
    compressorId === 'CNC#01' ||
    compressorId === 'CNC01' ||
    compressorId?.toUpperCase()?.includes('CNC#01') ||
    compressorId?.toUpperCase()?.includes('CNC01') ||
    compressorId?.includes('TXMCNCI');

  const isRobo01 =
    Boolean(isRobo) ||
    compressorId === 'ROBO#01' ||
    compressorId === 'ROBO01' ||
    compressorId?.toUpperCase()?.includes('ROBO') ||
    compressorId?.includes('TXMMIGI');

  const isHideGraphs = false;
  // CNC#01 and Robo Welder have no vibration, temperature, or MFM telemetry, but show full width Current live trend!
  const isZeroTelemetry = isCnc01 || isRobo01;

  // Fetch /operational_graphdata if not provided or when compressor changes (never for Robo Welder)
  useEffect(() => {
    if (isRobo01 || isGraphDataMatchingAsset(propGraphData, compressorId)) {
      return;
    }

    let isMounted = true;
    fetchOperationalGraphData(compressorId).then((res) => {
      if (isMounted && res && isGraphDataMatchingAsset(res, compressorId)) {
        setInternalGraphData(res);
      }
    });

    return () => {
      isMounted = false;
    };
  }, [propGraphData, compressorId, isRobo01]);

  const roboLatestCurrent = useMemo(() => {
    if (weldingTimeSeries && weldingTimeSeries.length > 0) {
      return weldingTimeSeries[weldingTimeSeries.length - 1]?.peak_current_a ?? 21.87;
    }
    return 21.87;
  }, [weldingTimeSeries]);

  // For CNC#01, get latest values from API graph data if available, or from KPI latest.current
  const cnc01LatestCurrent = useMemo(() => {
    if (activeGraphData?.graphs?.current?.series && activeGraphData.graphs.current.series.length > 0) {
      const s = activeGraphData.graphs.current.series;
      return s[s.length - 1]?.value ?? 0;
    }
    return current.rms_a ?? 0;
  }, [activeGraphData?.graphs?.current?.series, current.rms_a]);

  // For CMP#01, get latest values from API graph data if available
  const cmp01LatestCurrent = useMemo(() => {
    if (activeGraphData?.graphs?.current?.series && activeGraphData.graphs.current.series.length > 0) {
      const s = activeGraphData.graphs.current.series;
      return s[s.length - 1]?.value ?? 0;
    }
    return current.rms_a ?? 0;
  }, [activeGraphData?.graphs?.current?.series, current.rms_a]);

  const cmp01LatestVibRms = useMemo(() => {
    if (Array.isArray(activeGraphData?.graphs?.vibration?.series) && activeGraphData.graphs.vibration.series.length > 0) {
      const s = activeGraphData.graphs.vibration.series;
      return s[s.length - 1]?.value ?? 0;
    }
    return motion.axis_x_rms_g ?? 0;
  }, [activeGraphData?.graphs?.vibration?.series, motion.axis_x_rms_g]);

  const cmp01LatestTemp = useMemo(() => {
    if (Array.isArray(activeGraphData?.graphs?.temperature?.series) && activeGraphData.graphs.temperature.series.length > 0) {
      const s = activeGraphData.graphs.temperature.series;
      return s[s.length - 1]?.value ?? 0;
    }
    return temp.instant_rate_c_per_min ?? 0;
  }, [activeGraphData?.graphs?.temperature?.series, temp.instant_rate_c_per_min]);

  // The load percent in the Current KPI is (rms_current/280) * 100
  const currentRms = isCnc01 ? cnc01LatestCurrent : isCmp01 ? cmp01LatestCurrent : (current.rms_a ?? 0);
  const currentLoadPct = (currentRms / 280) * 100;

  const vibX = isZeroTelemetry ? 0 : (motion.axis_x_rms_g ?? 0);
  const vibY = isZeroTelemetry ? 0 : (motion.axis_y_rms_g ?? 0);
  const vibZ = isZeroTelemetry ? 0 : (motion.axis_z_rms_g ?? 0);
  const xKurt = isZeroTelemetry ? 0 : (motion.axis_x_kurtosis ?? 0);
  const yKurt = isZeroTelemetry ? 0 : (motion.axis_y_kurtosis ?? 0);
  const zKurt = isZeroTelemetry ? 0 : (motion.axis_z_kurtosis ?? 0);
  const xCrest = isZeroTelemetry ? 0 : (motion.axis_x_crest ?? 0);
  const yCrest = isZeroTelemetry ? 0 : (motion.axis_y_crest ?? 0);
  const zCrest = isZeroTelemetry ? 0 : (motion.axis_z_crest ?? 0);

  const sustainedRise = isZeroTelemetry ? 0 : (temp.sustained_rise_min ?? 0);
  const riseIncidents = isZeroTelemetry ? 0 : (temp.rise_incidents ?? 0);
  const instantRate = isZeroTelemetry ? 0 : (temp.instant_rate_c_per_min ?? 0);
  const coolingRate = isZeroTelemetry ? 0 : (temp.cooling_rate_c_per_min ?? 0);
  const coolingPhase = isZeroTelemetry ? 0 : (temp.cooling_phase ?? 0);
  const stressHours = isZeroTelemetry ? 0 : (temp.stress_hours ?? 0);

  const mfmV1n = isZeroTelemetry ? 0 : (mfm.v1n ?? 0);
  const mfmV2n = isZeroTelemetry ? 0 : (mfm.v2n ?? 0);
  const mfmV3n = isZeroTelemetry ? 0 : (mfm.v3n ?? 0);
  const mfmAvgV = isZeroTelemetry ? 0 : (mfm.avg_v ?? 0);
  const mfmI1 = isZeroTelemetry ? 0 : (mfm.i1 ?? 0);
  const mfmI2 = isZeroTelemetry ? 0 : (mfm.i2 ?? 0);
  const mfmI3 = isZeroTelemetry ? 0 : (mfm.i3 ?? 0);
  const mfmPower = isZeroTelemetry ? 0 : (mfm.power_kw ?? 0);
  const mfmPf = isZeroTelemetry ? 0 : (mfm.pf ?? 0);
  const mfmFreq = isZeroTelemetry ? 0 : (mfm.freq_hz ?? 0);
  const mfmEnergy = isZeroTelemetry ? 0 : (mfm.energy_kwh ?? 0);
  const mfmVImbalance = isZeroTelemetry ? 0 : (mfm.v_imbalance_pct ?? 0);

  // Prepare series for Current Graph
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
          color: '#059669',
          unit: 'A',
          areaColor: 'rgba(5, 150, 105, 0.22)',
        },
      ];
    }

    if (isCnc01) {
      const cncSeries = activeGraphData?.graphs?.current?.series || [];
      return [
        {
          name: activeGraphData?.graphs?.current?.label || 'Average Current Live Trend',
          data: cncSeries,
          color: '#059669',
          unit: activeGraphData?.graphs?.current?.unit || 'A',
          areaColor: 'rgba(5, 150, 105, 0.22)',
        },
      ];
    }

    return [
      {
        name: activeGraphData?.graphs?.current?.label || 'RMS Current Live Trend',
        data: activeGraphData?.graphs?.current?.series || [],
        color: '#059669',
        unit: activeGraphData?.graphs?.current?.unit || 'A',
        areaColor: 'rgba(5, 150, 105, 0.22)',
      },
    ];
  }, [isRobo01, isCnc01, weldingTimeSeries, activeGraphData?.graphs?.current?.series, activeGraphData?.graphs?.current?.label, activeGraphData?.graphs?.current?.unit]);

  // Prepare series for Vibration Graph
  const vibSeries: SeriesConfig[] = useMemo(() => {
    if (isZeroTelemetry) return [];

    // Compressor 1: single acceleration RMS series (array)
    if (Array.isArray(activeGraphData?.graphs?.vibration?.series)) {
      return [
        {
          name: activeGraphData?.graphs?.vibration?.label || 'Vibration Live Trend',
          data: activeGraphData.graphs.vibration.series || [],
          color: '#2563eb',
          unit: activeGraphData?.graphs?.vibration?.unit || 'g',
          areaColor: 'rgba(37, 99, 235, 0.18)',
        },
      ];
    }

    // Compressor 2: 3-Axis (X, Y, Z) intact
    const vib3Axis = activeGraphData?.graphs?.vibration?.series as { x?: any[]; y?: any[]; z?: any[] } | undefined;
    return [
      {
        name: 'X Axis',
        data: vib3Axis?.x || [],
        color: '#2563eb',
        unit: activeGraphData?.graphs?.vibration?.unit || 'g',
      },
      {
        name: 'Y Axis',
        data: vib3Axis?.y || [],
        color: '#f59e0b',
        unit: activeGraphData?.graphs?.vibration?.unit || 'g',
      },
      {
        name: 'Z Axis',
        data: vib3Axis?.z || [],
        color: '#10b981',
        unit: activeGraphData?.graphs?.vibration?.unit || 'g',
      },
    ];
  }, [isZeroTelemetry, activeGraphData?.graphs?.vibration?.series, activeGraphData?.graphs?.vibration?.label, activeGraphData?.graphs?.vibration?.unit]);

  // Prepare series for Temperature Graph
  const tempSeries: SeriesConfig[] = useMemo(() => {
    if (isZeroTelemetry) return [];

    // Compressor 1: Temperature Live Trend in °C
    if (isCmp01 && Array.isArray(activeGraphData?.graphs?.temperature?.series)) {
      return [
        {
          name: activeGraphData?.graphs?.temperature?.label || 'Temperature Live Trend',
          data: activeGraphData.graphs.temperature.series || [],
          color: '#e11d48',
          unit: activeGraphData?.graphs?.temperature?.unit || '°C',
          areaColor: 'rgba(225, 29, 72, 0.18)',
        },
      ];
    }

    // Compressor 2: Instant Rate intact
    return [
      {
        name: 'Instant Rate',
        data: (Array.isArray(activeGraphData?.graphs?.temperature?.series) ? activeGraphData.graphs.temperature.series : []) || [],
        color: '#e11d48',
        unit: activeGraphData?.graphs?.temperature?.unit || '°C/min',
        areaColor: 'rgba(225, 29, 72, 0.18)',
      },
    ];
  }, [isZeroTelemetry, isCmp01, activeGraphData?.graphs?.temperature?.series, activeGraphData?.graphs?.temperature?.label, activeGraphData?.graphs?.temperature?.unit]);

  return (
    <div className="flex flex-col gap-1">
      {/* Subsystem Telemetry Section Header with Expand All */}
      <div className="flex items-center justify-between px-1">
        <div className="flex items-center gap-2">
          <span className="text-xs sm:text-[13px] font-bold text-slate-800 tracking-tight">
            Subsystem Telemetry Overview
          </span>
        </div>
        {onOpenExpandGraphs && (
          <button
            type="button"
            onClick={() => onOpenExpandGraphs('all')}
            title="Expand All Telemetry Graphs"
            className="flex items-center gap-1 px-2 py-0.5 text-[11px] font-semibold text-slate-600 hover:text-slate-900 bg-white hover:bg-slate-100 border border-slate-200 rounded-md transition-colors cursor-pointer shadow-2xs"
          >
            <Maximize2 className="w-3 h-3 text-slate-500" />
            <span>Expand All</span>
          </button>
        )}
      </div>

      <div className={(isCnc01 || isRobo01) ? "grid grid-cols-1 w-full" : "grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-1.5 sm:gap-2 2xl:gap-2.5"}>
        {/* 1. CURRENT (I) */}
        <div className={`bg-[#ecfdf5] rounded-xl border border-emerald-200/90 p-1.5 2xl:p-2 shadow-xs flex flex-col justify-between overflow-hidden ${(isCnc01 || isRobo01) ? 'col-span-full w-full' : ''}`}>
          <div>
            {/* Card Header with individual expand button */}
            <div className="flex items-center justify-between mb-0.5 2xl:mb-1">
              <div className="flex items-center gap-1.5">
                <div className="w-5 h-5 2xl:w-5.5 2xl:h-5.5 rounded-full bg-emerald-500 text-white flex items-center justify-center shrink-0 shadow-2xs">
                  <Activity className="w-3.5 h-3.5 2xl:w-4 2xl:h-4" />
                </div>
                <div>
                  <h3 className="text-sm sm:text-[14px] 2xl:text-base font-bold text-slate-900 tracking-tight">
                    {isCnc01 || isRobo01 ? 'Average Current Live Trend' : 'Current (I)'}
                  </h3>
                </div>
              </div>
              <div className="flex items-center gap-2">
                {isRobo01 ? (
                  <div className="flex items-center gap-2.5 bg-white/80 border border-emerald-200/80 rounded-md px-2 py-0.5 text-xs font-sans shadow-2xs">
                    <div className="flex items-center gap-1">
                      <span className="text-[10px] text-slate-500 font-semibold">Latest Current:</span>
                      <span className="font-bold text-slate-900 text-xs sm:text-sm tabular-nums">
                        {roboLatestCurrent.toFixed(2)} A
                      </span>
                    </div>
                  </div>
                ) : isCnc01 ? (
                  <div className="flex items-center gap-2.5 bg-white/80 border border-emerald-200/80 rounded-md px-2 py-0.5 text-xs font-sans shadow-2xs">
                    <div className="flex items-center gap-1">
                      <span className="text-[10px] text-slate-500 font-semibold">Average Current:</span>
                      <span className="font-bold text-slate-900 text-xs sm:text-sm tabular-nums">
                        {currentRms.toFixed(2)} A
                      </span>
                    </div>
                    <div className="w-px h-3 bg-emerald-200" />
                    <div className="flex items-center gap-1">
                      <span className="text-[10px] text-slate-500 font-semibold">Load:</span>
                      <span className="font-bold text-slate-900 text-xs sm:text-sm tabular-nums">
                        {currentLoadPct.toFixed(1)} %
                      </span>
                    </div>
                  </div>
                ) : null}
                {onOpenExpandGraphs && (
                  <button
                    type="button"
                    onClick={() => onOpenExpandGraphs('current')}
                    title="Expand Current Graph"
                    className="p-1 text-emerald-600 hover:text-emerald-800 hover:bg-emerald-100/70 rounded-md transition-colors cursor-pointer border border-emerald-200/60 shadow-2xs"
                  >
                    <Maximize2 className="w-3 h-3" />
                  </button>
                )}
              </div>
            </div>

            {/* Primary stats for non-CNC compressors */}
            {!isCnc01 && !isRobo01 && (
              <div className="grid grid-cols-2 gap-1 mb-0.5">
                <div>
                  <span className="text-[9.5px] 2xl:text-[10px] text-slate-500 font-semibold block leading-none mb-0.5">
                    RMS Current
                  </span>
                  <span className="text-xs sm:text-[12.5px] 2xl:text-sm font-bold text-slate-900 font-sans tabular-nums">
                    {currentRms.toFixed(2)} A
                  </span>
                </div>
                <div>
                  <span className="text-[9.5px] 2xl:text-[10px] text-slate-500 font-semibold block leading-none mb-0.5">
                    Load
                  </span>
                  <span className="text-xs sm:text-[12.5px] 2xl:text-sm font-bold text-slate-900 font-sans tabular-nums">
                    {currentLoadPct.toFixed(1)} %
                  </span>
                </div>
              </div>
            )}
          </div>

          {/* Overview Graph - Consistent height with compressor graphs */}
          <InteractiveGraph
            id="current"
            title={isCnc01 || isRobo01 ? 'Average Current Live Trend' : 'Current (I)'}
            series={currentSeries}
            unit={activeGraphData?.graphs?.current?.unit || 'A'}
            colorTheme="emerald"
            heightClass="h-16 sm:h-18 2xl:h-20"
            compact={true}
            showSyncButton={false}
          />
        </div>

        {/* 2. VIBRATION (g) - Hidden for CNC1 and Robo Welder */}
        {!isZeroTelemetry && (
          <div className="bg-[#eff6ff] rounded-xl border border-blue-200/90 p-1.5 2xl:p-2 shadow-xs flex flex-col justify-between overflow-hidden">
            <div>
              {/* Card Header with individual expand button */}
              <div className="flex items-center justify-between mb-0.5 2xl:mb-1">
                <div className="flex items-center gap-1.5">
                  <div className="w-5 h-5 2xl:w-5.5 2xl:h-5.5 rounded-full bg-blue-600 text-white flex items-center justify-center shrink-0 shadow-2xs">
                    <Waves className="w-3.5 h-3.5 2xl:w-4 2xl:h-4" />
                  </div>
                  <h3 className="text-sm sm:text-[14.5px] 2xl:text-base font-bold text-slate-900 tracking-tight">
                    Vibration (g)
                  </h3>
                </div>
                {onOpenExpandGraphs && (
                  <button
                    type="button"
                    onClick={() => onOpenExpandGraphs('vibration')}
                    title="Expand Vibration Graph"
                    className="p-1 text-blue-600 hover:text-blue-800 hover:bg-blue-100/70 rounded-md transition-colors cursor-pointer border border-blue-200/60 shadow-2xs"
                  >
                    <Maximize2 className="w-3 h-3" />
                  </button>
                )}
              </div>

              {/* Vibration Stats */}
              {isCmp01 ? (
                <div className="mb-1">
                  <span className="text-[9.5px] 2xl:text-[10px] text-slate-500 font-semibold block leading-none mb-0.5">
                    Acceleration RMS
                  </span>
                  <span className="text-xs sm:text-[12.5px] 2xl:text-sm font-bold text-slate-900 font-sans tabular-nums">
                    {cmp01LatestVibRms.toFixed(3)} g
                  </span>
                </div>
              ) : (
                <>
                  {/* Axis RMS values */}
                  <div className="grid grid-cols-3 gap-0.5 mb-0.5">
                    <div>
                      <span className="text-[9px] 2xl:text-[9.5px] text-slate-500 font-semibold block leading-none mb-0.5">X RMS</span>
                      <span className="text-[11px] sm:text-xs 2xl:text-[13px] font-bold text-slate-900 font-sans tabular-nums">{vibX.toFixed(2)} g</span>
                    </div>
                    <div>
                      <span className="text-[9px] 2xl:text-[9.5px] text-slate-500 font-semibold block leading-none mb-0.5">Y RMS</span>
                      <span className="text-[11px] sm:text-xs 2xl:text-[13px] font-bold text-slate-900 font-sans tabular-nums">{vibY.toFixed(2)} g</span>
                    </div>
                    <div>
                      <span className="text-[9px] 2xl:text-[9.5px] text-slate-500 font-semibold block leading-none mb-0.5">Z RMS</span>
                      <span className="text-[11px] sm:text-xs 2xl:text-[13px] font-bold text-slate-900 font-sans tabular-nums">{vibZ.toFixed(2)} g</span>
                    </div>
                  </div>

                  {/* Kurtosis values */}
                  <div className="grid grid-cols-3 gap-0.5 mb-0.5">
                    <div>
                      <span className="text-[9px] 2xl:text-[9.5px] text-slate-500 font-semibold block leading-none mb-0.5">X Kurt</span>
                      <span className="text-[11px] sm:text-xs 2xl:text-[13px] font-bold text-slate-900 font-sans tabular-nums">{xKurt.toFixed(2)}</span>
                    </div>
                    <div>
                      <span className="text-[9px] 2xl:text-[9.5px] text-slate-500 font-semibold block leading-none mb-0.5">Y Kurt</span>
                      <span className="text-[11px] sm:text-xs 2xl:text-[13px] font-bold text-slate-900 font-sans tabular-nums">{yKurt.toFixed(2)}</span>
                    </div>
                    <div>
                      <span className="text-[9px] 2xl:text-[9.5px] text-slate-500 font-semibold block leading-none mb-0.5">Z Kurt</span>
                      <span className="text-[11px] sm:text-xs 2xl:text-[13px] font-bold text-slate-900 font-sans tabular-nums">{zKurt.toFixed(2)}</span>
                    </div>
                  </div>

                  {/* Crest values */}
                  <div className="grid grid-cols-3 gap-0.5 mb-0.5 2xl:mb-1">
                    <div>
                      <span className="text-[9px] 2xl:text-[9.5px] text-slate-500 font-semibold block leading-none mb-0.5">X Crest</span>
                      <span className="text-[11px] sm:text-xs 2xl:text-[13px] font-bold text-slate-900 font-sans tabular-nums">{xCrest.toFixed(2)}</span>
                    </div>
                    <div>
                      <span className="text-[9px] 2xl:text-[9.5px] text-slate-500 font-semibold block leading-none mb-0.5">Y Crest</span>
                      <span className="text-[11px] sm:text-xs 2xl:text-[13px] font-bold text-slate-900 font-sans tabular-nums">{yCrest.toFixed(2)}</span>
                    </div>
                    <div>
                      <span className="text-[9px] 2xl:text-[9.5px] text-slate-500 font-semibold block leading-none mb-0.5">Z Crest</span>
                      <span className="text-[11px] sm:text-xs 2xl:text-[13px] font-bold text-slate-900 font-sans tabular-nums">{zCrest.toFixed(2)}</span>
                    </div>
                  </div>
                </>
              )}
            </div>

            {/* Compact Overview Graph */}
            <InteractiveGraph
              id="vibration"
              title="Vibration"
              series={vibSeries}
              unit={activeGraphData?.graphs?.vibration?.unit || 'g'}
              colorTheme="blue"
              heightClass="h-10 sm:h-11 2xl:h-12"
              compact={true}
              showSyncButton={false}
            />
          </div>
        )}

        {/* 3. TEMPERATURE - Hidden for CNC1 and Robo Welder */}
        {!isZeroTelemetry && (
          <div className="bg-[#fff1f2] rounded-xl border border-rose-200/90 p-1.5 2xl:p-2 shadow-xs flex flex-col justify-between overflow-hidden">
            <div>
              {/* Card Header with individual expand button */}
              <div className="flex items-center justify-between mb-0.5 2xl:mb-1">
                <div className="flex items-center gap-1.5">
                  <div className="w-5 h-5 2xl:w-5.5 2xl:h-5.5 rounded-full bg-rose-500 text-white flex items-center justify-center shrink-0 shadow-2xs">
                    <Thermometer className="w-3.5 h-3.5 2xl:w-4 2xl:h-4" />
                  </div>
                  <h3 className="text-sm sm:text-[14px] 2xl:text-base font-bold text-slate-900 tracking-tight">
                    Temperature
                  </h3>
                </div>
                {onOpenExpandGraphs && (
                  <button
                    type="button"
                    onClick={() => onOpenExpandGraphs('temperature')}
                    title="Expand Temperature Graph"
                    className="p-1 text-rose-600 hover:text-rose-800 hover:bg-rose-100/70 rounded-md transition-colors cursor-pointer border border-rose-200/60 shadow-2xs"
                  >
                    <Maximize2 className="w-3 h-3" />
                  </button>
                )}
              </div>

              {isCmp01 ? (
                <div className="mb-1">
                  <span className="text-[9.5px] 2xl:text-[10px] text-slate-500 font-semibold block leading-none mb-0.5">
                    Temperature
                  </span>
                  <span className="text-xs sm:text-[12.5px] 2xl:text-sm font-bold text-slate-900 font-sans tabular-nums">
                    {cmp01LatestTemp.toFixed(1)} °C
                  </span>
                </div>
              ) : (
                <>
                  {/* Primary Temp Stats */}
                  <div className="grid grid-cols-3 gap-0.5 mb-0.5 font-sans">
                    <div>
                      <span className="text-[8.5px] 2xl:text-[9px] text-slate-500 font-semibold block leading-none mb-0.5">Rise Min</span>
                      <span className="text-[11px] sm:text-xs 2xl:text-[13px] font-bold text-slate-900 tabular-nums">{sustainedRise.toFixed(1)} m</span>
                    </div>
                    <div>
                      <span className="text-[8.5px] 2xl:text-[9px] text-slate-500 font-semibold block leading-none mb-0.5">Incidents</span>
                      <span className="text-[11px] sm:text-xs 2xl:text-[13px] font-bold text-slate-900 tabular-nums">{riseIncidents}</span>
                    </div>
                    <div>
                      <span className="text-[8.5px] 2xl:text-[9px] text-slate-500 font-semibold block leading-none mb-0.5">Inst. Rate</span>
                      <span className="text-[11px] sm:text-xs 2xl:text-[13px] font-bold text-slate-900 tabular-nums">{instantRate.toFixed(2)}</span>
                    </div>
                  </div>

                  {/* Secondary Temp Stats */}
                  <div className="grid grid-cols-3 gap-0.5 mb-0.5 2xl:mb-1 font-sans">
                    <div>
                      <span className="text-[8.5px] 2xl:text-[9px] text-slate-500 font-semibold block leading-none mb-0.5">Cool Rate</span>
                      <span className="text-[11px] sm:text-xs 2xl:text-[13px] font-bold text-slate-900 tabular-nums">{coolingRate.toFixed(2)}</span>
                    </div>
                    <div>
                      <span className="text-[8.5px] 2xl:text-[9px] text-slate-500 font-semibold block leading-none mb-0.5">Phase</span>
                      <span className="text-[11px] sm:text-xs 2xl:text-[13px] font-bold text-slate-900 tabular-nums">{coolingPhase}</span>
                    </div>
                    <div>
                      <span className="text-[8.5px] 2xl:text-[9px] text-slate-500 font-semibold block leading-none mb-0.5">Stress Hrs</span>
                      <span className="text-[11px] sm:text-xs 2xl:text-[13px] font-bold text-slate-900 tabular-nums">{stressHours.toFixed(1)} h</span>
                    </div>
                  </div>
                </>
              )}
            </div>

            {/* Compact Overview Graph */}
            <InteractiveGraph
              id="temperature"
              title="Temperature"
              series={tempSeries}
              unit={activeGraphData?.graphs?.temperature?.unit || (isCmp01 ? '°C' : '°C/min')}
              colorTheme="rose"
              heightClass="h-10 sm:h-11 2xl:h-12"
              compact={true}
              showSyncButton={false}
            />
          </div>
        )}

        {/* 4. ELECTRICAL (MFM384 / EnergyIQ) - Hidden for CNC1 and Robo Welder */}
        {!isZeroTelemetry && (
          <div className="bg-[#fffbeb] rounded-xl border border-amber-200/90 p-1.5 2xl:p-2 shadow-xs flex flex-col justify-between overflow-hidden">
            <div>
              {/* Card Header with individual expand button */}
              <div className="flex items-center justify-between mb-0.5 2xl:mb-1">
                <div className="flex items-center gap-1.5">
                  <div className="w-5 h-5 2xl:w-5.5 2xl:h-5.5 rounded-full bg-amber-500 text-white flex items-center justify-center shrink-0 shadow-2xs">
                    <Zap className="w-3.5 h-3.5 2xl:w-4 2xl:h-4" />
                  </div>
                  <h3 className="text-sm sm:text-[14.5px] 2xl:text-base font-bold text-slate-900 tracking-tight">
                    EnergyIQ
                  </h3>
                </div>
                {onOpenExpandGraphs && (
                  <button
                    type="button"
                    onClick={() => onOpenExpandGraphs('energyiq')}
                    title="Expand EnergyIQ Graph"
                    className="p-1 text-amber-600 hover:text-amber-800 hover:bg-amber-100/70 rounded-md transition-colors cursor-pointer border border-amber-200/60 shadow-2xs"
                  >
                    <Maximize2 className="w-3 h-3" />
                  </button>
                )}
              </div>

              {/* Voltage & Current Two-Column Row */}
              <div className="grid grid-cols-2 gap-1 mb-0.5">
                {/* Voltage (V) */}
                <div>
                  <span className="text-[9px] 2xl:text-[9.5px] text-slate-600 font-bold uppercase tracking-wider block mb-0.5 leading-none">
                    Voltage (V)
                  </span>
                  <div className="grid grid-cols-4 gap-0.5 text-center bg-white/85 rounded py-0.5 px-0.5 border border-amber-200/60 font-sans">
                    <div>
                      <span className="text-[8px] text-slate-400 font-bold block leading-none">V1</span>
                      <span className="text-[11px] 2xl:text-xs font-bold text-slate-900 tabular-nums">{mfmV1n}</span>
                    </div>
                    <div>
                      <span className="text-[8px] text-slate-400 font-bold block leading-none">V2</span>
                      <span className="text-[11px] 2xl:text-xs font-bold text-slate-900 tabular-nums">{mfmV2n}</span>
                    </div>
                    <div>
                      <span className="text-[8px] text-slate-400 font-bold block leading-none">V3</span>
                      <span className="text-[11px] 2xl:text-xs font-bold text-slate-900 tabular-nums">{mfmV3n}</span>
                    </div>
                    <div>
                      <span className="text-[8px] text-slate-400 font-bold block leading-none">Avg</span>
                      <span className="text-[11px] 2xl:text-xs font-bold text-slate-900 tabular-nums">{mfmAvgV}</span>
                    </div>
                  </div>
                </div>

                {/* Current (A) */}
                <div>
                  <span className="text-[9px] 2xl:text-[9.5px] text-slate-600 font-bold uppercase tracking-wider block mb-0.5 leading-none">
                    Current (A)
                  </span>
                  <div className="grid grid-cols-3 gap-0.5 text-center bg-white/85 rounded py-0.5 px-0.5 border border-amber-200/60 font-sans">
                    <div>
                      <span className="text-[8px] text-slate-400 font-bold block leading-none">I1</span>
                      <span className="text-[11px] 2xl:text-xs font-bold text-slate-900 tabular-nums">{mfmI1}</span>
                    </div>
                    <div>
                      <span className="text-[8px] text-slate-400 font-bold block leading-none">I2</span>
                      <span className="text-[11px] 2xl:text-xs font-bold text-slate-900 tabular-nums">{mfmI2}</span>
                    </div>
                    <div>
                      <span className="text-[8px] text-slate-400 font-bold block leading-none">I3</span>
                      <span className="text-[11px] 2xl:text-xs font-bold text-slate-900 tabular-nums">{mfmI3}</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Power & Energy 5-Column Single Row Strip */}
              <div className="grid grid-cols-5 gap-0.5 text-center bg-white/80 rounded py-0.5 px-0.5 border border-amber-200/60 mb-0.5 font-sans">
                <div>
                  <span className="text-[8.5px] 2xl:text-[9px] text-slate-500 font-semibold leading-none mb-0.5 block">Power</span>
                  <span className="font-bold text-slate-900 text-[11px] 2xl:text-[11.5px] tabular-nums">{mfmPower.toFixed(1)} kW</span>
                </div>
                <div>
                  <span className="text-[8.5px] 2xl:text-[9px] text-slate-500 font-semibold leading-none mb-0.5 block">PF</span>
                  <span className="font-bold text-slate-900 text-[11px] 2xl:text-[11.5px] tabular-nums">{mfmPf.toFixed(2)}</span>
                </div>
                <div>
                  <span className="text-[8.5px] 2xl:text-[9px] text-slate-500 font-semibold leading-none mb-0.5 block">Freq</span>
                  <span className="font-bold text-slate-900 text-[11px] 2xl:text-[11.5px] tabular-nums">{mfmFreq} Hz</span>
                </div>
                <div>
                  <span className="text-[8.5px] 2xl:text-[9px] text-slate-500 font-semibold leading-none mb-0.5 block">Energy</span>
                  <span className="font-bold text-slate-900 text-[11px] 2xl:text-[11.5px] tabular-nums">{mfmEnergy.toFixed(1)} kWh</span>
                </div>
                <div>
                  <span className="text-[8.5px] 2xl:text-[9px] text-slate-500 font-semibold leading-none mb-0.5 block">V Imb</span>
                  <span className="font-bold text-slate-900 text-[11px] 2xl:text-[11.5px] tabular-nums">{mfmVImbalance} %</span>
                </div>
              </div>
            </div>

            {/* Compact Overview Graph - blank graph with no data */}
            <InteractiveGraph
              id="energyiq"
              title="EnergyIQ"
              series={[]}
              unit="kW"
              colorTheme="amber"
              heightClass="h-9 sm:h-10 2xl:h-11"
              compact={true}
              showSyncButton={false}
            />
          </div>
        )}
      </div>
    </div>
  );
};

export const TelemetryCards = React.memo(TelemetryCardsComponent);
