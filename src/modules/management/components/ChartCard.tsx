import React from 'react';
import { cn } from './KPICard';

interface ChartCardProps {
  title: string;
  subtitle?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
  bodyClassName?: string;
  onClick?: () => void;
}

export function ChartCard({ title, subtitle, children, className, bodyClassName, onClick }: ChartCardProps) {
  const handleKeyDown = (event: React.KeyboardEvent<HTMLDivElement>) => {
    if (!onClick) return;
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      onClick();
    }
  };

  return (
    <div className={cn(
      "bg-[var(--panel)] border border-[var(--line)] rounded-[10px] 2xl:rounded-[12px] p-2 2xl:p-2.5 flex flex-col relative shadow-[0_2px_8px_var(--shadow)] overflow-hidden",
      onClick && "cursor-pointer transition-colors hover:border-[color-mix(in_srgb,var(--cyan)_45%,var(--line))] hover:bg-[color-mix(in_srgb,var(--cyan)_3%,var(--panel))]",
      className
    )}
      onClick={onClick}
      onKeyDown={handleKeyDown}
      role={onClick ? 'button' : undefined}
      tabIndex={onClick ? 0 : undefined}
    >
      <div className="mb-1 shrink-0">
        <h3 className="text-[11px] 2xl:text-[11.5px] text-[var(--text)] font-semibold tracking-[0.4px] uppercase m-0 leading-tight flex items-center justify-between gap-2">
          <span>{title}</span>
          {onClick && <span className="text-[10px] text-[var(--cyan)] font-medium normal-case tracking-normal hover:underline">Expand</span>}
        </h3>
        {subtitle && <div className="text-[10px] 2xl:text-[10.5px] text-[var(--muted)] mt-0.5 mb-0 leading-tight font-normal">{subtitle}</div>}
      </div>
      <div className={cn("flex-1 min-h-0 relative", bodyClassName)}>
        {children}
      </div>
    </div>
  );
}
