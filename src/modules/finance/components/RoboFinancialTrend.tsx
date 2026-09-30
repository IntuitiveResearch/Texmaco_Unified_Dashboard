import { useEffect, useMemo, useRef } from 'react';
import * as echarts from 'echarts';
import { ROBO_COST_CATEGORIES, formatRoboLakhs, type RoboCostMode, type RoboFinanceMonth } from '../roboWelderFinanceData';

export function RoboFinancialTrend({ months, mode }: { months: RoboFinanceMonth[]; mode: RoboCostMode }) {
  const element = useRef<HTMLDivElement>(null);
  const instance = useRef<echarts.ECharts | null>(null);
  const selected = ROBO_COST_CATEGORIES.filter((category) => mode === 'total' || category.key === mode);
  const option = useMemo((): echarts.EChartsOption => ({
    animationDuration: 250,
    aria: { enabled: true, description: `Sample robotic welding costs for ${months.length} months in lakhs of rupees.` },
    grid: { left: 48, right: 6, top: 13, bottom: 27 },
    tooltip: {
      trigger: 'axis', backgroundColor: '#071b38', borderColor: '#183a64', textStyle: { color: '#fff', fontSize: 11 },
      valueFormatter: (value) => `${formatRoboLakhs(Number(value) * 100000)} Lakhs`,
    },
    xAxis: {
      type: 'category', data: months.map((month) => month.month),
      axisTick: { show: false }, axisLine: { lineStyle: { color: '#e5ebf4' } },
      axisLabel: { color: '#73859e', fontSize: 10, interval: 'auto', hideOverlap: true },
    },
    yAxis: {
      type: 'value', name: 'Cost (₹ Lakhs)', nameLocation: 'middle', nameGap: 34,
      nameTextStyle: { color: '#73859e', fontSize: 10 },
      axisLabel: { color: '#73859e', fontSize: 10 },
      splitLine: { lineStyle: { color: '#e8edf5', type: 'dashed' } },
    },
    series: ROBO_COST_CATEGORIES.filter((category) => mode === 'total' || category.key === mode).map((category) => ({
      name: category.name, type: 'bar', stack: 'cost', barMaxWidth: months.length > 6 ? 21 : 32,
      data: months.map((month) => month[category.key] / 100000),
      itemStyle: { color: category.color }, emphasis: { focus: 'series' },
    })),
  }), [months, mode]);
  useEffect(() => {
    if (!element.current) return;
    const chart = echarts.init(element.current, undefined, { renderer: 'canvas' });
    instance.current = chart;
    const resize = new ResizeObserver(() => chart.resize());
    resize.observe(element.current);
    return () => { resize.disconnect(); chart.dispose(); instance.current = null; };
  }, []);
  useEffect(() => { instance.current?.setOption(option, true); }, [option]);
  return <div className="rfin-trend-body"><div ref={element} className="rfin-trend-canvas" role="img" aria-label={`Sample ${mode} cost trend for ${months.length} months`} /><ul className="rfin-trend-legend">{[...selected].reverse().map((category) => <li key={category.key}><i style={{ background: category.color }} />{category.key === 'energy' ? 'Energy' : category.name}</li>)}</ul></div>;
}
