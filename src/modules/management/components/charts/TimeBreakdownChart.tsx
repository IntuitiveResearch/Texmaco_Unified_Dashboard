import React, { useMemo } from 'react';
import {
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
} from 'recharts';
import { DashboardSummary } from '../../types';
import { formatNumber } from '../../utils';

interface Props {
  summary: DashboardSummary;
  mode?: 'compressor' | 'cnc';
}

interface BreakdownItem {
  name: string;
  value: number;
  color: string;
}

export function TimeBreakdownChart({ summary, mode = 'compressor' }: Props) {
  const data = useMemo<BreakdownItem[]>(() => {
    if (mode === 'cnc') {
      return [
        {
          name: 'Running',
          value: summary.runtime_seconds,
          color: 'var(--emerald)',
        },
        {
          name: 'Downtime',
          value: summary.downtime_seconds,
          color: 'var(--coral)',
        },
        {
          name: 'Idle',
          value: summary.idle_seconds || 0,
          color: 'var(--amber)',
        },
      ].filter((item) => item.value > 0);
    }

    return [
      {
        name: 'Load',
        value: summary.loaded_runtime_seconds,
        color: 'var(--emerald)',
      },
      {
        name: 'Downtime (Unplanned)',
        value: summary.downtime_seconds,
        color: 'var(--coral)',
      },
      {
        name: 'Unload',
        value: summary.unloaded_runtime_seconds,
        color: 'var(--amber)',
      },
    ].filter((item) => item.value > 0);
  }, [mode, summary]);

  const totalSeconds = data.reduce((sum, item) => sum + item.value, 0);

  if (totalSeconds === 0) {
    return <div className="flex items-center justify-center h-full text-zinc-500">No Time Data Available</div>;
  }

  return (
    <div className="h-full min-h-[122px] grid grid-cols-1 xl:grid-cols-[minmax(96px,0.8fr)_minmax(178px,1.2fr)] items-center gap-2">
      <div className="h-[106px] min-w-0">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Tooltip
              formatter={(value: number, name: string) => [
                `${formatNumber(value / 3600, 1)} h`,
                name,
              ]}
            />
            <Pie
              data={data}
              dataKey="value"
              nameKey="name"
              innerRadius="58%"
              outerRadius="82%"
              paddingAngle={1}
              stroke="var(--panel)"
              strokeWidth={2}
            >
              {data.map((entry) => (
                <Cell key={entry.name} fill={entry.color} />
              ))}
            </Pie>
          </PieChart>
        </ResponsiveContainer>
      </div>

      <div className="space-y-2">
        {data.map((item) => {
          const percent = (item.value / totalSeconds) * 100;

          return (
            <div key={item.name} className="grid grid-cols-[minmax(0,1fr)_38px_64px] items-center gap-2 text-[11px]">
              <div className="flex items-center gap-2.5 min-w-0">
                <span
                  className="w-2 h-2 rounded-full shrink-0"
                  style={{ backgroundColor: item.color, boxShadow: `0 0 10px ${item.color}` }}
                />
                <span className="font-semibold text-[var(--text)] truncate">{item.name}</span>
              </div>
              <span className="text-right font-extrabold text-[var(--text)]">
                {percent.toFixed(0)}%
              </span>
              <span className="text-right font-mono font-semibold text-[var(--muted)] whitespace-nowrap">
                ({formatNumber(item.value / 3600, 1)} h)
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
