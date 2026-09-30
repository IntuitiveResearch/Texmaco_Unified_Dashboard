import {
  CheckCircle2,
  BarChart2,
  BarChart3,
  Clock,
  Clock3,
  CircleOff,
  Gauge,
  Timer,
  Calendar,
  Activity,
  PieChart,
  PauseCircle,
  ScanLine,
  Power,
  Zap,
} from 'lucide-react';
import { KpiMetrics, DateRangePreset } from '../types';
import { WeldingOperationalSummary } from '../services/weldingService';

interface OperationalSummaryProps {
  kpis: KpiMetrics;
  selectedRange?: DateRangePreset;
  onSelectRange?: (preset: DateRangePreset) => void;
  isRobo?: boolean;
  weldingSummary?: WeldingOperationalSummary;
  weldingPeriod?: string;
}

export const OperationalSummary: React.FC<OperationalSummaryProps> = ({
  kpis,
  selectedRange = '30days',
  isRobo = false,
  weldingSummary,
  weldingPeriod,
}) => {
  // Format helpers
  const formatSecToHours = (sec: number) => {
    const hours = (sec / 3600).toFixed(2);
    return `${hours} hrs`;
  };

  const totalOperatingHours = kpis.loaded_hours + kpis.unloaded_hours;
  const loadTimePct =
    totalOperatingHours > 0
      ? (kpis.loaded_hours / totalOperatingHours) * 100
      : kpis.load_pct || 49.45;
  const unloadTimePct =
    totalOperatingHours > 0
      ? (kpis.unloaded_hours / totalOperatingHours) * 100
      : kpis.unload_pct || 50.55;

  const rangeLabels: Record<string, string> = {
    today: 'Today',
    '7days': 'Last 7 Days',
    '30days': 'Last 30 Days',
    custom: 'Custom Range',
  };

  const availabilityVal = typeof kpis.availability === 'number' ? kpis.availability : 96.2;
  const utilizationVal = typeof kpis.utilization === 'number' ? kpis.utilization : 51.1;
  const runtimeVal = typeof kpis.runtime_hours === 'number' ? kpis.runtime_hours : 229.5;
  const stoppedVal = typeof kpis.stopped_time_hours === 'number' ? kpis.stopped_time_hours : 200.0;
  const loadedVal = typeof kpis.loaded_hours === 'number' ? kpis.loaded_hours : 113.9;
  const unloadedVal = typeof kpis.unloaded_hours === 'number' ? kpis.unloaded_hours : 116.4;
  const mtbrVal = typeof kpis.mtbr_seconds === 'number' ? formatSecToHours(kpis.mtbr_seconds) : '6.16 hrs';
  const mtbfVal = typeof kpis.mtbf_seconds === 'number' ? formatSecToHours(kpis.mtbf_seconds) : '2.78 hrs';
  const interruptionsVal = typeof kpis.interruptions === 'number' ? kpis.interruptions : 44;

  const standardItems = [
    {
      label: 'Availability',
      val: availabilityVal.toFixed(1),
      unit: '%',
      icon: CheckCircle2,
      color: '#10bf83',
    },
    {
      label: 'Utilization',
      val: utilizationVal.toFixed(1),
      unit: '%',
      icon: BarChart2,
      color: '#2378f2',
    },
    {
      label: 'Runtime',
      val: runtimeVal.toFixed(1),
      unit: 'hrs',
      icon: Clock,
      color: '#0284c7',
    },
    {
      label: 'Stopped Time',
      val: stoppedVal.toFixed(1),
      unit: 'hrs',
      icon: CircleOff,
      color: '#f43f5e',
    },
    {
      label: 'Loaded Hours',
      val: loadedVal.toFixed(1),
      unit: 'hrs',
      icon: Gauge,
      color: '#3b82f6',
    },
    {
      label: 'Unloaded Hours',
      val: unloadedVal.toFixed(1),
      unit: 'hrs',
      icon: Timer,
      color: '#2563eb',
    },
    {
      label: 'MTBR',
      val: mtbrVal.replace(' hrs', ''),
      unit: 'hrs',
      icon: Calendar,
      color: '#2378f2',
    },
    {
      label: 'MTBF',
      val: mtbfVal.replace(' hrs', ''),
      unit: 'hrs',
      icon: Calendar,
      color: '#2378f2',
    },
    {
      label: 'Interruptions',
      val: `${interruptionsVal}`,
      unit: '',
      icon: Activity,
      color: '#0ea5e9',
    },
    {
      label: 'Load Time %',
      val: loadTimePct.toFixed(2),
      unit: '%',
      icon: PieChart,
      color: '#f59e0b',
    },
    {
      label: 'Unload Time %',
      val: unloadTimePct.toFixed(2),
      unit: '%',
      icon: PieChart,
      color: '#2563eb',
    },
  ];

  if (isRobo) {
    const ws = weldingSummary || {
      availability_percentage: 98.92,
      utilization_percentage: 8.42,
      active_welding_time: { seconds: 5905, hours: 1.64 },
      idle_time: { seconds: 31862, hours: 8.85 },
      positioning_time: { seconds: 32400, hours: 9.0 },
      off_time: { seconds: 765, hours: 0.21 },
      total_energy_kwh: 21.1291,
      average_power_when_welding_kw: 12.88,
      total_welding_cycles: 108,
      average_cycle_time_seconds: 57.33,
    };

    const periodLabel = weldingPeriod || '2026-09-29 to 2026-09-30';

    const roboItems = [
      {
        icon: CheckCircle2,
        label: 'Availability',
        val: ws.availability_percentage.toFixed(1),
        unit: '%',
        color: '#10bf83',
      },
      {
        icon: BarChart3,
        label: 'Utilization',
        val: ws.utilization_percentage.toFixed(1),
        unit: '%',
        color: '#2378f2',
      },
      {
        icon: Clock3,
        label: 'Active welding time',
        val: ws.active_welding_time.hours.toFixed(2),
        unit: 'hrs',
        color: '#00be85',
      },
      {
        icon: PauseCircle,
        label: 'Idle time',
        val: ws.idle_time.hours.toFixed(2),
        unit: 'hrs',
        color: '#ffb400',
      },
      {
        icon: ScanLine,
        label: 'Positioning time',
        val: ws.positioning_time.hours.toFixed(2),
        unit: 'hrs',
        color: '#3b82f6',
      },
      {
        icon: Power,
        label: 'Off time',
        val: ws.off_time.hours.toFixed(2),
        unit: 'hrs',
        color: '#f0445b',
      },
      {
        icon: Zap,
        label: 'Total energy',
        val: ws.total_energy_kwh.toFixed(2),
        unit: 'kWh',
        color: '#8c25f5',
      },
      {
        icon: Activity,
        label: 'Avg power (welding)',
        val: ws.average_power_when_welding_kw.toFixed(1),
        unit: 'kW',
        color: '#2378f2',
      },
      {
        icon: Gauge,
        label: 'Welding cycles',
        val: ws.total_welding_cycles.toString(),
        unit: '',
        color: '#059669',
      },
    ];

    return (
      <div className="bg-white rounded-xl border border-slate-200/90 p-1.5 sm:px-3 sm:py-2 shadow-2xs">
        {/* Header title */}
        <div className="flex items-center justify-between pb-1 mb-1 border-b border-slate-100">
          <h3 className="text-xs sm:text-[12.5px] font-bold text-slate-800 tracking-tight">
            Operational Summary{' '}
            <span className="text-slate-400 font-normal">
              ({periodLabel})
            </span>
          </h3>
        </div>

        {/* 9 KPI Columns with consistent design: bigger font without bold, bigger label font */}
        <div className="grid grid-cols-3 sm:grid-cols-5 xl:grid-cols-9 items-center">
          {roboItems.map((item, idx) => {
            const Icon = item.icon;
            return (
              <div
                key={item.label}
                className={`flex flex-col justify-center gap-0.5 min-w-0 px-2 ${
                  idx === 0 ? 'pl-0' : 'border-l border-slate-100'
                }`}
              >
                <span
                  className="text-[10px] 2xl:text-[11.5px] text-slate-600 font-semibold leading-tight truncate tracking-tight"
                  title={item.label}
                >
                  {item.label}
                </span>
                <div className="flex items-center gap-1.5 min-w-0">
                  <Icon size={16} color={item.color} className="shrink-0" />
                  <div className="flex items-baseline gap-0.5 whitespace-nowrap">
                    <span className="text-[16px] 2xl:text-[19px] font-normal text-slate-900 leading-none tracking-tight">
                      {item.val}
                    </span>
                    {item.unit && (
                      <span className="text-[10px] 2xl:text-[10.5px] font-normal text-slate-500">
                        {item.unit}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl border border-slate-200/90 p-1.5 sm:px-3 sm:py-2 shadow-2xs">
      {/* Header title */}
      <div className="flex items-center justify-between pb-1 mb-1 border-b border-slate-100">
        <h3 className="text-xs sm:text-[12.5px] font-bold text-slate-800 tracking-tight">
          Operational Summary{' '}
          <span className="text-slate-400 font-normal">
            ({rangeLabels[selectedRange] || 'Last 30 Days'})
          </span>
        </h3>
      </div>

      {/* 11 KPI Columns with the exact same design: bigger font without bold, bigger label font, vertical dividers */}
      <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-6 xl:grid-cols-11 items-center">
        {standardItems.map((item, idx) => {
          const Icon = item.icon;
          return (
            <div
              key={item.label}
              className={`flex flex-col justify-center gap-0.5 min-w-0 px-1.5 2xl:px-2 ${
                idx === 0 ? 'pl-0' : 'border-l border-slate-100'
              }`}
            >
              <span
                className="text-[10px] 2xl:text-[11px] text-slate-600 font-semibold leading-tight truncate tracking-tight"
                title={item.label}
              >
                {item.label}
              </span>
              <div className="flex items-center gap-1.5 min-w-0">
                <Icon size={15} color={item.color} className="shrink-0" />
                <div className="flex items-baseline gap-0.5 whitespace-nowrap">
                  <span className="text-[15px] 2xl:text-[18px] font-normal text-slate-900 leading-none tracking-tight">
                    {item.val}
                  </span>
                  {item.unit && (
                    <span className="text-[10px] 2xl:text-[10.5px] font-normal text-slate-500">
                      {item.unit}
                    </span>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
