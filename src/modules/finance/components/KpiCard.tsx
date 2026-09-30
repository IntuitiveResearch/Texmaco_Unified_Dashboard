import React from 'react';
import { Clock, Zap, Settings, Wrench, TrendingUp, IndianRupee, CircleDollarSign } from 'lucide-react';
import { KpiMetric } from '../types';

interface KpiCardProps {
  kpi: KpiMetric;
}

export const KpiCard: React.FC<KpiCardProps> = ({ kpi }) => {
  const renderIcon = () => {
    const iconClass = "w-3.5 h-3.5 3xl:w-4.5 3xl:h-4.5 4xl:w-5.5 4xl:h-5.5";
    switch (kpi.icon) {
      case 'Clock':
        return <Clock className={`${iconClass} text-rose-600`} />;
      case 'Zap':
        return <Zap className={`${iconClass} text-emerald-600`} />;
      case 'Settings':
        return <Settings className={`${iconClass} text-amber-600`} />;
      case 'Wrench':
        return <Wrench className={`${iconClass} text-rose-600`} />;
      case 'TrendingUp':
        return <TrendingUp className={`${iconClass} text-sky-600`} />;
      case 'IndianRupee':
        return <IndianRupee className={`${iconClass} text-blue-600`} />;
      case 'CircleDollarSign':
        return <CircleDollarSign className={`${iconClass} text-blue-600`} />;
      default:
        return <IndianRupee className={`${iconClass} text-blue-600`} />;
    }
  };

  const getIconContainerStyle = () => {
    switch (kpi.color) {
      case 'red':
        return 'bg-rose-50 border-rose-100';
      case 'green':
        return 'bg-emerald-50 border-emerald-100';
      case 'amber':
        return 'bg-amber-50 border-amber-100';
      case 'blue':
        return 'bg-sky-50 border-sky-100';
      default:
        return 'bg-slate-50 border-slate-100';
    }
  };

  const getValueColor = () => {
    switch (kpi.color) {
      case 'red':
        return 'text-rose-700';
      case 'green':
        return 'text-emerald-700';
      case 'amber':
        return 'text-amber-800';
      case 'blue':
        return 'text-sky-700';
      default:
        return 'text-slate-900';
    }
  };

  return (
    <div className="bg-white rounded-lg border border-slate-200/90 shadow-xs p-2.5 sm:p-3 flex flex-col justify-start h-auto min-h-0 hover:shadow-md transition-shadow">
      {/* Top row: Icon + Title */}
      <div className="flex items-center gap-2">
        <div className={`w-6 h-6 sm:w-7 sm:h-7 rounded-full border flex items-center justify-center shrink-0 ${getIconContainerStyle()}`}>
          {renderIcon()}
        </div>
        <span className="text-xs sm:text-[13px] font-bold text-slate-800 leading-tight truncate" title={kpi.title}>
          {kpi.title}
        </span>
      </div>

      {/* Main Value & Subtext */}
      <div className="mt-1.5">
        <div className={`text-xl sm:text-2xl font-black tracking-tight leading-tight ${getValueColor()}`}>
          {kpi.value}
        </div>
        {kpi.subtext && (
          <div className="text-[11px] sm:text-xs text-slate-600 font-semibold mt-0.5 leading-tight truncate" title={kpi.subtext}>
            {kpi.subtext}
          </div>
        )}
      </div>
    </div>
  );
};
