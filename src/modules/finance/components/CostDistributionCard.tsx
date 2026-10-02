import React, { useState } from 'react';
import { CostCategory } from '../types';

interface CostDistributionCardProps {
  categories: CostCategory[];
  totalExposure: number;
  timeRange: string;
}

export const CostDistributionCard: React.FC<CostDistributionCardProps> = ({
  categories,
  totalExposure,
  timeRange,
}) => {
  const [hoveredId, setHoveredId] = useState<string | null>(null);

  // SVG dimensions for Donut Chart (thicker ring & compact)
  const size = 144;
  const center = size / 2;
  const outerRadius = 66;
  const innerRadius = 37;

  // Calculate slice angles
  let currentAngle = -90; // Start at top (12 o'clock)
  const slices = categories.map((cat) => {
    const angle = (cat.percentage / 100) * 360;
    const startAngle = currentAngle;
    const endAngle = currentAngle + angle;
    currentAngle = endAngle;

    // Convert polar to cartesian coordinates
    const startRad = (startAngle * Math.PI) / 180;
    const endRad = (endAngle * Math.PI) / 180;

    const x1 = center + outerRadius * Math.cos(startRad);
    const y1 = center + outerRadius * Math.sin(startRad);
    const x2 = center + outerRadius * Math.cos(endRad);
    const y2 = center + outerRadius * Math.sin(endRad);

    const x3 = center + innerRadius * Math.cos(endRad);
    const y3 = center + innerRadius * Math.sin(endRad);
    const x4 = center + innerRadius * Math.cos(startRad);
    const y4 = center + innerRadius * Math.sin(startRad);

    const largeArc = angle > 180 ? 1 : 0;

    // SVG path definition
    const path = `
      M ${x1} ${y1}
      A ${outerRadius} ${outerRadius} 0 ${largeArc} 1 ${x2} ${y2}
      L ${x3} ${y3}
      A ${innerRadius} ${innerRadius} 0 ${largeArc} 0 ${x4} ${y4}
      Z
    `;

    return {
      ...cat,
      path,
      startAngle,
      endAngle,
    };
  });

  const activeCategory = hoveredId
    ? categories.find((c) => c.id === hoveredId)
    : null;

  return (
    <div className="bg-white rounded-lg border border-slate-200/90 shadow-xs p-2.5 sm:p-3 flex flex-col h-full min-h-0 justify-between">
      {/* Title */}
      <div className="flex items-center justify-between pb-1 border-b border-slate-100">
        <h2 className="text-xs sm:text-sm font-bold text-slate-800 tracking-tight">
          Cost Distribution – Where is the Money Going?
        </h2>
      </div>

      {/* Chart & Legend Grid */}
      <div className="mt-2 flex flex-col sm:flex-row items-center justify-between gap-3 flex-1 min-h-0">
        {/* Donut Chart Column with Label at the Top */}
        <div className="flex flex-col items-center shrink-0">
          {/* Label positioned at top of pie chart */}
          <div className="h-6 flex items-center justify-center text-center mb-1 w-full">
            <div className="text-[10.5px] sm:text-[11px] font-bold uppercase tracking-wider text-slate-500">
              Total Exposure
            </div>
          </div>

          {/* Donut Chart with Center Text */}
          <div className="relative shrink-0 flex items-center justify-center w-28 h-28 sm:w-32 sm:h-32">
            <svg
              viewBox={`0 0 ${size} ${size}`}
              className="w-full h-full overflow-visible"
            >
              {slices.map((slice) => {
                const isHovered = hoveredId === slice.id;
                return (
                  <path
                    key={slice.id}
                    d={slice.path}
                    fill={slice.color}
                    stroke="var(--donut-stroke, #ffffff)"
                    strokeWidth="2.5"
                    className="cursor-pointer transition-transform duration-200"
                    style={{
                      transformOrigin: `${center}px ${center}px`,
                      transform: isHovered ? 'scale(1.05)' : 'scale(1)',
                      opacity: hoveredId && !isHovered ? 0.65 : 1,
                    }}
                    onMouseEnter={() => setHoveredId(slice.id)}
                    onMouseLeave={() => setHoveredId(null)}
                  >
                    <title>{`${slice.name}: ${slice.percentage}% (₹ ${slice.amountLakhs.toFixed(1)}L)`}</title>
                  </path>
                );
              })}
            </svg>

            {/* Static Clean Center Callout (stays fixed on hover) */}
            <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none text-center px-1">
              <div className="text-sm sm:text-base font-black text-slate-900 leading-tight">
                ₹ {totalExposure.toFixed(1)}
              </div>
              <div className="text-[10px] sm:text-[11px] font-bold text-slate-600 mt-0.5">
                Lakhs
              </div>
            </div>
          </div>
        </div>

        {/* Legend Table */}
        <div className="w-full flex-1 space-y-1">
          {categories.map((cat) => {
            const isHovered = hoveredId === cat.id;
            return (
              <div
                key={cat.id}
                onMouseEnter={() => setHoveredId(cat.id)}
                onMouseLeave={() => setHoveredId(null)}
                className={`flex items-center justify-between text-xs sm:text-[13px] py-0.5 px-1.5 rounded cursor-pointer transition-colors ${
                  isHovered ? 'bg-slate-100 font-bold' : 'hover:bg-slate-50'
                }`}
              >
                {/* Colored Dot + Category Name */}
                <div className="flex items-center gap-1.5 min-w-0 pr-1">
                  <span
                    className="w-2.5 h-2.5 rounded-full shrink-0"
                    style={{ backgroundColor: cat.color }}
                  />
                  <span className="text-slate-800 font-semibold truncate">{cat.name}</span>
                </div>

                {/* Percentage & Amount */}
                <div className="flex items-center gap-2 shrink-0">
                  <span className="text-slate-600 font-semibold w-8 text-right text-[11px]">
                    {cat.percentage}%
                  </span>
                  <span className="text-slate-900 font-bold w-14 text-right">
                    ₹ {cat.amountLakhs.toFixed(1)}L
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
