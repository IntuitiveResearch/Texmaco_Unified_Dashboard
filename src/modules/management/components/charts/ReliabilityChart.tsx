import React from 'react';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  LabelList,
  Tooltip, 
  ResponsiveContainer 
} from 'recharts';
import { Reliability } from '../../types';
import { CustomTooltip } from './CustomTooltip';
import { formatShortDate } from '../../utils';

interface Props {
  data: Array<Reliability | { date: string; cycle_count: number }>;
  showBarLabels?: boolean;
  valueKey?: string;
  barName?: string;
}

export function ReliabilityChart({ data, showBarLabels = false, valueKey = 'interruptions', barName = 'Interruptions' }: Props) {
  if (!data || data.length === 0) {
    return <div className="flex items-center justify-center h-full text-zinc-500">No Data Available</div>;
  }

  return (
    <ResponsiveContainer width="100%" height="100%">
      <BarChart data={data} margin={{ top: showBarLabels ? 24 : 4, right: 18, left: -12, bottom: 0 }}>
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
        />
        <Tooltip 
          cursor={{ fill: 'color-mix(in srgb, var(--purple) 12%, transparent)', radius: 4 }}
          content={<CustomTooltip valueFormatter={(value: number, name: string) => {
            return [value];
          }} />}
        />
        <Bar dataKey={valueKey} name={barName} fill="var(--purple)" barSize={showBarLabels ? 18 : 10} radius={[3, 3, 0, 0]}>
          {showBarLabels && (
            <LabelList
              dataKey={valueKey}
              position="top"
              formatter={(value: unknown) => String(value ?? '')}
              fill="var(--text)"
              fontSize={14}
              fontWeight={800}
            />
          )}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}
