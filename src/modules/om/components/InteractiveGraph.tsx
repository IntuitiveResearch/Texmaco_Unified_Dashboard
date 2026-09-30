import React, { useEffect, useRef, useState, useCallback } from 'react';
import * as echarts from 'echarts';
import { ZoomIn, ZoomOut, RotateCcw, Link2 } from 'lucide-react';
import { GraphDataPoint } from '../types';

export interface SeriesConfig {
  name: string;
  data: GraphDataPoint[];
  color: string;
  unit?: string;
  areaColor?: string;
}

interface InteractiveGraphProps {
  id: string;
  title: string;
  series: SeriesConfig[];
  unit: string;
  heightClass?: string;
  colorTheme?: 'emerald' | 'blue' | 'rose' | 'amber';
  // Sync Zoom & Pan support
  isSyncActive?: boolean;
  onToggleSync?: () => void;
  showSyncButton?: boolean;
  groupName?: string;
  compact?: boolean;
}

export const InteractiveGraph: React.FC<InteractiveGraphProps> = ({
  id,
  title,
  series,
  unit,
  heightClass = 'h-22 sm:h-24 2xl:h-28',
  colorTheme = 'blue',
  isSyncActive = true,
  onToggleSync,
  showSyncButton = false,
  groupName = 'telemetryGroup',
  compact = false,
}) => {
  const chartRef = useRef<HTMLDivElement>(null);
  const chartInstance = useRef<echarts.ECharts | null>(null);
  const [zoomLevel, setZoomLevel] = useState<number>(100);
  const [isZoomed, setIsZoomed] = useState<boolean>(false);
  const [isDark, setIsDark] = useState<boolean>(() =>
    typeof document !== 'undefined' ? document.documentElement.classList.contains('dark') : false
  );

  useEffect(() => {
    const checkDark = () => {
      setIsDark(document.documentElement.classList.contains('dark'));
    };
    const observer = new MutationObserver(checkDark);
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] });
    return () => observer.disconnect();
  }, []);

  // Persistent reference to current user zoom position across re-renders & polling
  const zoomStateRef = useRef<{ start: number; end: number }>({ start: 0, end: 100 });
  const prevDataSignatureRef = useRef<string>('');

  // Stable reference to handleResetZoom to avoid re-initializing chart
  const handleResetZoomRef = useRef<() => void>(() => {});

  // Reset Zoom handler
  const handleResetZoom = useCallback(() => {
    zoomStateRef.current = { start: 0, end: 100 };
    setZoomLevel(100);
    setIsZoomed(false);

    if (chartInstance.current) {
      chartInstance.current.dispatchAction({
        type: 'dataZoom',
        start: 0,
        end: 100,
      });
    }
  }, []);
  handleResetZoomRef.current = handleResetZoom;

  // Zoom In button handler
  const handleZoomIn = useCallback(() => {
    if (!chartInstance.current) return;
    const currentZoom = zoomStateRef.current;
    const currentSpan = currentZoom.end - currentZoom.start;
    if (currentSpan <= 5) return;

    const zoomStep = Math.max(8, currentSpan * 0.25);
    const center = (currentZoom.start + currentZoom.end) / 2;
    const newSpan = Math.max(5, currentSpan - zoomStep);
    const start = Math.max(0, center - newSpan / 2);
    const end = Math.min(100, center + newSpan / 2);

    zoomStateRef.current = { start, end };
    setZoomLevel(Math.round(end - start));
    setIsZoomed(start > 0.5 || end < 99.5);

    chartInstance.current.dispatchAction({
      type: 'dataZoom',
      start,
      end,
    });
  }, []);

  // Zoom Out button handler
  const handleZoomOut = useCallback(() => {
    if (!chartInstance.current) return;
    const currentZoom = zoomStateRef.current;
    const currentSpan = currentZoom.end - currentZoom.start;
    if (currentSpan >= 100) return;

    const zoomStep = Math.max(8, currentSpan * 0.25);
    const center = (currentZoom.start + currentZoom.end) / 2;
    const newSpan = Math.min(100, currentSpan + zoomStep);
    let start = Math.max(0, center - newSpan / 2);
    let end = Math.min(100, center + newSpan / 2);

    if (end - start < newSpan) {
      if (start === 0) end = Math.min(100, start + newSpan);
      else if (end === 100) start = Math.max(0, end - newSpan);
    }

    zoomStateRef.current = { start, end };
    setZoomLevel(Math.round(end - start));
    setIsZoomed(start > 0.5 || end < 99.5);

    chartInstance.current.dispatchAction({
      type: 'dataZoom',
      start,
      end,
    });
  }, []);

  // Connect/disconnect ECharts group for cross-chart zoom/pan/crosshair synchronization
  useEffect(() => {
    if (!chartInstance.current) return;
    if (isSyncActive) {
      chartInstance.current.group = 'telemetryGroup';
      echarts.connect('telemetryGroup');
    } else {
      chartInstance.current.group = '';
    }
  }, [isSyncActive]);

  // Initialize ECharts instance
  useEffect(() => {
    if (!chartRef.current) return;

    const chart = echarts.init(chartRef.current, undefined, {
      renderer: 'canvas',
    });
    chart.group = isSyncActive ? groupName : '';
    chartInstance.current = chart;

    if (isSyncActive) {
      echarts.connect(groupName);
    }

    // Track user zooming and panning events
    const handleDataZoomEvent = (params: any) => {
      let start: number | undefined;
      let end: number | undefined;

      const batchItem = params.batch?.[0] || params;
      if (typeof batchItem.start === 'number' && typeof batchItem.end === 'number') {
        start = batchItem.start;
        end = batchItem.end;
      }

      if (start === undefined || end === undefined) {
        const opt = chart.getOption() as any;
        const dz = opt?.dataZoom?.[0];
        if (dz) {
          if (typeof dz.start === 'number' && typeof dz.end === 'number') {
            start = dz.start;
            end = dz.end;
          } else if (dz.startValue !== undefined && dz.endValue !== undefined) {
            const total = opt.xAxis?.[0]?.data?.length || 1;
            if (total > 1) {
              start = (Number(dz.startValue) / (total - 1)) * 100;
              end = (Number(dz.endValue) / (total - 1)) * 100;
            }
          }
        }
      }

      if (typeof start === 'number' && typeof end === 'number' && !isNaN(start) && !isNaN(end)) {
        zoomStateRef.current = { start, end };
        const roundedSpan = Math.max(1, Math.round(end - start));
        const zoomed = start > 0.5 || end < 99.5;
        setIsZoomed(zoomed);
        setZoomLevel(roundedSpan);
      }
    };

    chart.on('datazoom', handleDataZoomEvent);

    // Double click anywhere on chart to reset zoom
    chart.on('dblclick', () => {
      handleResetZoomRef.current();
    });

    const handleResize = () => {
      chart.resize();
    };

    const resizeObserver = new ResizeObserver(() => {
      chart.resize();
    });
    resizeObserver.observe(chartRef.current);
    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
      resizeObserver.disconnect();
      chart.dispose();
      chartInstance.current = null;
    };
  }, []);

  // Update chart options when series data changes
  useEffect(() => {
    if (!chartInstance.current) return;

    // Check if any series has data
    const hasData = series.some((s) => s.data && s.data.length > 0);
    if (!hasData) {
      chartInstance.current.clear();
      chartInstance.current.setOption({
        animation: false,
        title: {
          show: true,
          text: 'No Data',
          left: 'center',
          top: 'middle',
          textStyle: {
            color: isDark ? '#64748b' : '#94a3b8',
            fontSize: 11,
            fontWeight: 600,
          },
        },
        grid: {
          top: compact ? 6 : 14,
          right: compact ? 8 : 12,
          bottom: compact ? 16 : 24,
          left: compact ? 28 : 38,
        },
        xAxis: {
          type: 'category',
          data: [],
          axisLine: { lineStyle: { color: isDark ? 'rgba(255, 255, 255, 0.15)' : '#e2e8f0' } },
          axisTick: { show: false },
          axisLabel: { show: false },
        },
        yAxis: {
          type: 'value',
          min: 0,
          max: 10,
          splitNumber: 2,
          axisLine: { show: false },
          axisTick: { show: false },
          splitLine: {
            lineStyle: {
              color: isDark ? 'rgba(255, 255, 255, 0.05)' : '#f1f5f9',
              type: 'dashed',
            },
          },
          axisLabel: {
            fontSize: 9,
            color: isDark ? '#64748b' : '#94a3b8',
          },
        },
        series: [],
      }, true);
      prevDataSignatureRef.current = `${isDark ? 'dark' : 'light'}:empty`;
      return;
    }

    // Compute data signature to avoid redrawing if data is identical
    const dataSignature = `${isDark ? 'dark' : 'light'}:` + series
      .map(
        (s) =>
          `${s.name}:${s.data.length}:${s.data[0]?.timestamp || ''}:${s.data[s.data.length - 1]?.timestamp || ''}:${s.data[s.data.length - 1]?.value || 0}`
      )
      .join('|');

    // Prepare x-axis timestamps/labels from first series with data
    const primarySeries = series.find((s) => s.data && s.data.length > 0) || series[0];
    const xLabels = primarySeries.data.map((d) => d.time || d.timestamp?.slice(11, 19) || '');

    const echartsSeries: echarts.SeriesOption[] = series.map((s) => {
      const dataValues = s.data.map((d) => Number(d.value.toFixed(3)));

      const seriesOption: echarts.SeriesOption = {
        name: s.name,
        type: 'line',
        showSymbol: s.data.length < 30,
        symbolSize: 4,
        sampling: 'lttb', // Largest-Triangle-Three-Buckets downsampling
        lineStyle: {
          width: series.length > 1 ? 1.75 : 2,
          color: s.color,
        },
        itemStyle: {
          color: s.color,
        },
        data: dataValues,
      };

      if (s.areaColor) {
        seriesOption.areaStyle = {
          color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
            { offset: 0, color: s.areaColor },
            { offset: 1, color: 'rgba(255, 255, 255, 0)' },
          ]),
        };
      }

      return seriesOption;
    });

    prevDataSignatureRef.current = dataSignature;

    // Preserve active zoom window
    const currentStart = zoomStateRef.current.start;
    const currentEnd = zoomStateRef.current.end;

    chartInstance.current.clear();

    const option: echarts.EChartsOption = {
      animation: false, // Instant rendering for high-frequency telemetry
      title: {
        show: false,
        text: '',
      },
      grid: {
        top: compact ? 6 : 14,
        right: compact ? 6 : 12,
        bottom: compact ? 14 : 20,
        left: compact ? 28 : 38,
        containLabel: false,
      },
      tooltip: {
        trigger: 'axis',
        axisPointer: {
          type: 'cross',
          lineStyle: {
            color: '#94a3b8',
            width: 1,
            type: 'dashed',
          },
          crossStyle: {
            color: '#94a3b8',
          },
        },
        backgroundColor: 'rgba(15, 23, 42, 0.92)',
        borderColor: '#334155',
        borderWidth: 1,
        padding: [6, 10],
        textStyle: {
          color: '#f8fafc',
          fontSize: 11,
          fontFamily: 'Plus Jakarta Sans, sans-serif',
        },
        formatter: (params: any) => {
          if (!Array.isArray(params) || params.length === 0) return '';
          const time = params[0].axisValueLabel || params[0].name;
          let tip = `<div style="font-weight:700;margin-bottom:3px;font-family:monospace;">${time}</div>`;
          params.forEach((item: any) => {
            const val = typeof item.value === 'number' ? item.value : (item.data ?? '--');
            const marker = item.marker || '';
            tip += `<div style="display:flex;align-items:center;justify-content:space-between;gap:8px;font-size:11px;">
              <span>${marker} ${item.seriesName}</span>
              <span style="font-weight:700;font-family:monospace;margin-left:auto;">${val} ${unit}</span>
            </div>`;
          });
          return tip;
        },
      },
      legend:
        series.length > 1
          ? {
              top: 0,
              right: 5,
              itemWidth: 10,
              itemHeight: 8,
              textStyle: {
                fontSize: 10,
                color: isDark ? '#cbd5e1' : '#475569',
                fontWeight: 'bold',
              },
            }
          : undefined,
      xAxis: {
        type: 'category',
        boundaryGap: false,
        data: xLabels,
        axisLine: {
          lineStyle: { color: isDark ? 'rgba(255, 255, 255, 0.12)' : '#cbd5e1' },
        },
        axisTick: { show: false },
        axisLabel: {
          color: isDark ? '#94a3b8' : '#64748b',
          fontSize: 9.5,
          fontFamily: 'monospace',
          showMinLabel: true,
          showMaxLabel: true,
          interval: Math.max(1, Math.floor(xLabels.length / 5)),
        },
      },
      yAxis: {
        type: 'value',
        scale: true, // auto-adjust min/max based on data range
        splitNumber: 3,
        splitLine: {
          show: true,
          lineStyle: {
            color: isDark ? 'rgba(255, 255, 255, 0.08)' : '#e2e8f0',
            type: 'dashed',
          },
        },
        axisLabel: {
          color: isDark ? '#94a3b8' : '#64748b',
          fontSize: 9.5,
          fontFamily: 'monospace',
          formatter: (v: number) => {
            if (Math.abs(v) >= 100) return v.toFixed(0);
            if (Math.abs(v) >= 1) return v.toFixed(1);
            return v.toFixed(2);
          },
        },
      },
      dataZoom: [
        {
          type: 'inside',
          xAxisIndex: [0],
          filterMode: 'filter',
          zoomOnMouseWheel: true,
          moveOnMouseMove: true,
          moveOnMouseWheel: false,
          preventDefaultMouseMove: false,
          start: isZoomed ? currentStart : 0,
          end: isZoomed ? currentEnd : 100,
        },
      ],
      series: echartsSeries,
    };

    chartInstance.current.setOption(option, true);
  }, [series, unit]);

  const totalPoints = series.reduce((acc, s) => acc + (s.data?.length || 0), 0);

  return (
    <div className="w-full flex flex-col justify-between pt-1 mt-1 border-t border-slate-200/80">
      {/* Chart Top Sub-Header with Zoom, Reset, and Sync Controls */}
      <div className="flex items-center justify-between text-xs mb-0.5 px-0.5">
        <div className="flex items-center gap-1.5">
          <span className="font-bold text-slate-800 tracking-tight text-xs sm:text-[12.5px] 2xl:text-sm">
            {title}
          </span>
          <span className="text-[10px] sm:text-[10.5px] font-mono text-slate-500 font-semibold">
            ({unit})
          </span>
          {isZoomed && (
            <span className="text-[9px] font-mono px-1.5 py-0.2 bg-blue-100 text-blue-700 rounded font-semibold animate-pulse">
              Zoom: {zoomLevel}%
            </span>
          )}
        </div>

        {/* Zoom, Pan, & Sync Toolbar */}
        <div className="flex items-center gap-1">
          <div className="flex items-center bg-white/95 dark:bg-[#1e1e1e] border border-slate-200 dark:border-white/10 rounded shadow-2xs overflow-hidden">
            {showSyncButton && onToggleSync && (
              <button
                type="button"
                onClick={onToggleSync}
                title={
                  isSyncActive
                    ? 'Sync Zoom & Pan: ACTIVE across all graphs (Click to unlink)'
                    : 'Sync Zoom & Pan: INACTIVE (Click to sync all graphs)'
                }
                aria-label="Toggle synced zoom and pan"
                className={`px-1.5 py-0.5 flex items-center gap-1 text-[9.5px] sm:text-[10px] font-bold border-r border-slate-200 dark:border-white/10 transition-all cursor-pointer ${
                  isSyncActive
                    ? 'bg-blue-600 text-white hover:bg-blue-700'
                    : 'bg-slate-50 dark:bg-[#181818] text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-white/10'
                }`}
              >
                <Link2 className={`w-3 h-3 ${isSyncActive ? 'text-white' : 'text-slate-400'}`} />
                <span>Sync {isSyncActive ? 'ON' : 'OFF'}</span>
              </button>
            )}
            <button
              onClick={handleZoomIn}
              title="Zoom In"
              aria-label="Zoom In"
              className="p-1 hover:bg-slate-100 dark:hover:bg-white/10 text-slate-700 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white transition-colors cursor-pointer"
            >
              <ZoomIn className="w-3 h-3" />
            </button>
            <button
              onClick={handleZoomOut}
              title="Zoom Out"
              aria-label="Zoom Out"
              className="p-1 hover:bg-slate-100 dark:hover:bg-white/10 text-slate-700 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white border-l border-slate-200 dark:border-white/10 transition-colors cursor-pointer"
            >
              <ZoomOut className="w-3 h-3" />
            </button>
            <button
              onClick={handleResetZoom}
              title="Reset View (or Double-Click Chart)"
              aria-label="Reset View"
              className={`p-1 hover:bg-slate-100 dark:hover:bg-white/10 text-slate-700 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white border-l border-slate-200 dark:border-white/10 transition-colors cursor-pointer ${
                isZoomed ? 'bg-amber-50 dark:bg-amber-500/20 text-amber-700 dark:text-amber-400 font-bold' : ''
              }`}
            >
              <RotateCcw className="w-3 h-3" />
            </button>
          </div>
        </div>
      </div>

      {/* Main ECharts Container */}
      <div className={`w-full ${heightClass} relative cursor-grab active:cursor-grabbing`} ref={chartRef} />
    </div>
  );
};
