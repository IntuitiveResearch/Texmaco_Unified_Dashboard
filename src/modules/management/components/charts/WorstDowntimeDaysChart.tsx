import React, { useMemo } from 'react';
import { format, parseISO } from 'date-fns';
import { RuntimeDistribution } from '../../types';

interface Props {
  data: RuntimeDistribution[];
}

interface WorstDowntimeDay {
  rank: number;
  date: string;
  downtimeSeconds: number;
  downtimeHours: number;
}

function formatDateLabel(date: string): string {
  const parsed = parseISO(date);
  if (Number.isNaN(parsed.getTime())) return date;
  return format(parsed, 'dd MMM');
}

export function WorstDowntimeDaysChart({ data }: Props) {
  const worstDays = useMemo<WorstDowntimeDay[]>(() => {
    if (!data) return [];

    return [...data]
      .filter((item) => item.downtime > 0)
      .sort((a, b) => {
        if (b.downtime !== a.downtime) return b.downtime - a.downtime;
        return a.date.localeCompare(b.date);
      })
      .slice(0, 5)
      .map((item, index) => ({
        rank: index + 1,
        date: item.date,
        downtimeSeconds: item.downtime,
        downtimeHours: item.downtime / 3600,
      }));
  }, [data]);

  if (worstDays.length === 0) {
    return <div className="flex items-center justify-center h-full text-zinc-500">No Downtime Recorded</div>;
  }

  const maxDowntimeSeconds = Math.max(...worstDays.map((item) => item.downtimeSeconds));
  const maxDowntimeHours = maxDowntimeSeconds / 3600;
  const axisMaxHours = Math.max(1, Math.ceil(maxDowntimeHours / 4) * 4);
  const axisMaxSeconds = axisMaxHours * 3600;
  const axisTicks = [0, 0.25, 0.5, 0.75, 1].map((ratio) => axisMaxHours * ratio);

  return (
    <div className="h-full flex flex-col justify-start gap-1 px-1 pt-0.5 overflow-hidden">
      <div className="grid grid-cols-[20px_50px_minmax(60px,1fr)_52px] items-center gap-1.5 text-[9.5px] font-extrabold uppercase tracking-[0.3px] text-[var(--muted)] pb-0.5 border-b border-[var(--line)]">
        <span>#</span>
        <span>Date</span>
        <span></span>
        <span className="text-right">Downtime</span>
      </div>

      <div className="space-y-1 pt-0.5">
        {worstDays.map((item) => {
          const width = axisMaxSeconds > 0 ? (item.downtimeSeconds / axisMaxSeconds) * 100 : 0;

          return (
            <div
              key={`${item.date}-${item.rank}`}
              className="grid grid-cols-[20px_50px_minmax(60px,1fr)_52px] items-center gap-1.5 text-[10px] 2xl:text-[11px] leading-tight"
            >
              <span className="font-bold text-[var(--text)]">{item.rank}</span>
              <span className="font-bold text-[var(--text)] whitespace-nowrap">{formatDateLabel(item.date)}</span>
              <div className="h-1.5 rounded-full bg-[var(--panel2)] overflow-hidden">
                <div
                  className="h-full rounded-full bg-[var(--coral)] shadow-[0_0_8px_color-mix(in_srgb,var(--coral)_35%,transparent)]"
                  style={{ width: `${Math.max(width, 3)}%` }}
                  title={`${item.downtimeHours.toFixed(1)} h`}
                />
              </div>
              <span className="text-right font-mono font-bold text-[var(--text)] text-[10px]">
                {item.downtimeHours.toFixed(1)} h
              </span>
            </div>
          );
        })}
      </div>

      <div className="grid grid-cols-[20px_50px_minmax(60px,1fr)_52px] items-center gap-1.5 text-[9px] font-semibold text-[var(--muted)] pt-0.5">
        <span></span>
        <span></span>
        <div className="grid grid-cols-5">
          {axisTicks.map((tick) => (
            <span key={tick} className="first:text-left text-center last:text-right">
              {tick.toFixed(0)} h
            </span>
          ))}
        </div>
        <span></span>
      </div>
    </div>
  );
}
