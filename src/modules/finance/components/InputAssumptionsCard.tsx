import React, { useState } from 'react';
import { Settings, Edit2, CloudUpload, Loader2, CheckCircle2, Cpu } from 'lucide-react';
import { FinancialAssumption, AssetOption } from '../types';
import { AssumptionEditModal } from './AssumptionEditModal';

interface InputAssumptionsCardProps {
  selectedAsset: AssetOption;
  assumptions: FinancialAssumption[];
  onUpdateAssumptions: (updated: FinancialAssumption[]) => void;
  onSaveToApi: (updated: FinancialAssumption[]) => Promise<{ success: boolean; message?: string; asset?: string }>;
  onResetAssumptions: () => void;
}

export const InputAssumptionsCard: React.FC<InputAssumptionsCardProps> = ({
  selectedAsset,
  assumptions,
  onUpdateAssumptions,
  onSaveToApi,
  onResetAssumptions,
}) => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isQuickSaving, setIsQuickSaving] = useState(false);
  const [quickSaveFeedback, setQuickSaveFeedback] = useState<string | null>(null);

  const handleQuickSave = async () => {
    setIsQuickSaving(true);
    setQuickSaveFeedback(null);
    try {
      const result = await onSaveToApi(assumptions);
      if (result.success) {
        setQuickSaveFeedback(`Saved: ${result.asset || selectedAsset.asset}`);
        setTimeout(() => setQuickSaveFeedback(null), 4000);
      }
    } finally {
      setIsQuickSaving(false);
    }
  };

  return (
    <>
      <div className="bg-white rounded-lg border border-slate-200/90 shadow-xs p-2.5 sm:p-3 flex flex-col h-full min-h-0 justify-between">
        {/* Header with Title & Action Buttons */}
        <div className="flex items-center justify-between pb-1 border-b border-slate-100">
            <div className="flex items-center gap-1.5">
              <div className="w-6 h-6 rounded-full bg-blue-50 border border-blue-100 flex items-center justify-center text-blue-600 shrink-0">
                <Settings className="w-3.5 h-3.5" />
              </div>
              <div>
                <h2 className="text-xs sm:text-sm font-bold text-slate-800 tracking-tight flex items-center gap-1">
                  Input Assumptions
                </h2>
                <div className="flex items-center gap-1 text-[11px] text-slate-500">
                  <Cpu className="w-3 h-3 text-cyan-600" />
                  <span className="font-bold text-slate-700">{selectedAsset.name}</span>
                </div>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex items-center gap-1.5">
              {/* Quick Save to API button */}
              <button
                type="button"
                onClick={handleQuickSave}
                disabled={isQuickSaving}
                title={`POST assumptions for ${selectedAsset.name} to AWS API`}
                className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded bg-blue-50 hover:bg-blue-100 border border-blue-200 text-xs font-bold text-blue-700 transition-colors cursor-pointer disabled:opacity-50"
              >
                {isQuickSaving ? (
                  <Loader2 className="w-3 h-3 animate-spin text-blue-600" />
                ) : (
                  <CloudUpload className="w-3.5 h-3.5 text-blue-600" />
                )}
                <span>Save</span>
              </button>

              {/* Edit Modal Button */}
              <button
                type="button"
                onClick={() => setIsModalOpen(true)}
                className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded border border-slate-200 text-xs font-bold text-slate-700 hover:bg-slate-50 hover:text-blue-600 transition-colors cursor-pointer"
              >
                <Edit2 className="w-3 h-3 text-slate-500" />
                <span>Edit</span>
              </button>
            </div>
          </div>

          {/* Quick Save Feedback Banner */}
          {quickSaveFeedback && (
            <div className="mt-1 py-1 px-2 bg-emerald-50 border border-emerald-200 rounded text-xs text-emerald-800 flex items-center gap-1.5 animate-in fade-in">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
              <span className="font-semibold truncate">{quickSaveFeedback}</span>
            </div>
          )}

          {/* Two-Column Tinted Assumption Zones */}
          {(() => {
            const leftColumnIds = new Set(['tariff', 'downtime_cost', 'spares_cost', 'operating_hours']);
            const hasKnownIds = assumptions.some((a) => leftColumnIds.has(a.id));

            const leftAssumptions = hasKnownIds
              ? assumptions.filter((item) => leftColumnIds.has(item.id))
              : assumptions.slice(0, Math.ceil(assumptions.length / 2));

            const rightAssumptions = hasKnownIds
              ? assumptions.filter((item) => !leftColumnIds.has(item.id))
              : assumptions.slice(Math.ceil(assumptions.length / 2));

            return (
              <div className="mt-2 grid grid-cols-1 sm:grid-cols-2 gap-2 sm:gap-2.5 items-stretch flex-1 min-h-0">
                {/* LEFT COLUMN: Very light subtle cool blue tint */}
                <div className="bg-[#F4F8FF] border border-[#DCE9FA] rounded-lg p-2 sm:p-2.5 flex flex-col justify-between flex-1 h-full min-h-0">
                  <div className="flex flex-col justify-around flex-1 h-full">
                    {leftAssumptions.map((item) => (
                      <div
                        key={item.id}
                        className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-x-3 text-xs py-1.5 sm:py-2 border-b border-[#E2EEFC] last:border-b-0 min-w-0"
                      >
                        <span
                          className="text-slate-700 font-medium text-[11px] sm:text-xs leading-tight min-w-0 text-left"
                          title={item.label}
                        >
                          {item.label}
                        </span>
                        <span className="text-slate-900 font-bold text-[11px] sm:text-xs whitespace-nowrap text-right justify-self-end tabular-nums pl-1">
                          {item.value}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* RIGHT COLUMN: Very light subtle light green/teal tint */}
                <div className="bg-[#F3FAF7] border border-[#DCF1EA] rounded-lg p-2 sm:p-2.5 flex flex-col justify-between flex-1 h-full min-h-0">
                  <div className="flex flex-col justify-around flex-1 h-full">
                    {rightAssumptions.map((item) => (
                      <div
                        key={item.id}
                        className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-x-3 text-xs py-1.5 sm:py-2 border-b border-[#E0F2EB] last:border-b-0 min-w-0"
                      >
                        <span
                          className="text-slate-700 font-medium text-[11px] sm:text-xs leading-tight min-w-0 text-left"
                          title={item.label}
                        >
                          {item.label}
                        </span>
                        <span className="text-slate-900 font-bold text-[11px] sm:text-xs whitespace-nowrap text-right justify-self-end tabular-nums pl-1">
                          {item.value}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            );
          })()}
      </div>

      {/* Edit Modal with API Save capability */}
      <AssumptionEditModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        selectedAsset={selectedAsset}
        assumptions={assumptions}
        onSave={onUpdateAssumptions}
        onSaveToApi={onSaveToApi}
        onReset={onResetAssumptions}
      />
    </>
  );
};
