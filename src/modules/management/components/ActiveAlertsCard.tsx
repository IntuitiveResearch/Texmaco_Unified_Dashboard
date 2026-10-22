import React from 'react';
import { AlertTriangle, Bell, Info } from 'lucide-react';
import { DashboardSummary, ThermalRates } from '../types';
import { formatPercent } from '../utils';
import { cn } from './KPICard';

interface Props {
  summary: DashboardSummary;
  thermalRates: ThermalRates[];
  isCncOrRobo?: boolean;
  avgUtilization?: number;
  className?: string;
}

export interface ManagementAlert {
  title: string;
  message: string;
  severity: 'HIGH' | 'MEDIUM';
}

export function getManagementAlerts(summary: DashboardSummary, thermalRates: ThermalRates[], isCncOrRobo = false, avgUtilization = summary.avg_utilization ?? 0): ManagementAlert[] {
  if (isCncOrRobo) {
    return [{
      title: 'Availability vs Utilization',
      message: `Availability is ${formatPercent(summary.availability)} but utilization is ${avgUtilization.toFixed(1)}%.`,
      severity: 'MEDIUM'
    }];
  }

  const alerts: ManagementAlert[] = [];

  // High Temperature
  if (summary.high_temperature_events > 0 || summary.maximum_temperature >= 90) {
    alerts.push({
      title: 'High Temperature',
      message: `Compressor temperature reached ${summary.maximum_temperature.toFixed(1)}°C, with ${summary.high_temperature_events.toLocaleString()} high-temperature events.`,
      severity: summary.maximum_temperature >= 95 ? 'HIGH' : 'MEDIUM'
    });
  }

  // Interruption frequency / trips
  if (summary.trip_count >= 15 || summary.restart_count >= 20) {
    alerts.push({
      title: 'Elevated Interruption Frequency',
      message: `${summary.trip_count.toLocaleString()} interruptions recorded. MTBF is ${(summary.mtbi_seconds / 3600).toFixed(1)} h.`,
      severity: summary.trip_count >= 30 ? 'HIGH' : 'MEDIUM'
    });
  }

  // Low availability
  if (summary.availability < 70 && summary.availability > 0) {
    alerts.push({
      title: 'Low Availability',
      message: `Availability is at ${summary.availability.toFixed(1)}%, with ${(summary.downtime_seconds / 3600).toFixed(1)} h of total downtime.`,
      severity: summary.availability < 50 ? 'HIGH' : 'MEDIUM'
    });
  }

  // Cooling Inefficiency
  const avgCoolingRate = thermalRates.length > 0
    ? thermalRates.reduce((sum, r) => sum + (r.cooling_rate || 0), 0) / thermalRates.length
    : summary.average_temperature_fall;
  if (avgCoolingRate > 0 && avgCoolingRate < 0.05) {
    alerts.push({
      title: 'Cooling Inefficiency',
      message: `Cooling rate is sluggish at ${avgCoolingRate.toFixed(3)}°C/s, suggesting degraded heat exchanger performance.`,
      severity: 'MEDIUM'
    });
  }

  return alerts;
}

export function ActiveAlertsCard({ summary, thermalRates, isCncOrRobo = false, avgUtilization, className }: Props) {
  const alerts = getManagementAlerts(summary, thermalRates, isCncOrRobo, avgUtilization);
  const alertCount = alerts.length;

  return (
    <div className={cn(
      "bg-[var(--panel)] border border-[var(--line)] rounded-[10px] 2xl:rounded-[12px] p-2 2xl:p-2.5 flex flex-col relative shadow-[0_2px_8px_var(--shadow)] overflow-hidden",
      className
    )}>
      <div className="mb-1.5 flex items-center justify-between gap-2">
        <h3 className="text-[11px] 2xl:text-[11.5px] text-[var(--text)] font-semibold tracking-[0.4px] uppercase m-0 leading-tight flex items-center gap-1.5">
          {alertCount > 0 ? <AlertTriangle size={14} className="text-[var(--coral)]" /> : <Bell size={14} />}
          <span>Management Attention</span>
        </h3>
        <div className="text-[10.5px] text-[var(--muted)]">
          {alertCount > 0 ? (
            <span className="px-1.5 py-0.2 rounded bg-[color-mix(in_srgb,var(--coral)_14%,transparent)] text-[var(--coral)] font-semibold text-[9.5px]">
              {alertCount} alert{alertCount > 1 ? 's' : ''}
            </span>
          ) : (
            'All clear'
          )}
        </div>
      </div>
      
      <div className="flex-1 min-h-0 overflow-y-auto max-h-[165px] pr-1 space-y-1.5">
        {alertCount === 0 ? (
          <div className="h-full min-h-[90px] flex flex-col items-center justify-center text-[11px] text-[var(--muted)] gap-1 text-center p-2 rounded-lg bg-[var(--panel2)] border border-[var(--line)]">
            <Info size={16} className="opacity-50 text-[var(--emerald)]" />
            <span className="font-medium text-[var(--text)]">No Critical Alerts</span>
            <span className="text-[10px] opacity-75">All operational parameters within expected thresholds.</span>
          </div>
        ) : (
          alerts.map((alert, idx) => (
            <div key={idx} className="p-1.5 2xl:p-2 rounded-[8px] bg-[var(--panel2)] border border-[var(--line)] flex items-start gap-2 relative overflow-hidden">
              <div 
                className="absolute top-0 left-0 w-[3px] h-full"
                style={{ backgroundColor: alert.severity === 'HIGH' ? 'var(--coral)' : 'var(--amber)' }}
              />
              <div className="w-6 h-6 rounded-full flex items-center justify-center shrink-0 ml-0.5 border mt-0.5"
                style={{
                  color: alert.severity === 'HIGH' ? 'var(--coral)' : 'var(--amber)',
                  borderColor: alert.severity === 'HIGH' ? 'color-mix(in srgb, var(--coral) 35%, transparent)' : 'color-mix(in srgb, var(--amber) 35%, transparent)',
                  backgroundColor: alert.severity === 'HIGH' ? 'color-mix(in srgb, var(--coral) 10%, transparent)' : 'color-mix(in srgb, var(--amber) 10%, transparent)'
                }}
              >
                <AlertTriangle size={12} />
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center justify-between gap-1 mb-0.5">
                  <div className="font-semibold text-[12px] text-[var(--text)] leading-tight truncate">{alert.title}</div>
                  <span 
                    className="text-[9px] font-bold uppercase tracking-[0.4px] px-1.5 py-0.2 rounded shrink-0"
                    style={{
                      backgroundColor: alert.severity === 'HIGH' ? 'color-mix(in srgb, var(--coral) 15%, transparent)' : 'color-mix(in srgb, var(--amber) 15%, transparent)',
                      color: alert.severity === 'HIGH' ? 'var(--coral)' : 'var(--amber)'
                    }}
                  >
                    {alert.severity}
                  </span>
                </div>
                <div className="text-[10.5px] text-[var(--muted)] leading-[1.3] line-clamp-2">
                  {alert.message}
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
