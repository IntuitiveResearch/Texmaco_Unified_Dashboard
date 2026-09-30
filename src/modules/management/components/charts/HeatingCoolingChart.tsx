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
import { ThermalRates } from '../../types';
import { formatNumber, formatShortDate } from '../../utils';
import { CustomTooltip } from './CustomTooltip';

interface Props {
  data: ThermalRates[];
}

export function HeatingCoolingChart({ data }: Props) {
  const [activeSeries, setActiveSeries] = useState<string | null>(null);

  if (!data || data.length === 0) {
    return <div className="flex items-center justify-center h-full text-zinc-500">No Data Available</div>;
  }

  return (
    <ResponsiveContainer width="100%" height="100%">
      <LineChart data={data} margin={{ top: 4, right: 12, left: -12, bottom: 0 }}>
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
          stroke="var(--muted)" 
          fontSize={11}
          tickLine={false}
          axisLine={false}
          tickFormatter={(value) => `${value}°C/s`}
        />
        <Tooltip 
          content={<CustomTooltip valueFormatter={(value: number) => [`${formatNumber(value, 4)} °C/s`]} />}
        />
        <Legend 
          onClick={(e: any) => setActiveSeries(activeSeries === e.dataKey ? null : e.dataKey)}
          wrapperStyle={{ fontSize: '10.5px', textTransform: 'capitalize', color: 'var(--muted)', cursor: 'pointer' }} 
          iconType="circle" 
          iconSize={8} 
        />
        <Line type="linear" dataKey="heating_rate" name="Heating Rate" stroke="var(--coral)" strokeOpacity={activeSeries && activeSeries !== 'heating_rate' ? 0.2 : 1} strokeWidth={2} dot={false} />
        <Line type="linear" dataKey="cooling_rate" name="Cooling Rate" stroke="var(--cyan)" strokeOpacity={activeSeries && activeSeries !== 'cooling_rate' ? 0.2 : 1} strokeWidth={2} dot={false} />
      </LineChart>
    </ResponsiveContainer>
  );
}
