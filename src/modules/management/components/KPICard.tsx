import React from 'react';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

interface KPICardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  subSubtitle?: string;
  icon?: React.ReactNode;
  className?: string;
  colorTheme?: 'emerald' | 'coral' | 'purple' | 'amber' | 'cyan';
}

export function KPICard({ title, value, subtitle, subSubtitle, icon, className, colorTheme = 'emerald' }: KPICardProps) {
  const colorMap = {
    emerald: 'var(--emerald)',
    coral: 'var(--coral)',
    purple: 'var(--purple)',
    amber: 'var(--amber)',
    cyan: 'var(--cyan)'
  };

  const themeColor = colorMap[colorTheme];

  return (
    <div 
      className={cn(
        "border border-[var(--line)] rounded-[10px] 2xl:rounded-[12px] p-2 2xl:p-2.5 shadow-[0_2px_8px_var(--shadow)] min-h-[52px] 2xl:min-h-[64px] flex flex-col justify-center relative overflow-hidden bg-[var(--panel)] transition-all duration-200 hover:border-[color-mix(in_srgb,var(--cyan)_35%,var(--line))] hover:shadow-[0_6px_20px_var(--shadow)] group",
        className
      )}
    >
      {/* Top subtle highlight accent line */}
      <div 
        className="absolute top-0 left-0 right-0 h-[2.5px] opacity-85"
        style={{
          background: `linear-gradient(90deg, ${themeColor} 0%, color-mix(in srgb, ${themeColor} 40%, transparent) 100%)`
        }}
      />

      {icon && (
        <div 
          className="w-[23px] h-[23px] 2xl:w-[26px] 2xl:h-[26px] rounded-full flex items-center justify-center absolute top-2 right-2 transition-transform group-hover:scale-105"
          style={{
            backgroundColor: `color-mix(in srgb, ${themeColor} 14%, transparent)`,
            border: `1px solid color-mix(in srgb, ${themeColor} 32%, transparent)`,
            color: themeColor
          }}
        >
          {icon}
        </div>
      )}

      <div>
        <div className="text-[10px] 2xl:text-[11px] text-[var(--muted)] uppercase tracking-[0.5px] font-bold mb-0.5 2xl:mb-1 pr-7 leading-tight truncate">
          {title}
        </div>
        <div 
          className="text-[clamp(17px,1.35vw,24px)] font-extrabold tracking-tight leading-none"
          style={{ color: themeColor }}
        >
          {value}
        </div>
      </div>
      
      {(subtitle || subSubtitle) && (
        <div className="mt-2">
          {subtitle && (
            <div className="text-[11.5px] text-[var(--muted)] font-medium leading-[1.25]">{subtitle}</div>
          )}
          {subSubtitle && (
            <div className="text-[11px] text-[var(--muted)] opacity-80 mt-[2px]">{subSubtitle}</div>
          )}
        </div>
      )}
    </div>
  );
}
