import React, { useState } from 'react';
import { MonthlyTrendData, TrendViewMode } from '../types';

interface FinancialTrendCardProps {
  trendData: MonthlyTrendData[];
}

export const FinancialTrendCard: React.FC<FinancialTrendCardProps> = ({ trendData }) => {
  const [viewMode, setViewMode] = useState<TrendViewMode>('Total');
  const [activeBar, setActiveBar] = useState<number | null>(null);

  const peakValue = trendData.length > 0 ? Math.max(...trendData.map((d) => d.total), 10) : 20;
  const maxVal = Math.max(20, Math.ceil((peakValue * 1.2) / 5) * 5);
  const tickStep = maxVal / 4;
  const yTicks = [maxVal, Math.round(tickStep * 3), Math.round(tickStep * 2), Math.round(tickStep * 1), 0];

  const modes: TrendViewMode[] = ['Total', 'Downtime', 'Energy', 'Maintenance'];

  const legendItems = [
    { label: 'Maintenance', color: '#3b82f6' },
    { label: 'Idle / Unproductive', color: '#f59e0b' },
    { label: 'Energy Waste', color: '#10b981' },
    { label: 'Downtime Loss', color: '#f43f5e' },
  ];

  return (
    <div className="bg-white rounded-lg border border-slate-200/90 shadow-xs p-2.5 sm:p-3 flex flex-col h-auto min-h-0">
      {/* Header with Title & Filter Pills */}
      <div className="flex flex-wrap items-center justify-between gap-2 pb-1 border-b border-slate-100">
        <h2 className="text-xs sm:text-sm font-bold text-slate-800 tracking-tight">
          Financial Exposure Trend
        </h2>

        {/* View mode toggle pills */}
        <div className="inline-flex rounded bg-slate-100 p-0.5 text-xs font-semibold">
          {modes.map((mode) => {
            const isActive = viewMode === mode;
            return (
              <button
                key={mode}
                onClick={() => setViewMode(mode)}
                className={`px-2 py-0.5 rounded transition-all cursor-pointer ${
                  isActive
                    ? 'bg-[#0070f3] text-white font-bold shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                {mode}
              </button>
            );
          })}
        </div>
      </div>

      {/* Chart Canvas & Legend */}
      <div className="mt-2 flex flex-col sm:flex-row items-center gap-3">
        {/* Main Chart Area */}
        <div className="w-full sm:flex-1 h-34 sm:h-36 relative flex flex-col justify-end">
          {/* Y Axis Guide Lines & Labels */}
          <div className="absolute inset-0 flex flex-col justify-between pointer-events-none pb-5 pl-7">
            {yTicks.map((tick) => (
              <div key={tick} className="flex items-center w-full">
                <span className="text-[10px] font-bold text-slate-500 w-5 text-right pr-1 shrink-0">
                  {tick}
                </span>
                <div className="w-full h-[1px] bg-slate-100" />
              </div>
            ))}
          </div>

          {/* Y Axis Title */}
          <div className="absolute left-0 top-1/2 -translate-y-1/2 -rotate-90 text-[10px] font-bold text-slate-500 tracking-wider pointer-events-none origin-center">
            Cost (L)
          </div>

          {/* Thick Stacked Bars */}
          <div className="relative z-10 flex items-end justify-around pl-8 pr-1 h-full pb-5">
            {trendData.map((item, idx) => {
              // Values based on viewMode
              let displayTotal = item.total;
              let segments = [
                { key: 'downtime', val: item.downtimeLoss, color: '#f43f5e', name: 'Downtime' },
                { key: 'energy', val: item.energyWaste, color: '#10b981', name: 'Energy' },
                { key: 'idle', val: item.idleCost, color: '#f59e0b', name: 'Idle' },
                { key: 'maintenance', val: item.maintenance, color: '#3b82f6', name: 'Maintenance' },
              ];

              if (viewMode === 'Downtime') {
                displayTotal = item.downtimeLoss;
                segments = [{ key: 'downtime', val: item.downtimeLoss, color: '#f43f5e', name: 'Downtime' }];
              } else if (viewMode === 'Energy') {
                displayTotal = item.energyWaste;
                segments = [{ key: 'energy', val: item.energyWaste, color: '#10b981', name: 'Energy' }];
              } else if (viewMode === 'Maintenance') {
                displayTotal = item.maintenance;
                segments = [{ key: 'maintenance', val: item.maintenance, color: '#3b82f6', name: 'Maintenance' }];
              }

              const isHovered = activeBar === idx;

              return (
                <div
                  key={item.month}
                  className="flex flex-col items-center group relative cursor-pointer"
                  onMouseEnter={() => setActiveBar(idx)}
                  onMouseLeave={() => setActiveBar(null)}
                >
                  {/* Top Total Label */}
                  <span className="text-xs sm:text-[13px] font-black text-slate-900 mb-0.5">
                    {displayTotal.toFixed(1)}L
                  </span>

                  {/* Stacked Bar Container - Scales responsively */}
                  <div className="h-22 sm:h-24 flex flex-col justify-end">
                    <div
                      className="w-14 sm:w-18 md:w-20 rounded-t-sm flex flex-col-reverse overflow-hidden transition-all duration-200 shadow-sm"
                      style={{
                        height: `${Math.min(100, (displayTotal / maxVal) * 100)}%`,
                        transform: isHovered ? 'scaleY(1.02)' : 'none',
                      }}
                    >
                      {segments.map((seg) => {
                        const segHeightPercent = (seg.val / displayTotal) * 100;
                        return (
                          <div
                            key={seg.key}
                            style={{
                              height: `${segHeightPercent}%`,
                              backgroundColor: seg.color,
                            }}
                            className="w-full transition-opacity hover:opacity-90"
                            title={`${seg.name}: ₹ ${seg.val.toFixed(1)} L`}
                          />
                        );
                      })}
                    </div>
                  </div>

                  {/* X Axis Month Label */}
                  <span className="text-xs sm:text-[12.5px] font-bold text-slate-700 mt-1">
                    {item.month}
                  </span>

                  {/* Hover Tooltip */}
                  {isHovered && (
                    <div className="absolute bottom-full mb-2 z-30 bg-slate-900 text-white rounded p-2 text-[10px] shadow-lg whitespace-nowrap pointer-events-none">
                      <div className="font-bold border-b border-slate-700 pb-0.5 mb-0.5">
                        {item.month} Breakdown
                      </div>
                      <div className="space-y-0.5">
                        <div>Downtime: ₹ {item.downtimeLoss.toFixed(1)} L</div>
                        <div>Energy: ₹ {item.energyWaste.toFixed(1)} L</div>
                        <div>Idle: ₹ {item.idleCost.toFixed(1)} L</div>
                        <div>Maint: ₹ {item.maintenance.toFixed(1)} L</div>
                        <div className="font-bold pt-0.5 border-t border-slate-800 text-cyan-300">
                          Total: ₹ {item.total.toFixed(1)} L
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Legend on Right Side */}
        <div className="shrink-0 flex flex-row sm:flex-col gap-2 sm:gap-1.5 text-xs border-t sm:border-t-0 sm:border-l border-slate-100 pt-1.5 sm:pt-0 sm:pl-3 justify-center">
          {legendItems.map((item) => (
            <div key={item.label} className="flex items-center gap-1.5">
              <span
                className="w-2.5 h-2.5 rounded-sm shrink-0"
                style={{ backgroundColor: item.color }}
              />
              <span className="text-slate-700 text-xs sm:text-[12px] font-semibold whitespace-nowrap">
                {item.label}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
