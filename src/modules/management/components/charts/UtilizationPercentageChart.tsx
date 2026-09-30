import React, { useMemo } from 'react';
import { 
  AreaChart, 
  Area, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  LabelList,
  Tooltip, 
  ResponsiveContainer 
} from 'recharts';
import { Utilization, RuntimeDistribution } from '../../types';
import { CustomTooltip } from './CustomTooltip';
import { formatShortDate } from '../../utils';

interface Props {
  utilization: Utilization[];
  runtimeDistribution: RuntimeDistribution[];
  showPointLabels?: boolean;
}

export function UtilizationPercentageChart({ utilization, runtimeDistribution, showPointLabels = false }: Props) {
  const chartData = useMemo(() => {
    if (!utilization || !runtimeDistribution) return [];
    
    // Create a map of runtime by date for quick lookup
    const runtimeMap = new Map(runtimeDistribution.map(r => [r.date, r.runtime]));

    return utilization.map(item => {
      if (typeof item.value === 'number') {
        return {
          date: item.date,
          percentage: Math.min(Math.max(item.value, 0), 100),
        };
      }

      const runtime = runtimeMap.get(item.date) || 0;
      const percentage = runtime > 0 ? (item.loaded / runtime) * 100 : 0;
      return {
        date: item.date,
        percentage: percentage > 100 ? 100 : percentage, // Cap at 100% just in case
      };
    });
  }, [utilization, runtimeDistribution]);

  if (!utilization || utilization.length === 0) {
    return <div className="flex items-center justify-center h-full text-zinc-500">No Data Available</div>;
  }

  return (
    <ResponsiveContainer width="100%" height="100%">
      <AreaChart data={chartData} margin={{ top: showPointLabels ? 24 : 4, right: 18, left: -12, bottom: 0 }}>
        <defs>
          <linearGradient id="colorUtilization" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor="var(--amber)" stopOpacity={0.3}/>
            <stop offset="95%" stopColor="var(--amber)" stopOpacity={0}/>
          </linearGradient>
        </defs>
        <CartesianGrid strokeDasharray="3 3" stroke="var(--line)" vertical={false} />
        <XAxis 
          dataKey="date" 
          stroke="var(--muted)" 
          fontSize={11} 
          tickLine={false}
          axisLine={false}
          tickFormatter={formatShortDate}
          minTickGap={12}
        />
        <YAxis 
          domain={[0, 100]}
          stroke="var(--muted)" 
          fontSize={11}
          tickLine={false}
          axisLine={false}
          tickFormatter={(value) => `${value.toFixed(0)}%`}
        />
        <Tooltip 
          content={<CustomTooltip valueFormatter={(value: number) => {
            return [`${value.toFixed(2)}%`];
          }} />}
        />
        <Area 
          type="linear"
          dataKey="percentage" 
          name="Utilization" 
          stroke="var(--amber)" 
          strokeWidth={2}
          fillOpacity={1}
          fill="url(#colorUtilization)"
          dot={showPointLabels ? { r: 3, fill: "var(--amber)", stroke: "var(--panel)", strokeWidth: 1 } : false}
          activeDot={{ r: 4, fill: "var(--amber)", stroke: "var(--bg)", strokeWidth: 2 }}
        >
          {showPointLabels && (
            <LabelList
              dataKey="percentage"
              position="top"
              formatter={(value: unknown) => typeof value === 'number' ? `${value.toFixed(1)}%` : String(value ?? '')}
              fill="var(--text)"
              fontSize={10}
              fontWeight={700}
            />
          )}
        </Area>
      </AreaChart>
    </ResponsiveContainer>
  );
}
