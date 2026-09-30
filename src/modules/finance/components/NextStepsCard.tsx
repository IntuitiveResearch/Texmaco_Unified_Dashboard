import React, { useState } from 'react';
import { CheckCircle2, Quote } from 'lucide-react';

export const NextStepsCard: React.FC = () => {
  const [completedSteps, setCompletedSteps] = useState<number[]>([]);

  const steps = [
    'Review high-opportunity assets with operations team',
    'Validate financial assumptions with Texmaco',
    'Prioritize corrective actions for downtime and unloaded running',
    'Track improvement and measure realized savings',
  ];

  const toggleStep = (idx: number) => {
    setCompletedSteps((prev) =>
      prev.includes(idx) ? prev.filter((i) => i !== idx) : [...prev, idx]
    );
  };

  return (
    <div className="bg-white rounded-lg border border-slate-200/90 shadow-xs p-2.5 sm:p-3 flex flex-col h-auto min-h-0">
      {/* Header */}
      <div>
        <div className="flex items-center gap-1.5 pb-1 border-b border-slate-100">
          <div className="w-6 h-6 rounded-full bg-emerald-50 border border-emerald-100 flex items-center justify-center text-emerald-600 shrink-0">
            <CheckCircle2 className="w-3.5 h-3.5" />
          </div>
          <h2 className="text-xs sm:text-sm font-bold text-slate-800 tracking-tight">
            Next Steps
          </h2>
        </div>

        {/* Numbered Steps */}
        <div className="mt-2 space-y-1.5">
          {steps.map((text, idx) => {
            const stepNum = idx + 1;
            const isDone = completedSteps.includes(idx);
            return (
              <div
                key={stepNum}
                onClick={() => toggleStep(idx)}
                className="flex items-start gap-2 cursor-pointer group select-none"
              >
                <div
                  className={`w-4.5 h-4.5 rounded-full flex items-center justify-center text-[10px] font-black shrink-0 mt-0.5 transition-all ${
                    isDone
                      ? 'bg-emerald-500 text-white'
                      : 'bg-[#1877f2] text-white group-hover:bg-blue-700'
                  }`}
                >
                  {isDone ? '✓' : stepNum}
                </div>
                <p className="text-xs sm:text-[12.5px] leading-snug text-slate-800 font-semibold group-hover:text-blue-600 transition-colors">
                  {text}
                </p>
              </div>
            );
          })}
        </div>
      </div>

      {/* Quote Box at Bottom */}
      <div className="mt-2.5 bg-sky-50/80 border border-sky-100 rounded p-1.5 px-2 flex items-start gap-1.5">
        <div className="text-sky-700 font-serif text-lg font-black leading-none shrink-0 select-none">
          “
        </div>
        <div className="w-full">
          <p className="text-[11px] sm:text-xs text-sky-950 font-semibold italic leading-tight">
            “Data turns machine performance into financial clarity. Clarity enables better decisions.”
          </p>
          <div className="text-[10px] text-sky-800 font-bold mt-0.5 text-right">
            — Intuitive Robotics
          </div>
        </div>
      </div>
    </div>
  );
};
