import React from 'react';
import { Lightbulb, Target } from 'lucide-react';
import { FinancialIntelKeyTakeaway } from '../types';

interface KeyTakeawayCardProps {
  totalExposure?: number;
  keyTakeaway?: FinancialIntelKeyTakeaway;
}

export const KeyTakeawayCard: React.FC<KeyTakeawayCardProps> = ({
  totalExposure,
  keyTakeaway,
}) => {
  const exposureLakhs = keyTakeaway
    ? keyTakeaway.total_exposure_lakhs
    : totalExposure ?? 28.5;

  const rawPeriod = keyTakeaway?.period_text?.trim() || 'last 3 months';
  const displayPeriod = rawPeriod.toLowerCase().startsWith('last ') || rawPeriod.toLowerCase().startsWith('the ')
    ? rawPeriod
    : `last ${rawPeriod}`;

  // Calculate forward window text (e.g. "last 1 year" -> "next 1 year")
  const nextPeriodText = displayPeriod.toLowerCase().startsWith('last ')
    ? displayPeriod.replace(/^last\s+/i, 'next ')
    : displayPeriod.toLowerCase().startsWith('the last ')
    ? displayPeriod.replace(/^the\s+last\s+/i, 'next ')
    : `next ${displayPeriod}`;

  const reductionPercent = keyTakeaway?.reduction_percentage ?? 20;

  const savingsLakhs = keyTakeaway
    ? keyTakeaway.estimated_savings_lakhs
    : Number((exposureLakhs * (reductionPercent / 100)).toFixed(2));

  return (
    <div className="bg-white rounded-lg border border-slate-200/90 shadow-xs p-2.5 sm:p-3 flex flex-col h-full min-h-0 justify-between">
      {/* Title with Lightbulb */}
      <div className="flex flex-col flex-1 justify-start">
        <div className="flex items-center gap-1.5 pb-1 border-b border-slate-100">
          <div className="w-6 h-6 rounded-full bg-blue-50 border border-blue-100 flex items-center justify-center text-blue-600 shrink-0">
            <Lightbulb className="w-3.5 h-3.5" />
          </div>
          <h2 className="text-xs sm:text-sm font-bold text-slate-800 tracking-tight">
            Key Takeaway
          </h2>
        </div>

        {/* Highlight Stat */}
        <div className="mt-2">
          <div className="text-xl sm:text-2xl font-black text-slate-900 leading-tight">
            ₹ {exposureLakhs.toFixed(2)} Lakhs
          </div>
          <div className="text-xs text-slate-600 font-semibold mt-0.5">
            of financial exposure identified in the {displayPeriod.replace(/^the\s+/i, '')}.
          </div>
        </div>

        {/* Dynamic Opportunity Narrative */}
        {keyTakeaway?.largest_opportunity ? (
          <p className="text-xs sm:text-[12.5px] text-slate-700 mt-1.5 leading-snug font-medium">
            The largest opportunity lies in{' '}
            <span className="font-bold text-slate-900">
              {keyTakeaway.largest_opportunity}
            </span>
            {keyTakeaway.second_opportunity && (
              <>
                , followed by{' '}
                <span className="font-bold text-slate-900">
                  {keyTakeaway.second_opportunity}
                </span>
              </>
            )}
            .
          </p>
        ) : (
          <p className="text-xs sm:text-[12.5px] text-slate-700 mt-1.5 leading-snug font-medium">
            The largest opportunity lies in reducing unplanned downtime and unloaded running, followed by energy optimization.
          </p>
        )}
      </div>

      {/* Target Callout Box */}
      <div className="mt-2.5 bg-sky-50/90 border border-sky-200/90 rounded p-1.5 px-2 flex items-start gap-2 mt-auto">
        <div className="w-5 h-5 rounded-full bg-sky-600 text-white flex items-center justify-center shrink-0 mt-0.5 shadow-xs">
          <Target className="w-3 h-3" />
        </div>
        <p className="text-xs sm:text-[12px] text-sky-950 leading-snug font-semibold">
          Even a {reductionPercent}% reduction can unlock{' '}
          <span className="font-black text-sky-900">
            ~ ₹ {savingsLakhs.toFixed(2)} L
          </span>{' '}
          in value over the {nextPeriodText}.
        </p>
      </div>
    </div>
  );
};
