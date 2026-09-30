import { useEffect, useMemo, useRef } from 'react';
import * as echarts from 'echarts';
import { format, parseISO } from 'date-fns';
import type { RoboWelderDay } from '../../roboWelderDemoData';

export type RoboChartKind = 'daily' | 'utilization' | 'availability' | 'production';
export type RoboRunState = 'Running' | 'Idle' | 'Downtime';
export const ROBO_STATE_COLORS = { Running: '#00b780', Idle: '#ff9d00', Downtime: '#fa233b' };

interface RoboWelderChartProps {
  kind: RoboChartKind;
  days: RoboWelderDay[];
  visibleStates?: Record<RoboRunState, boolean>;
  expanded?: boolean;
}

export function RoboWelderChart({ kind, days, visibleStates, expanded = false }: RoboWelderChartProps) {
  const container = useRef<HTMLDivElement>(null);
  const instance = useRef<echarts.ECharts | null>(null);
  const option = useMemo((): echarts.EChartsOption => {
    const isDaily = kind === 'daily';
    const isProduction = kind === 'production';
    const color = kind === 'availability' ? '#12af88' : '#f29521';
    const dates = days.map((day) => day.date);
    const interval = Math.max(0, Math.ceil(days.length / (expanded || isDaily ? 12 : 5)) - 1);
    const common: echarts.EChartsOption = {
      animationDuration: 250,
      aria: { enabled: true, description: `Sample robotic welding ${kind} chart over ${days.length} days.` },
      grid: { left: isProduction ? 45 : 40, right: 12, top: kind === 'availability' ? 18 : 10, bottom: 26 },
      tooltip: {
        trigger: 'axis', backgroundColor: '#071b38', borderColor: '#183a64',
        textStyle: { color: '#fff', fontSize: 11 },
        valueFormatter: (value) => `${Number(value).toLocaleString('en-IN', { maximumFractionDigits: isProduction ? 0 : 1 })}${isDaily ? ' h' : isProduction ? ' cycles' : ' %'}`,
      },
      xAxis: {
        type: 'category', data: dates, boundaryGap: isDaily || isProduction,
        axisTick: { show: false }, axisLine: { lineStyle: { color: '#e3eaf3' } },
        axisLabel: { fontSize: expanded ? 12 : 10, color: '#74859e', interval, hideOverlap: true, formatter: (value: string) => format(parseISO(value), 'MMM dd') },
      },
      yAxis: {
        type: 'value', min: 0, max: isDaily ? 24 : isProduction ? undefined : 100,
        interval: isDaily ? 6 : isProduction ? undefined : 25,
        axisLabel: { fontSize: expanded ? 12 : 10, color: '#74859e', formatter: (value: number) => isDaily ? `${value}h` : isProduction ? value.toLocaleString() : `${value}%` },
        splitLine: { lineStyle: { color: '#e7edf5', type: 'dashed' } },
      },
    };
    if (isDaily) {
      common.series = ([['Running', 'running'], ['Idle', 'idle'], ['Downtime', 'downtime']] as const)
        .filter(([name]) => visibleStates?.[name] !== false)
        .map(([name, key]) => ({
          name, type: 'bar', stack: 'time', barMaxWidth: expanded ? 30 : 24,
          data: days.map((day) => Number(day[key].toFixed(2))),
          itemStyle: { color: ROBO_STATE_COLORS[name] },
          emphasis: { focus: 'series' },
        }));
    } else if (isProduction) {
      common.series = [{ name: 'Welding cycles', type: 'bar', barMaxWidth: expanded ? 27 : 15, data: days.map((day) => day.cycles), itemStyle: { color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [{ offset: 0, color: '#9a32f2' }, { offset: 1, color: '#8730eb' }]), borderRadius: [4, 4, 0, 0] } }];
    } else {
      common.series = [{
        name: kind === 'availability' ? 'Availability' : 'Utilization', type: 'line',
        data: days.map((day) => Number((kind === 'availability' ? day.availability : day.utilization).toFixed(1))),
        showSymbol: expanded, symbolSize: 5, lineStyle: { color, width: 2.2 }, itemStyle: { color },
        areaStyle: { color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [{ offset: 0, color: kind === 'availability' ? '#12af8840' : '#f2952140' }, { offset: 1, color: kind === 'availability' ? '#12af8808' : '#f2952108' }]) },
        ...(kind === 'availability' ? { markLine: { symbol: 'none', silent: true, lineStyle: { color: '#ff4e5e', type: 'dashed', width: 1.2 }, label: { formatter: '95%', position: 'insideStartTop', color: '#ec4055', fontSize: 10 }, data: [{ yAxis: 95 }] } } : {}),
      }];
    }
    return common;
  }, [kind, days, visibleStates, expanded]);

  useEffect(() => {
    if (!container.current) return;
    const chart = echarts.init(container.current, undefined, { renderer: 'canvas' });
    instance.current = chart;
    const resize = new ResizeObserver(() => chart.resize());
    resize.observe(container.current);
    return () => { resize.disconnect(); chart.dispose(); instance.current = null; };
  }, []);
  useEffect(() => { instance.current?.setOption(option, true); }, [option]);

  return <div ref={container} className="rew-chart-canvas" role="img" aria-label={`Sample ${kind === 'daily' ? 'daily running, idle and downtime' : kind} chart for ${days.length} days`} />;
}
