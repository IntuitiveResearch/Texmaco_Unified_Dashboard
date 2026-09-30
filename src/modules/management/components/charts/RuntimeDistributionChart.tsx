import React, { useMemo, useState } from 'react';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  Legend, 
  ResponsiveContainer 
} from 'recharts';
import { RuntimeDistribution, Utilization } from '../../types';
import { formatSecondsToHoursMinutes, formatShortDate } from '../../utils';
import { CustomTooltip } from './CustomTooltip';

interface Props {
  runtimeDistribution: RuntimeDistribution[];
  utilization: Utilization[];
  mode?: 'compressor' | 'cnc';
}

export function RuntimeDistributionChart({ runtimeDistribution, utilization, mode = 'compressor' }: Props) {
  const [activeSeries, setActiveSeries] = useState<string | null>(null);
  const chartData = useMemo(() => {
    if (!runtimeDistribution) return [];

    if (mode === 'cnc') {
      return runtimeDistribution.map((item) => ({
        date: item.date,
        running: item.runtime || 0,
        idle: item.idle || 0,
        downtime: item.downtime || 0,
      }));
    }

    if (!utilization) return [];

    const utilizationMap = new Map(utilization.map((item) => [item.date, item]));
    const downtimeMap = new Map(runtimeDistribution.map((item) => [item.date, item.downtime]));
    const orderedDates = Array.from(new Set([
      ...runtimeDistribution.map((item) => item.date),
      ...utilization.map((item) => item.date),
    ])).sort();

    return orderedDates.map((date) => {
      const utilizationEntry = utilizationMap.get(date);

      return {
        date,
        loaded: utilizationEntry?.loaded || 0,
        unloaded: utilizationEntry?.unloaded || 0,
        downtime: downtimeMap.get(date) || 0,
      };
    });
  }, [mode, runtimeDistribution, utilization]);

  if (chartData.length === 0) {
    return <div className="flex items-center justify-center h-full text-zinc-500">No Data Available</div>;
  }

  return (
    <ResponsiveContainer width="100%" height="100%">
      <BarChart data={chartData as any[]} margin={{ top: 4, right: 12, left: -8, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="var(--line)" vertical={false} />
        <XAxis 
          dataKey="date" 
          stroke="var(--muted)" 
          fontSize={11} 
          tickLine={false}
          axisLine={false}
          tickFormatter={formatShortDate}
          minTickGap={16}
        />
        <YAxis 
          domain={[0, 86400]}
          ticks={[0, 21600, 43200, 64800, 86400]}
          stroke="var(--muted)" 
          fontSize={11}
          tickLine={false}
          axisLine={false}
          tickFormatter={(value) => `${(value / 3600).toFixed(0)}h`}
        />
        <Tooltip 
          content={<CustomTooltip valueFormatter={(value: number, name: string) => {
            return [formatSecondsToHoursMinutes(value)];
          }} />}
        />
        <Legend 
          onClick={(e: any) => setActiveSeries(activeSeries === e.dataKey ? null : e.dataKey)}
          wrapperStyle={{ fontSize: '11px', color: 'var(--muted)', textTransform: 'capitalize', cursor: 'pointer' }} 
          iconType="circle" 
          iconSize={8} 
        />
        {mode === 'cnc' ? (
          <>
            <Bar dataKey="running" name="Running" stackId="a" fill="var(--emerald)" fillOpacity={activeSeries && activeSeries !== 'running' ? 0.2 : 1} radius={[0, 0, 4, 4]} />
            <Bar dataKey="idle" name="Idle" stackId="a" fill="var(--amber)" fillOpacity={activeSeries && activeSeries !== 'idle' ? 0.2 : 1} />
          </>
        ) : (
          <>
            <Bar dataKey="loaded" name="Load" stackId="a" fill="var(--emerald)" fillOpacity={activeSeries && activeSeries !== 'loaded' ? 0.2 : 1} radius={[0, 0, 4, 4]} />
            <Bar dataKey="unloaded" name="Unload" stackId="a" fill="var(--amber)" fillOpacity={activeSeries && activeSeries !== 'unloaded' ? 0.2 : 1} />
          </>
        )}
        <Bar dataKey="downtime" name="Downtime" stackId="a" fill="var(--coral)" fillOpacity={activeSeries && activeSeries !== 'downtime' ? 0.2 : 1} />
      </BarChart>
    </ResponsiveContainer>
  );
}
