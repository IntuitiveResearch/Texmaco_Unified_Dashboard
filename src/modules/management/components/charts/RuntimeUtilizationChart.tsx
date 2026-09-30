import React, { useState } from 'react';
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
import { Utilization } from '../../types';
import { formatSecondsToHoursMinutes } from '../../utils';
import { CustomTooltip } from './CustomTooltip';

interface Props {
  data: Utilization[];
}

export function RuntimeUtilizationChart({ data }: Props) {
  const [activeSeries, setActiveSeries] = useState<string | null>(null);

  if (!data || data.length === 0) {
    return <div className="flex items-center justify-center h-full text-zinc-500">No Data Available</div>;
  }

  return (
    <ResponsiveContainer width="100%" height="100%">
      <BarChart data={data} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="var(--line)" vertical={false} />
        <XAxis 
          dataKey="date" 
          stroke="var(--muted)" 
          fontSize={11} 
          tickLine={false}
          axisLine={false}
        />
        <YAxis 
          stroke="var(--muted)" 
          fontSize={11}
          tickLine={false}
          axisLine={false}
          tickFormatter={(value) => `${(value / 3600).toFixed(0)}h`}
        />
        <Tooltip 
          content={<CustomTooltip valueFormatter={(value: number) => [formatSecondsToHoursMinutes(value)]} />}
        />
        <Legend 
          onClick={(e: any) => setActiveSeries(activeSeries === e.dataKey ? null : e.dataKey)}
          wrapperStyle={{ fontSize: '12px', textTransform: 'capitalize', color: 'var(--muted)', cursor: 'pointer' }} 
          iconType="circle" 
          iconSize={8} 
        />
        <Bar dataKey="loaded" name="Loaded*" stackId="a" fill="var(--cyan)" fillOpacity={activeSeries && activeSeries !== 'loaded' ? 0.2 : 1} radius={[0, 0, 4, 4]} />
        <Bar dataKey="unloaded" name="Unloaded*" stackId="a" fill="var(--amber)" fillOpacity={activeSeries && activeSeries !== 'unloaded' ? 0.2 : 1} radius={[4, 4, 0, 0]} />
      </BarChart>
    </ResponsiveContainer>
  );
}
