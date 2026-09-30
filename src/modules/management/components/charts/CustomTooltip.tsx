import React from 'react';

interface CustomTooltipProps {
  active?: boolean;
  payload?: any[];
  label?: string;
  valueFormatter?: (value: any, name: string) => [React.ReactNode, string?];
}

export function CustomTooltip({ active, payload, label, valueFormatter }: CustomTooltipProps) {
  if (active && payload && payload.length) {
    return (
      <div className="bg-[var(--panel)]/95 backdrop-blur-md border border-[var(--line)] shadow-[0_16px_32px_var(--shadow)] rounded-[12px] p-4 min-w-[220px]">
        <div className="text-[12.5px] font-bold text-[var(--muted)] tracking-[0.5px] uppercase mb-3 pb-2 border-b border-[var(--line)]">
          {label}
        </div>
        <div className="flex flex-col gap-2.5">
          {payload.map((entry, index) => {
            if (entry.name === 'offline_hidden') return null;
            
            let displayValue: React.ReactNode = entry.value;
            let displayName: string = entry.name;
            
            if (valueFormatter) {
              const formatted = valueFormatter(entry.value, entry.name);
              displayValue = formatted[0];
              if (formatted[1]) {
                displayName = formatted[1];
              }
            }
            
            if (displayName === ' ') return null;

            return (
              <div key={`item-${index}`} className="flex items-center justify-between gap-6 text-[13.5px]">
                <div className="flex items-center gap-2.5">
                  <span 
                    className="w-2.5 h-2.5 rounded-full" 
                    style={{ backgroundColor: entry.color, boxShadow: `0 0 10px ${entry.color}80` }}
                  ></span>
                  <span className="text-[var(--text)] opacity-85 font-semibold capitalize">{displayName}</span>
                </div>
                <span className="font-mono font-bold text-[var(--text)]">{displayValue}</span>
              </div>
            );
          })}
        </div>
      </div>
    );
  }

  return null;
}
