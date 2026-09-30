import React, { useState } from 'react';
import { 
  LineChart, 
  Line, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  Legend, 
  ResponsiveContainer 
} from 'recharts';
import { ThermalAnalysis } from '../../types';
import { formatNumber } from '../../utils';
import { CustomTooltip } from './CustomTooltip';

interface Props {
  data: ThermalAnalysis[];
}

export function ThermalAnalysisChart({ data }: Props) {
  const [activeSeries, setActiveSeries] = useState<string | null>(null);

  if (!data || data.length === 0) {
    return <div className="flex items-center justify-center h-full text-zinc-500">No Data Available</div>;
  }

  return (
    <ResponsiveContainer width="100%" height="100%">
      <LineChart data={data} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
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
          tickFormatter={(value) => `${value}°C`}
        />
        <Tooltip 
          content={<CustomTooltip valueFormatter={(value: number, name: string) => [
            name === 'Deviation' ? `${formatNumber(value, 2)}` : `${formatNumber(value, 2)} °C`, 
            name
          ]} />}
        />
        <Legend 
          onClick={(e: any) => setActiveSeries(activeSeries === e.dataKey ? null : e.dataKey)}
          wrapperStyle={{ fontSize: '12px', textTransform: 'capitalize', color: 'var(--muted)', cursor: 'pointer' }} 
          iconType="circle" 
          iconSize={8} 
        />
        <Line type="linear" dataKey="average" name="Average" stroke="var(--amber)" strokeOpacity={activeSeries && activeSeries !== 'average' ? 0.2 : 1} strokeWidth={2} dot={false} />
        <Line type="linear" dataKey="median" name="Median" stroke="var(--cyan)" strokeOpacity={activeSeries && activeSeries !== 'median' ? 0.2 : 1} strokeWidth={2} dot={false} />
        <Line type="linear" dataKey="maximum" name="Maximum" stroke="var(--coral)" strokeOpacity={activeSeries && activeSeries !== 'maximum' ? 0.2 : 1} strokeWidth={2} dot={false} />
        <Line type="linear" dataKey="deviation" name="Std Dev" stroke="var(--purple)" strokeOpacity={activeSeries && activeSeries !== 'deviation' ? 0.2 : 1} strokeWidth={1} dot={false} strokeDasharray="4 4" />
      </LineChart>
    </ResponsiveContainer>
  );
}
