import { PLANTS_DATA } from './mockData';
import type { FinancialIntelResponse } from './types';

export interface FinancialSummary {
  exposure: number;
  savings: number;
  sample: boolean;
}

// FinanceDashboardView uses this plant sample when financial intel is unavailable.
const dashboardSample = PLANTS_DATA.Kharagpur;

export function getFinancialSummary(data?: FinancialIntelResponse): FinancialSummary {
  if (!data) {
    const exposureLakhs = dashboardSample.totalExposure;
    return {
      exposure: exposureLakhs * 100000,
      savings: Number((exposureLakhs * 0.2).toFixed(2)) * 100000,
      sample: true,
    };
  }

  const exposure = data.financial_exposure.total_exposure;
  const takeaway = data.key_takeaway;
  // The Financial Dashboard's Key Takeaway uses the reported savings, or 20% of
  // its rounded exposure when the API has no takeaway.
  const reportedSavingsLakhs = takeaway?.estimated_savings_lakhs;
  const savingsLakhs = typeof reportedSavingsLakhs === 'number' && Number.isFinite(reportedSavingsLakhs)
    ? reportedSavingsLakhs
    : Number((Number((exposure / 100000).toFixed(1)) * 0.2).toFixed(2));

  return { exposure, savings: savingsLakhs * 100000, sample: false };
}
