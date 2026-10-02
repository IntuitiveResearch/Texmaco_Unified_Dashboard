export interface KpiMetric {
  id: string;
  title: string;
  value: string; // e.g. "₹ 12.8 Lakhs"
  amountLakhs: number;
  subtext: string;
  trendText: string;
  trendDirection: 'up' | 'down';
  trendPositive: boolean; // whether "up" is good or bad (e.g. cost up = bad, capacity up = good)
  color: 'red' | 'green' | 'amber' | 'blue';
  icon: string;
}

export interface CostCategory {
  id: string;
  name: string;
  percentage: number;
  amountLakhs: number;
  color: string;
  bgFill: string;
}

export interface MonthlyTrendData {
  month: string;
  total: number;
  downtimeLoss: number;
  energyWaste: number;
  idleCost: number;
  maintenance: number;
  other?: number;
}

export interface SavingOpportunity {
  id: string;
  opportunity: string;
  currentSituation: string;
  estimatedValueRange: string;
  priority: 'High' | 'Medium' | 'Low';
  minValue?: number;
  maxValue?: number;
}

export interface FinancialAssumption {
  id: string;
  label: string;
  value: string;
  rawNumber: number;
  unit: string;
}

export interface AssetOption {
  name: string;
  asset: string;
  asset_type: string;
}

export type TrendViewMode = 'Total' | 'Downtime' | 'Energy' | 'Maintenance';

export interface PlantData {
  name: string;
  totalExposure: number;
  downtimeHours: number;
  kpis: KpiMetric[];
  costCategories: CostCategory[];
  trendData: MonthlyTrendData[];
  savingOpportunities: SavingOpportunity[];
  keyTakeaway?: FinancialIntelKeyTakeaway;
}

export interface FinancialIntelKeyTakeaway {
  total_exposure: number;
  total_exposure_lakhs: number;
  period_text: string;
  largest_opportunity: string;
  second_opportunity?: string;
  reduction_percentage: number;
  estimated_savings: number;
  estimated_savings_lakhs: number;
}

export interface FinancialIntelPeriod {
  range: string;
  start_date: string;
  end_date: string;
  selected_days: number;
  data_days: number;
  data_complete: boolean;
  calculation_days: number;
}

export interface FinancialIntelOperational {
  records_found: number;
  data_days: number;
  downtime_hours: number;
  unloaded_hours: number;
  idle_hours: number;
  financial_unproductive_hours: number;
  financial_unproductive_type: string;
}

export interface FinancialIntelExposure {
  downtime_cost: number;
  energy_waste_kwh: number;
  energy_waste_cost: number;
  idle_unproductive_cost: number;
  maintenance_cost: number;
  production_capacity_opportunity: number;
  total_exposure: number;
}

export interface FinancialIntelCostDistribution {
  category: string;
  value: number;
  percentage: number;
}

export interface FinancialIntelSavingOpportunity {
  name: string;
  current_value: number;
  current_unit: string;
  time_type?: string;
  estimated_min_value: number;
  estimated_max_value: number;
  saving_range: string;
  priority_score: number;
  priority_rank: number;
  priority: 'HIGH' | 'MEDIUM' | 'LOW' | string;
}

export interface FinancialIntelTrend {
  month: string;
  month_key: string;
  data_days: number;
  downtime_cost: number;
  energy_waste_kwh: number;
  energy_waste_cost: number;
  idle_unproductive_cost: number;
  maintenance_cost: number;
  total_exposure: number;
}

export interface FinancialIntelResponse {
  asset: string;
  asset_type: string;
  period: FinancialIntelPeriod;
  operational: FinancialIntelOperational;
  financial_exposure: FinancialIntelExposure;
  cost_distribution: FinancialIntelCostDistribution[];
  saving_opportunities: FinancialIntelSavingOpportunity[];
  financial_exposure_trend: FinancialIntelTrend[];
  key_takeaway?: FinancialIntelKeyTakeaway;
  message?: string;
}
