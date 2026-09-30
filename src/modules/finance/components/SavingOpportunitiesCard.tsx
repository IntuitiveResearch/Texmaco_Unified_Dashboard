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

  return (
    <div className="bg-white rounded-lg border border-slate-200/90 shadow-xs p-2.5 sm:p-3 flex flex-col h-auto min-h-0">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-2 pb-1 border-b border-slate-100">
        <div className="flex items-center gap-1.5">
          <div className="w-6 h-6 rounded-full bg-emerald-50 border border-emerald-100 flex items-center justify-center text-emerald-600 shrink-0">
            <Leaf className="w-3.5 h-3.5" />
          </div>
          <div>
            <h2 className="text-xs sm:text-sm font-bold text-slate-800 tracking-tight leading-tight">
              Saving Opportunities
            </h2>
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
        </table>
      </div>
    </div>
  );
};
