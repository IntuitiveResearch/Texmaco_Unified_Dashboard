import React from 'react';
import { LucideIcon } from 'lucide-react';

interface StatCardProps {
  title: string;
  value: string | number;
  unit?: string;
  icon: LucideIcon;
  trend?: string;
  trendUp?: boolean;
  className?: string;
}

export function StatCard({ title, value, unit, icon: Icon, trend, trendUp, className = "" }: StatCardProps) {
  return (
    <div className={`bento-card ${className}`}>
      <div className="flex items-center justify-between mb-2">
        <div className="card-label mb-0">{title}</div>
        <div className="p-1 rounded opacity-50">
          <Icon className="w-4 h-4 text-slate-400" />
        </div>
      </div>
      <div className="mt-auto">
        <div className="big-val text-[var(--text-p)]">
          {value}
          {unit && <span className="unit ml-1">{unit}</span>}
        </div>
        {trend && (
          <div className={`mt-2 text-xs font-medium ${trendUp ? 'text-green-500' : 'text-red-500'}`}>
            {trendUp ? '↑' : '↓'} {trend}
          </div>
        )}
      </div>
    </div>
  );
}
