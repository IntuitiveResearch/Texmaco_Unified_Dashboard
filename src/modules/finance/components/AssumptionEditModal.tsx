import React, { useState, useEffect } from 'react';
import { X, Check, RotateCcw, CloudUpload, Loader2, AlertCircle, CheckCircle2 } from 'lucide-react';
import { FinancialAssumption, AssetOption } from '../types';

interface AssumptionEditModalProps {
  isOpen: boolean;
  onClose: () => void;
  selectedAsset: AssetOption;
  assumptions: FinancialAssumption[];
  onSave: (updated: FinancialAssumption[]) => void;
  onSaveToApi: (updated: FinancialAssumption[]) => Promise<{ success: boolean; message?: string; asset?: string }>;
  onReset: () => void;
}

export const AssumptionEditModal: React.FC<AssumptionEditModalProps> = ({
  isOpen,
  onClose,
  selectedAsset,
  assumptions,
  onSave,
  onSaveToApi,
  onReset,
}) => {
  const [formData, setFormData] = useState<FinancialAssumption[]>(assumptions);
  const [isSaving, setIsSaving] = useState(false);
  const [saveStatus, setSaveStatus] = useState<{
    type: 'idle' | 'success' | 'error';
    message?: string;
    asset?: string;
  }>({ type: 'idle' });

  // Sync form data whenever modal opens or assumptions prop changes
  useEffect(() => {
    if (isOpen) {
      setFormData(assumptions);
      setSaveStatus({ type: 'idle' });
      setIsSaving(false);
    }
  }, [isOpen, assumptions]);

  if (!isOpen) return null;

  const handleChange = (id: string, newRawNumber: number) => {
    setFormData((prev) =>
      prev.map((item) => {
        if (item.id === id) {
          let formattedVal = '';
          if (item.unit.includes('kWh')) {
            formattedVal = `₹ ${newRawNumber} / kWh`;
          } else if (item.unit.includes('hour') && !item.unit.includes('hours / month')) {
            formattedVal = `₹ ${newRawNumber.toLocaleString('en-IN')} / hour`;
          } else if (item.unit.includes('event')) {
            formattedVal = `₹ ${newRawNumber.toLocaleString('en-IN')} / event`;
          } else if (item.unit.includes('hours / month')) {
            formattedVal = `${newRawNumber} hours / month`;
          } else if (item.unit.includes('/ month')) {
            formattedVal = `${newRawNumber} / month`;
          } else {
            formattedVal = `${newRawNumber}`;
          }

          return {
            ...item,
            rawNumber: newRawNumber,
            value: formattedVal,
          };
        }
        return item;
      })
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    setSaveStatus({ type: 'idle' });

    try {
      // First update state locally
      onSave(formData);

      // Next perform POST request to AWS API endpoint
      const result = await onSaveToApi(formData);
      if (result.success) {
        setSaveStatus({
          type: 'success',
          message: result.message || 'Financial assumptions saved successfully.',
          asset: result.asset || selectedAsset.asset,
        });
        setTimeout(() => {
          onClose();
        }, 1200);
      } else {
        setSaveStatus({
          type: 'error',
          message: result.message || 'Failed to save assumptions to API endpoint.',
        });
      }
    } catch (err: any) {
      setSaveStatus({
        type: 'error',
        message: err.message || 'Network error while contacting AWS API Gateway.',
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handleReset = () => {
    onReset();
    setSaveStatus({ type: 'idle' });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 animate-in fade-in duration-200">
      <div className="bg-white rounded-xl shadow-2xl border border-slate-200 w-full max-w-lg 3xl:max-w-xl 4xl:max-w-2xl overflow-hidden flex flex-col max-h-[90vh]">
        
        {/* Modal Header */}
        <div className="flex items-center justify-between px-6 py-4 3xl:px-8 3xl:py-5 border-b border-slate-100 bg-slate-50/70">
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-base 3xl:text-xl 4xl:text-2xl font-bold text-slate-800">
                Update Financial Assumptions
              </h3>
              <span className="text-[11px] 3xl:text-xs font-bold px-2 py-0.5 rounded bg-blue-100 text-blue-800 border border-blue-200">
                {selectedAsset.name}
              </span>
            </div>
            <p className="text-xs 3xl:text-sm text-slate-500 mt-0.5 flex items-center gap-1.5">
              <span>Target Asset:</span>
              <code className="text-[11px] 3xl:text-xs bg-slate-200/80 px-1 py-0.2 rounded text-slate-700 font-mono">
                {selectedAsset.asset}
              </code>
              <span className="text-slate-400">({selectedAsset.asset_type})</span>
            </p>
          </div>
          <button
            onClick={onClose}
            disabled={isSaving}
            className="p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5 3xl:w-6 3xl:h-6" />
          </button>
        </div>

        {/* Modal Form Content */}
        <form onSubmit={handleSubmit} className="flex-1 flex flex-col overflow-hidden">
          
          {/* Status Message Banner if any */}
          {saveStatus.type === 'success' && (
            <div className="mx-6 mt-4 p-3 3xl:p-4 rounded-lg bg-emerald-50 border border-emerald-200 text-xs 3xl:text-sm text-emerald-800 flex items-start gap-2 animate-in fade-in">
              <CheckCircle2 className="w-4 h-4 3xl:w-5 3xl:h-5 text-emerald-600 shrink-0 mt-0.5" />
              <div>
                <p className="font-semibold">{saveStatus.message}</p>
                {saveStatus.asset && (
                  <p className="text-[11px] 3xl:text-xs text-emerald-700 mt-0.5">
                    Saved asset: <span className="font-mono font-medium">{saveStatus.asset}</span>
                  </p>
                )}
              </div>
            </div>
          )}

          {saveStatus.type === 'error' && (
            <div className="mx-6 mt-4 p-3 3xl:p-4 rounded-lg bg-rose-50 border border-rose-200 text-xs 3xl:text-sm text-rose-800 flex items-start gap-2 animate-in fade-in">
              <AlertCircle className="w-4 h-4 3xl:w-5 3xl:h-5 text-rose-600 shrink-0 mt-0.5" />
              <div>
                <p className="font-semibold">Save failed</p>
                <p className="text-[11px] 3xl:text-xs text-rose-700 mt-0.5">{saveStatus.message}</p>
              </div>
            </div>
          )}

          <div className="px-6 py-4 3xl:px-8 3xl:py-6 space-y-3.5 3xl:space-y-5 overflow-y-auto flex-1">
            {formData.map((item) => (
              <div key={item.id} className="flex flex-col gap-1">
                <label className="text-xs 3xl:text-sm font-semibold text-slate-700 flex justify-between">
                  <span>{item.label}</span>
                  <span className="text-slate-400 font-normal text-[11px] 3xl:text-xs">{item.unit}</span>
                </label>
                <div className="relative flex items-center">
                  <input
                    type="number"
                    step={item.id === 'tariff' ? '0.1' : item.id === 'maint_events' ? '1' : '100'}
                    value={item.rawNumber}
                    onChange={(e) => handleChange(item.id, parseFloat(e.target.value) || 0)}
                    disabled={isSaving}
                    className="w-full rounded-lg border border-slate-300 px-3 py-1.5 3xl:py-2.5 text-sm 3xl:text-base text-slate-900 font-medium focus:border-blue-500 focus:ring-1 focus:ring-blue-500 focus:outline-none"
                  />
                  <span className="absolute right-3 text-xs 3xl:text-sm text-slate-400 pointer-events-none">
                    {item.value}
                  </span>
                </div>
              </div>
            ))}
          </div>

          {/* Modal Footer */}
          <div className="px-6 py-3.5 3xl:px-8 3xl:py-4 bg-slate-50 border-t border-slate-100 flex items-center justify-between shrink-0">
            <button
              type="button"
              onClick={handleReset}
              disabled={isSaving}
              className="inline-flex items-center gap-1.5 text-xs 3xl:text-sm font-semibold text-slate-500 hover:text-rose-600 transition-colors cursor-pointer disabled:opacity-50"
            >
              <RotateCcw className="w-3.5 h-3.5 3xl:w-4 3xl:h-4" />
              Reset Defaults
            </button>

            <div className="flex items-center gap-2 3xl:gap-3">
              <button
                type="button"
                onClick={onClose}
                disabled={isSaving}
                className="px-3.5 py-1.5 3xl:px-5 3xl:py-2.5 rounded-lg border border-slate-300 text-xs 3xl:text-sm font-semibold text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isSaving}
                className="inline-flex items-center gap-1.5 px-4 py-1.5 3xl:px-5 3xl:py-2.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-xs 3xl:text-sm font-semibold text-white shadow-xs transition-colors cursor-pointer disabled:opacity-75"
              >
                {isSaving ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Saving to API...</span>
                  </>
                ) : (
                  <>
                    <CloudUpload className="w-4 h-4 3xl:w-5 3xl:h-5" />
                    <span>Save Assumptions</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};
