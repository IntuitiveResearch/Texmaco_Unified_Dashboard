import React, { useState } from 'react';
import { Leaf, Filter } from 'lucide-react';
import { SavingOpportunity } from '../types';

interface SavingOpportunitiesCardProps {
  opportunities: SavingOpportunity[];
}

export const SavingOpportunitiesCard: React.FC<SavingOpportunitiesCardProps> = ({
  opportunities,
}) => {
  const [filterPriority, setFilterPriority] = useState<string>('All');

  const filteredList =
    filterPriority === 'All'
      ? opportunities
      : opportunities.filter((o) => o.priority === filterPriority);

  // Helper to parse min/max lakhs from opportunity
  const parseRange = (item: SavingOpportunity): { min: number; max: number } => {
    if (typeof item.minValue === 'number' && typeof item.maxValue === 'number') {
      const min = item.minValue > 1000 ? item.minValue / 100000 : item.minValue;
      const max = item.maxValue > 1000 ? item.maxValue / 100000 : item.maxValue;
      return { min, max };
    }
    const matches = (item.estimatedValueRange || '').replace(/,/g, '').match(/\d+(?:\.\d+)?/g);
    if (!matches || matches.length === 0) return { min: 0, max: 0 };
    const nums = matches.map(Number);
    const min = nums[0] ?? 0;
    const max = nums[1] ?? nums[0] ?? 0;
    return { min, max };
  };

  // Compute total for all opportunities
  const totalAll = opportunities.reduce(
    (acc, opp) => {
      const { min, max } = parseRange(opp);
      return { min: acc.min + min, max: acc.max + max };
    },
    { min: 0, max: 0 }
  );

  // Compute total for filtered list (if priority filter applied)
  const totalFiltered = filteredList.reduce(
    (acc, opp) => {
      const { min, max } = parseRange(opp);
      return { min: acc.min + min, max: acc.max + max };
    },
    { min: 0, max: 0 }
  );

  const formatLakhsRange = (min: number, max: number): string => {
    if (min === 0 && max === 0) return '0.0 Lakhs';
    if (Math.abs(min - max) < 0.05) {
      return `${min.toFixed(1)} Lakhs`;
    }
    return `${min.toFixed(1)} – ${max.toFixed(1)} Lakhs`;
  };

  const totalAllDisplay = formatLakhsRange(totalAll.min, totalAll.max);
  const totalFilteredDisplay = formatLakhsRange(totalFiltered.min, totalFiltered.max);

  return (
    <div className="bg-white rounded-lg border border-slate-200/90 shadow-xs p-2.5 sm:p-3 flex flex-col h-full min-h-0 justify-between">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-2 pb-1.5 border-b border-slate-100">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-full bg-emerald-50 border border-emerald-100 flex items-center justify-center text-emerald-600 shrink-0">
            <Leaf className="w-4 h-4" />
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h2 className="text-xs sm:text-sm font-bold text-slate-800 tracking-tight leading-tight">
                Saving Opportunities
              </h2>
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200 shadow-2xs">
                <span className="text-[10px] uppercase font-semibold text-emerald-600 tracking-wide">Total Est:</span>
                <span className="font-black text-emerald-800">₹ {totalAllDisplay}</span>
              </span>
            </div>
            <p className="text-[11px] text-slate-500 font-medium">
              Areas where intervention can create value
            </p>
          </div>
        </div>

        {/* Priority Filter */}
        <div className="flex items-center gap-1 text-xs">
          <span className="text-slate-500 font-semibold">Filter:</span>
          {['All', 'High', 'Med', 'Low'].map((p) => {
            const actualValue = p === 'Med' ? 'Medium' : p;
            const isSelected = filterPriority === actualValue;
            return (
              <button
                key={p}
                onClick={() => setFilterPriority(actualValue)}
                className={`px-2 py-0.5 rounded cursor-pointer transition-colors text-xs font-semibold ${
                  isSelected
                    ? 'bg-slate-800 text-white font-bold'
                    : 'text-slate-600 hover:bg-slate-100'
                }`}
              >
                {p}
              </button>
            );
          })}
        </div>
      </div>

      {/* Opportunities Table */}
      <div className="mt-1.5 overflow-x-auto">
        <table className="w-full text-left text-xs">
          <thead>
            <tr className="border-b border-slate-100 text-[11px] text-slate-500 font-bold uppercase tracking-wider">
              <th className="pb-1 font-bold">Opportunity</th>
              <th className="pb-1 font-bold">Current Situation</th>
              <th className="pb-1 font-bold text-right sm:text-left">
                Est. Value (₹)
              </th>
              <th className="pb-1 font-bold text-right">Priority</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-50">
            {filteredList.map((item) => (
              <tr key={item.id} className="hover:bg-slate-50/80 transition-colors">
                <td className="py-1 pr-1.5 font-bold text-slate-800 text-xs sm:text-[12.5px]">
                  {item.opportunity}
                </td>
                <td className="py-1 pr-1.5 text-slate-600 font-medium text-xs sm:text-[12px] truncate max-w-[140px] sm:max-w-[200px]" title={item.currentSituation}>
                  {item.currentSituation}
                </td>
                <td className="py-1 pr-1.5 font-black text-slate-900 text-xs sm:text-[13px] text-right sm:text-left whitespace-nowrap">
                  {item.estimatedValueRange}
                </td>
                <td className="py-1 text-right">
                  <span
                    className={`inline-block px-2 py-0.5 rounded text-[10px] sm:text-[11px] font-bold text-white shadow-xs ${
                      item.priority === 'High'
                        ? 'bg-rose-500'
                        : item.priority === 'Medium'
                        ? 'bg-amber-500'
                        : 'bg-slate-500'
                    }`}
                  >
                    {item.priority}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr className="border-t-2 border-slate-200/90 bg-emerald-50/40">
              <td className="py-1.5 pr-1.5 font-bold text-slate-900 text-xs sm:text-[12.5px]" colSpan={2}>
                <div className="flex items-center gap-2">
                  <span className="font-extrabold text-slate-900">Total Estimated Value</span>
                  {filterPriority !== 'All' && (
                    <span className="text-[10px] font-semibold text-slate-600 bg-white border border-slate-200 px-1.5 py-0.2 rounded">
                      Filter: {filterPriority}
                    </span>
                  )}
                </div>
              </td>
              <td className="py-1.5 pr-1.5 font-black text-emerald-700 text-xs sm:text-[13px] whitespace-nowrap text-right sm:text-left">
                ₹ {filterPriority === 'All' ? totalAllDisplay : totalFilteredDisplay}
              </td>
              <td className="py-1.5 text-right">
                <span className="inline-block text-[10px] font-bold text-emerald-700 bg-emerald-100/70 px-1.5 py-0.2 rounded">
                  {filteredList.length} {filteredList.length === 1 ? 'item' : 'items'}
                </span>
              </td>
            </tr>
          </tfoot>
        </table>
      </div>
    </div>
  );
};
