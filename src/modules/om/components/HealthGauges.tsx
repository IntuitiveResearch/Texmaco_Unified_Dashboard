import React from 'react';
import { Activity, Zap, Eye, AlertOctagon, Gauge, type LucideIcon } from 'lucide-react';
import { LatestTelemetry, KpiMetrics } from '../types';

interface HealthGaugesProps {
  latest: LatestTelemetry;
  kpis?: KpiMetrics;
  onOpenExpandGraphs?: () => void;
  includePower?: boolean;
  className?: string;
  renderGauge?: (gauge: HealthGaugeItem) => React.ReactNode;
}

export interface HealthGaugeItem {
  title: string;
  score: number;
  status: 'Critical' | 'Watch' | 'Good' | 'Offline';
  color: string;
  trackColor: string;
  description: string;
  icon: LucideIcon;
}

const ThickHorseshoeGauge: React.FC<{
  score: number;
  color: string;
  trackColor: string;
  status: string;
}> = ({ score, color, trackColor, status }) => {
  // Center (50, 47), radius 35.
  // Horseshoe starts at 135deg (bottom-left) and sweeps 270deg to 45deg (bottom-right).
  const r = 35;
  const sweepAngleDeg = 270;
  const arcLength = (sweepAngleDeg / 360) * 2 * Math.PI * r; // ≈ 164.93
  const clamped = Math.max(0, Math.min(100, score));
  const offset = arcLength * (1 - clamped / 100);

  return (
    <div className="relative w-20 sm:w-24 2xl:w-28 h-14 sm:h-16 2xl:h-18 flex items-center justify-center">
      <svg className="w-full h-full" viewBox="0 0 100 88">
        {/* Soft pastel background track (Thick stroke) */}
        <path
          d="M 25.25 71.75 A 35 35 0 1 1 74.75 71.75"
          fill="none"
          stroke={trackColor}
          strokeWidth="9"
          strokeLinecap="round"
        />

        {/* Active colored arc (Thick stroke) */}
        {status !== 'Offline' && (
          <path
            d="M 25.25 71.75 A 35 35 0 1 1 74.75 71.75"
            fill="none"
            stroke={color}
            strokeWidth="9"
            strokeLinecap="round"
            strokeDasharray={arcLength}
            strokeDashoffset={offset}
            style={{ transition: 'stroke-dashoffset 0.8s cubic-bezier(0.4, 0, 0.2, 1)' }}
          />
        )}

        {/* Center Score Number (Large, Centered and Bold) */}
        <text
          x="50"
          y="47"
          textAnchor="middle"
          dominantBaseline="central"
          fontSize="26"
          fontWeight="800"
          fill="#0f172a"
          className="font-sans tracking-tight select-none"
        >
          {status === 'Offline' ? '--' : Math.round(score)}
        </text>
      </svg>
    </div>
  );
};

export const HealthGauges: React.FC<HealthGaugesProps> = ({
  latest,
  kpis,
  includePower = true,
  className = '',
  renderGauge,
}) => {
  const currentScore = latest.current?.health_score ?? 78;
  const vibScore = latest.motioniq?.health_score ?? 62;
  const tempScore = latest.temperature?.health_score ?? 38;
  const mfmScore = latest.mfm?.health_score ?? 70;
  const opScore = latest.kpi?.availability_pct ?? kpis?.availability ?? 82;

  // Calculate Overall Health as weighted average across active dimensions
  const overallScore = Math.round(
    (currentScore * 0.25 +
      vibScore * 0.25 +
      tempScore * 0.2 +
      (mfmScore > 0 ? mfmScore * 0.15 : 0) +
      (opScore > 0 ? opScore * 0.15 : 0)) * 10
  ) / 10;

  const gauges: HealthGaugeItem[] = [
    {
      title: 'Overall Health',
      score: overallScore || 82,
      status: overallScore < 40 ? 'Critical' : overallScore < 70 ? 'Watch' : 'Good',
      color: '#10b981', // emerald
      trackColor: '#d1fae5', // emerald-100
      description: 'Running within normal limits',
      icon: Activity,
    },
    {
      title: 'Electrical Health',
      score: currentScore || 78,
      status: currentScore < 40 ? 'Critical' : currentScore < 70 ? 'Watch' : 'Good',
      color: '#2563eb', // blue
      trackColor: '#dbeafe', // blue-100
      description: 'Stable electrical parameters',
      icon: Zap,
    },
    {
      title: 'Mechanical Health',
      score: vibScore || 62,
      status: vibScore < 40 ? 'Critical' : vibScore < 70 ? 'Watch' : 'Good',
      color: '#f59e0b', // amber
      trackColor: '#fef3c7', // amber-100
      description: 'Elevated vibration levels',
      icon: Eye,
    },
    {
      title: 'Thermal Health',
      score: tempScore || 38,
      status: tempScore < 40 ? 'Critical' : tempScore < 70 ? 'Watch' : 'Good',
      color: '#ef4444', // red
      trackColor: '#fee2e2', // red-100
      description: 'High temperature detected',
      icon: AlertOctagon,
    },
    {
      title: 'Power Health',
      score: mfmScore || 70,
      status: mfmScore < 40 ? 'Critical' : mfmScore < 70 ? 'Watch' : 'Good',
      color: '#7c3aed', // purple
      trackColor: '#ede9fe', // purple-100
      description: 'Within expected range',
      icon: Gauge,
    },
  ];

  return (
    <div className={`grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-1.5 sm:gap-2 h-full ${className}`}>
      {gauges.filter((g) => includePower || g.title !== 'Power Health').map((g) => {
        if (renderGauge) return <React.Fragment key={g.title}>{renderGauge(g)}</React.Fragment>;
        const IconComponent = g.icon;
        return (
          <div
            key={g.title}
            aria-label={`${g.title}: ${Math.round(g.score)}, ${g.status}`}
            className="bg-white rounded-xl border border-slate-200/90 p-1.5 sm:p-2 shadow-2xs flex flex-col items-center justify-between text-center min-w-[65px] hover:shadow-xs transition-all h-full"
          >
            {/* Header: Title */}
            <h3 className="text-[11px] sm:text-[11.5px] 2xl:text-[12px] font-bold text-slate-800 tracking-tight leading-tight">
              {g.title}
            </h3>

            {/* Thick Horseshoe Gauge with bold number and / 100 */}
            <div className="my-0.5 flex items-center justify-center">
              <ThickHorseshoeGauge
                score={g.score}
                color={g.color}
                trackColor={g.trackColor}
                status={g.status}
              />
            </div>

            {/* Status Section: Bold Icon, Bold Status Label, Bold Descriptive Text */}
            <div className="flex flex-col items-center text-center space-y-0.5 w-full">
              <div
                className="flex items-center justify-center gap-1 px-1.5 py-0.5 rounded border"
                style={{
                  backgroundColor: `${g.color}15`,
                  borderColor: `${g.color}35`,
                }}
              >
                <IconComponent className="w-3 h-3 stroke-[2.5]" style={{ color: g.color }} />
                <span
                  className="text-[10px] sm:text-[10.5px] font-black tracking-tight uppercase"
                  style={{ color: g.color }}
                >
                  {g.status}
                </span>
              </div>
              <p className="text-[9.5px] sm:text-[10px] text-slate-700 font-semibold leading-tight px-0.5 truncate max-w-full">
                {g.description}
              </p>
            </div>
          </div>
        );
      })}
    </div>
  );
};
