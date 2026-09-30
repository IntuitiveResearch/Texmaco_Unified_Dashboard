import React from 'react';
import { 
  AreaChart, 
  Area, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  LabelList,
  Tooltip, 
  ReferenceLine, 
  ResponsiveContainer 
} from 'recharts';
import { Availability } from '../../types';
import { CustomTooltip } from './CustomTooltip';
import { formatShortDate } from '../../utils';

interface Props {
  data: Availability[];
  showPointLabels?: boolean;
}

export function AvailabilityTrendChart({ data, showPointLabels = false }: Props) {
  if (!data || data.length === 0) {
    return <div className="flex items-center justify-center h-full text-zinc-500">No Data Available</div>;
  }

  return (
    <ResponsiveContainer width="100%" height="100%">
      <AreaChart data={data} margin={{ top: showPointLabels ? 24 : 4, right: 18, left: -12, bottom: 0 }}>
        <defs>
          <linearGradient id="availabilityFill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor="var(--emerald)" stopOpacity={0.28}/>
            <stop offset="95%" stopColor="var(--emerald)" stopOpacity={0.03}/>
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
        <ReferenceLine y={95} stroke="var(--coral)" strokeDasharray="3 3" label={{ position: 'insideTopLeft', value: '95%', fill: 'var(--coral)', fontSize: 11 }} />
        <Area 
          type="linear" 
          dataKey="value" 
          name="Availability" 
          stroke="var(--emerald)" 
          strokeWidth={2}
          fill="url(#availabilityFill)"
          fillOpacity={1}
          dot={showPointLabels ? { r: 3, fill: "var(--emerald)", stroke: "var(--panel)", strokeWidth: 1 } : false}
          activeDot={{ r: 4, fill: "var(--emerald)", stroke: "var(--bg)", strokeWidth: 2 }}
        >
          {showPointLabels && (
            <LabelList
              dataKey="value"
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
