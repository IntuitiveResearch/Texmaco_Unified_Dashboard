import { useEffect, useMemo, useRef, useState } from 'react';
import * as echarts from 'echarts';
import { Activity, Maximize2, RotateCcw, ZoomIn, ZoomOut } from 'lucide-react';
import type { WeldingCycleAnalysisItem } from './services/weldingService';

interface CurrentTrendProps {
  cycleAnalysis: WeldingCycleAnalysisItem[];
  periodLabel?: string;
  loading?: boolean;
  expanded?: boolean;
  onExpand?: () => void;
}

export function CurrentTrend({
  cycleAnalysis,
  periodLabel = 'Selected Period',
  loading = false,
  expanded = false,
  onExpand,
}: CurrentTrendProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<echarts.ECharts | null>(null);
  const zoomRef = useRef({ start: 0, end: 100 });
  const [zoomed, setZoomed] = useState(false);

  // Sort cycles chronologically by timestamp
  const sortedCycles = useMemo(() => {
    if (!cycleAnalysis || cycleAnalysis.length === 0) return [];
    return [...cycleAnalysis].sort((a, b) => {
      const timeA = new Date(a.timestamp).getTime();
      const timeB = new Date(b.timestamp).getTime();
      if (isNaN(timeA) || isNaN(timeB)) return a.cycle_number - b.cycle_number;
      return timeA - timeB;
    });
  }, [cycleAnalysis]);

  const formatTimestamp = (ts: string) => {
    try {
      const d = new Date(ts);
      if (isNaN(d.getTime())) return ts;
      const hours = String(d.getHours()).padStart(2, '0');
      const mins = String(d.getMinutes()).padStart(2, '0');
      const secs = String(d.getSeconds()).padStart(2, '0');
      const day = String(d.getDate()).padStart(2, '0');
      const month = d.toLocaleDateString('en-GB', { month: 'short' });
      return `${day} ${month} ${hours}:${mins}:${secs}`;
    } catch {
      return ts;
    }
  };

  useEffect(() => {
    if (!containerRef.current) return;
    const chart = echarts.init(containerRef.current, undefined, { renderer: 'canvas' });
    chartRef.current = chart;

    const observer = new ResizeObserver(() => chart.resize());
    observer.observe(containerRef.current);

    chart.on('datazoom', () => {
      const option = chart.getOption() as { dataZoom: { start: number; end: number }[] };
      if (option?.dataZoom?.[0]) {
        const { start, end } = option.dataZoom[0];
        zoomRef.current = { start, end };
        setZoomed(start > 0 || end < 100);
      }
    });

    return () => {
      observer.disconnect();
      chart.dispose();
      chartRef.current = null;
    };
  }, []);

  useEffect(() => {
    const chart = chartRef.current;
    if (!chart) return;

    if (sortedCycles.length === 0) {
      chart.clear();
      chart.setOption({
        title: {
          show: true,
          text: loading ? 'Fetching cycle current data...' : 'No cycle analysis data for selected range',
          left: 'center',
          top: 'middle',
          textStyle: { color: '#8293a9', fontSize: 12, fontWeight: 500 },
        },
      });
      return;
    }

    zoomRef.current = { start: 0, end: 100 };
    setZoomed(false);

    const categories = sortedCycles.map((c) => formatTimestamp(c.timestamp));
    const values = sortedCycles.map((c) => c.peak_current_a);

    chart.setOption(
      {
        animation: false,
        title: { show: false },
        grid: { left: 48, right: 20, top: 18, bottom: 32 },
        tooltip: {
          trigger: 'axis',
          backgroundColor: '#061431',
          borderColor: '#1b3a72',
          padding: [8, 12],
          textStyle: { color: '#f8fafc', fontSize: 11 },
          formatter: (params: any) => {
            const p = params?.[0];
            if (!p) return '';
            const cycle = sortedCycles[p.dataIndex];
            if (!cycle) return '';
            return `
              <div style="font-weight: 700; margin-bottom: 2px; color: #93c5fd;">Cycle #${cycle.cycle_number}</div>
              <div style="color: #cbd5e1; font-size: 10px; margin-bottom: 4px;">${formatTimestamp(cycle.timestamp)}</div>
              <div>Peak Current: <b style="color: #60a5fa;">${cycle.peak_current_a.toFixed(2)} A</b></div>
              <div>Duration: <b>${cycle.duration_seconds.toFixed(1)} s</b></div>
            `;
          },
        },
        xAxis: {
          type: 'category',
          data: categories,
          axisLine: { lineStyle: { color: '#dce5ef' } },
          axisTick: { show: false },
          axisLabel: {
            color: '#728299',
            fontSize: 9.5,
            hideOverlap: true,
            formatter: (val: string) => {
              // Compact label: e.g. "29 Sep 13:56" or "13:56:17"
              const parts = val.split(' ');
              return parts.length >= 3 ? `${parts[0]} ${parts[1]}\n${parts[2]}` : val;
            },
          },
          splitLine: { show: true, lineStyle: { color: '#e9eef5', type: 'dashed' } },
        },
        yAxis: {
          type: 'value',
          min: 0,
          max: (val: { max: number }) => Math.ceil(Math.max(28, (val.max || 25) * 1.15)),
          interval: 5,
          name: 'Peak Current (A)',
          nameLocation: 'middle',
          nameGap: 34,
          nameTextStyle: { color: '#728299', fontSize: 10 },
          axisLabel: { color: '#728299', fontSize: 10 },
          splitLine: { lineStyle: { color: '#e9eef5', type: 'dashed' } },
        },
        dataZoom: [
          {
            type: 'inside',
            start: 0,
            end: 100,
            filterMode: 'none',
            zoomOnMouseWheel: 'ctrl',
            moveOnMouseWheel: false,
          },
        ],
        series: [
          {
            name: 'Peak current (A)',
            type: 'line',
            smooth: 0.25,
            showSymbol: true,
            symbol: 'circle',
            symbolSize: 6,
            clip: true,
            itemStyle: { color: '#0866ff' },
            lineStyle: { color: '#0866ff', width: 2 },
            areaStyle: {
              color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
                { offset: 0, color: 'rgba(32, 123, 255, .32)' },
                { offset: 1, color: 'rgba(32, 123, 255, .03)' },
              ]),
            },
            markLine: {
              silent: true,
              data: [{ type: 'average', name: 'Avg Peak' }],
              lineStyle: { color: '#10b981', type: 'dashed', width: 1.5 },
              label: {
                show: true,
                position: 'end',
                formatter: 'Avg: {c} A',
                color: '#10b981',
                fontSize: 10,
                fontWeight: 600,
              },
            },
            data: values,
          },
        ],
      },
      true
    );
  }, [sortedCycles, loading]);

  const changeZoom = (factor: number) => {
    const { start, end } = zoomRef.current;
    const span = Math.min(100, Math.max(5, (end - start) * factor));
    const center = (start + end) / 2;
    const nextStart = Math.max(0, Math.min(100 - span, center - span / 2));
    chartRef.current?.dispatchAction({ type: 'dataZoom', start: nextStart, end: nextStart + span });
  };

  return (
    <section className={`ww-panel ww-trend ${expanded ? 'ww-trend-expanded' : ''}`} aria-label="AC input peak current trend">
      <div className="ww-panel-heading">
        <h2>
          <span className="ww-heading-icon">
            <Activity size={15} />
          </span>
          AC Input Current (L1) - Peak Current{' '}
          <span className="ww-title-secondary">Live Trend ({sortedCycles.length} Cycles · {periodLabel})</span>
        </h2>
        <div className="ww-chart-tools">
          <button type="button" aria-label="Zoom in on current trend" title="Zoom in" onClick={() => changeZoom(0.65)}>
            <ZoomIn size={15} />
          </button>
          <button type="button" aria-label="Zoom out on current trend" title="Zoom out" onClick={() => changeZoom(1.5)} disabled={!zoomed}>
            <ZoomOut size={15} />
          </button>
          <button
            type="button"
            aria-label="Reset current trend zoom"
            title="Reset zoom"
            onClick={() => chartRef.current?.dispatchAction({ type: 'dataZoom', start: 0, end: 100 })}
          >
            <RotateCcw size={14} />
          </button>
          {onExpand && (
            <button type="button" aria-label="Expand current trend" title="Expand chart" onClick={onExpand}>
              <Maximize2 size={14} />
            </button>
          )}
        </div>
      </div>
      <div className="ww-chart-legend">
        <span>
          <i className="ww-legend-current" />
          Peak Current (A)
        </span>
        <span>
          <i style={{ background: '#10b981', width: 10, height: 2, display: 'inline-block' }} />
          Average Peak Current
        </span>
      </div>
      <div
        ref={containerRef}
        className="ww-chart-canvas"
        role="img"
        aria-label={`Cycle peak current waveform for ${periodLabel} across ${sortedCycles.length} cycles`}
      />
    </section>
  );
}
