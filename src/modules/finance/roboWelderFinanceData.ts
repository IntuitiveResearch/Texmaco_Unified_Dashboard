import { format, subMonths } from 'date-fns';

export const ROBO_FINANCE_STORAGE_KEY = 'texmaco_robo_finance_assumptions_v1';
export type RoboCostKey = 'downtime' | 'energy' | 'idle' | 'maintenance';
export type RoboCostMode = RoboCostKey | 'total';
export type RoboPriority = 'High' | 'Medium' | 'Low';

export interface RoboFinanceAssumptions {
  tariff: number;
  downtimeRate: number;
  idleRate: number;
  maintenanceRate: number;
  operatingHours: number;
  energyKwh: number;
  weldingCurrent: number;
  voltage: number;
  maintenanceEvents: number;
  cycles: number;
  downtimeHours: number;
  idleHours: number;
}

// Frontend fixtures calibrated to the reference's ₹22.36 lakh monthly costs.
// Rates and monthly energy are chosen so the displayed costs follow the inputs.
export const DEFAULT_ROBO_FINANCE_ASSUMPTIONS: RoboFinanceAssumptions = {
  tariff: 8.5,
  downtimeRate: 274000 / 37.1,
  idleRate: 1492000 / 198.6,
  maintenanceRate: 118000 / 12,
  operatingHours: 720,
  energyKwh: 352000 / 8.5,
  weldingCurrent: 27.3,
  voltage: 400,
  maintenanceEvents: 12,
  cycles: 8226,
  downtimeHours: 37.1,
  idleHours: 198.6,
};

export const ROBO_COST_CATEGORIES: { key: RoboCostKey; name: string; color: string; action: string }[] = [
  { key: 'downtime', name: 'Downtime', color: '#f62f52', action: 'reducing unplanned downtime' },
  { key: 'energy', name: 'Energy Consumption', color: '#00b894', action: 'optimizing energy consumption' },
  { key: 'idle', name: 'Idle / Unproductive', color: '#f59b06', action: 'eliminating idle running' },
  { key: 'maintenance', name: 'Maintenance', color: '#2179f4', action: 'preventing maintenance failures' },
];

export interface RoboFinanceMonth {
  month: string;
  monthKey: string;
  downtime: number;
  energy: number;
  idle: number;
  maintenance: number;
  total: number;
  downtimeHours: number;
  idleHours: number;
  energyKwh: number;
  maintenanceEvents: number;
}

export interface RoboSavingOpportunity {
  id: string;
  name: string;
  situation: string;
  min: number;
  max: number;
  priority: RoboPriority;
}

export function validateRoboAssumptions(value: unknown): value is RoboFinanceAssumptions {
  if (!value || typeof value !== 'object') return false;
  const candidate = value as Record<string, unknown>;
  if (!Object.keys(DEFAULT_ROBO_FINANCE_ASSUMPTIONS).every((key) => typeof candidate[key] === 'number' && Number.isFinite(candidate[key]) && Number(candidate[key]) >= 0 && Number(candidate[key]) <= 1000000000)) return false;
  return Number(candidate.operatingHours) > 0 && Number.isInteger(candidate.maintenanceEvents) && Number.isInteger(candidate.cycles);
}

export function readRoboFinanceAssumptions(): RoboFinanceAssumptions {
  try {
    const saved = localStorage.getItem(ROBO_FINANCE_STORAGE_KEY);
    const parsed: unknown = saved ? JSON.parse(saved) : null;
    if (validateRoboAssumptions(parsed)) return { ...DEFAULT_ROBO_FINANCE_ASSUMPTIONS, ...parsed };
  } catch { /* Use the default preview if browser storage is unavailable. */ }
  return { ...DEFAULT_ROBO_FINANCE_ASSUMPTIONS };
}

export function formatRoboNumber(value: number, decimals = 1) {
  return value.toLocaleString('en-IN', { maximumFractionDigits: decimals });
}

export function formatRoboLakhs(value: number, decimals = 2) {
  return `₹ ${(value / 100000).toFixed(decimals)}`;
}

export function calculateRoboFinance(assumptions: RoboFinanceAssumptions, timeRange: string, now: Date) {
  const count = ({ '1m': 1, '3m': 3, '6m': 6, '1y': 12 } as Record<string, number>)[timeRange] || 1;
  const profiles = [.82, .91, .88, 1.03, .97, 1.08, .88, 1.01, 1.12, .94, 1.08, 1];
  const months: RoboFinanceMonth[] = Array.from({ length: 12 }, (_, index) => {
    const date = subMonths(now, 11 - index);
    const factor = profiles[index];
    const downtimeHours = assumptions.downtimeHours * factor;
    const idleHours = assumptions.idleHours * factor;
    const energyKwh = assumptions.energyKwh * factor;
    const maintenanceEvents = Math.round(assumptions.maintenanceEvents * factor);
    const downtime = downtimeHours * assumptions.downtimeRate;
    const energy = energyKwh * assumptions.tariff;
    const idle = idleHours * assumptions.idleRate;
    const maintenance = maintenanceEvents * assumptions.maintenanceRate;
    return { month: format(date, 'MMM'), monthKey: format(date, 'yyyy-MM'), downtime, energy, idle, maintenance, total: downtime + energy + idle + maintenance, downtimeHours, idleHours, energyKwh, maintenanceEvents };
  });
  const selected = months.slice(-count);
  const sum = (key: keyof Pick<RoboFinanceMonth, 'downtime' | 'energy' | 'idle' | 'maintenance' | 'total' | 'downtimeHours' | 'idleHours' | 'energyKwh' | 'maintenanceEvents'>) => selected.reduce((total, month) => total + month[key], 0);
  const costs = { downtime: sum('downtime'), energy: sum('energy'), idle: sum('idle'), maintenance: sum('maintenance') };
  const total = sum('total');
  const categories = ROBO_COST_CATEGORIES.map((category) => ({ ...category, amount: costs[category.key], percentage: total > 0 ? costs[category.key] / total * 100 : 0 }));
  const ranked = [...categories].sort((left, right) => right.amount - left.amount);
  const periodUnit = count === 1 ? 'month' : `${count} months`;
  const downtimeHours = sum('downtimeHours');
  const idleHours = sum('idleHours');
  const energyKwh = sum('energyKwh');
  const maintenanceEvents = sum('maintenanceEvents');
  const opportunities: RoboSavingOpportunity[] = [
    { id: 'idle', name: 'Eliminate idle running', situation: `${formatRoboNumber(idleHours)} hrs / ${periodUnit}`, min: costs.idle * .4, max: costs.idle * .533, priority: 'High' },
    { id: 'downtime', name: 'Reduce unplanned downtime', situation: `${formatRoboNumber(downtimeHours)} hrs / ${periodUnit}`, min: costs.downtime * .675, max: costs.downtime, priority: 'Medium' },
    { id: 'energy', name: 'Optimize energy consumption', situation: `${formatRoboNumber(energyKwh)} kWh / ${periodUnit}`, min: costs.energy * .1, max: costs.energy * .2, priority: 'Medium' },
    { id: 'maintenance', name: 'Prevent maintenance failures', situation: `${formatRoboNumber(maintenanceEvents, 0)} events / ${periodUnit}`, min: costs.maintenance * .34, max: costs.maintenance * .68, priority: 'Low' },
    { id: 'utilization', name: 'Improve asset utilization', situation: '+15% productive time', min: total * .15 * .9, max: total * .15 * 1.25, priority: 'High' },
  ];
  return { count, periodUnit, periodText: count === 1 ? 'last 1 month' : count === 12 ? 'last 1 year' : `last ${count} months`, costs, total, categories, ranked, opportunities, downtimeHours, idleHours, energyKwh, maintenanceEvents, months, trend: months.slice(-(count === 12 ? 12 : 6)) };
}

export type RoboFinanceModel = ReturnType<typeof calculateRoboFinance>;
