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
import { Events } from '../../types';
import { CustomTooltip } from './CustomTooltip';

interface Props {
  data: Events[];
}

export function EventsChart({ data }: Props) {
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
        />
        <Tooltip 
          cursor={{ fill: 'var(--panel2)' }}
          content={<CustomTooltip />}
        />
        <Legend 
          onClick={(e: any) => setActiveSeries(activeSeries === e.dataKey ? null : e.dataKey)}
          wrapperStyle={{ fontSize: '12px', textTransform: 'capitalize', color: 'var(--muted)', cursor: 'pointer' }} 
          iconType="circle" 
          iconSize={8} 
        />
        <Bar dataKey="high_current_events" name="High Current Events" fill="var(--amber)" fillOpacity={activeSeries && activeSeries !== 'high_current_events' ? 0.2 : 1} radius={[4, 4, 0, 0]} />
        <Bar dataKey="high_temperature_events" name="High Temp Events" fill="var(--coral)" fillOpacity={activeSeries && activeSeries !== 'high_temperature_events' ? 0.2 : 1} radius={[4, 4, 0, 0]} />
      </BarChart>
    </ResponsiveContainer>
  );
}
