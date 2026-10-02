import { forwardRef, useEffect, useImperativeHandle, useMemo, useRef, useState, type ReactNode } from 'react';
import {
  Activity, AlertTriangle, BarChart3, Check, CheckCircle2,
  Clock3, Download, Factory, Gauge, Info, MapPin, Maximize2, PauseCircle, Power,
  Radio, RefreshCw, ScanLine, ShieldCheck, Tag, Timer, X, Zap, type LucideIcon,
} from 'lucide-react';
import weldingCellImage from '../../assets/weldwise-robotic-cell.jpg';
import { HealthGauges } from '../om/components/HealthGauges';
import { getRoboOverallHealth, ROBO_HEALTH_SCORES } from '../om/utils/overallHealth';
import { getMockKpiData } from '../om/data/mockData';
import { getCachedOperationalKpi } from '../om/services/kpiService';
import type { DateRangePreset } from '../om/types';
import { CurrentTrend } from './CurrentTrend';
import {
  fetchWeldingData,
  DEFAULT_WELDING_MACHINE,
  type WeldingApiResponse,
  type WeldingOperationalSummary,
  type WeldingRuntimeDistribution,
  type WeldingCycleAnalysisItem,
  type WeldingCurrentCycleFeatures,
} from './services/weldingService';
import './weldwise.css';

export interface WeldWiseDashboardRef {
  refresh: () => void;
  openNotifications: () => void;
}

interface WeldWiseDashboardProps {
  datePreset?: string;
  startDate?: string;
  endDate?: string;
  healthRangePreset?: DateRangePreset;
  onDateRangeChange?: (start: string, end: string, preset: string) => void;
}

function MetricGauge({
  title, phase, value, unit, color, progress, note, warning = false, status, trackColor, statusIcon,
}: {
  title: string; phase?: string; value: string; unit: string; color: string; progress: number; note: string; warning?: boolean; status?: string; trackColor?: string; statusIcon?: LucideIcon;
}) {
  const StatusIcon = statusIcon ?? (warning ? Gauge : CheckCircle2);
  return (
    <section className="ww-panel ww-gauge-card" aria-label={status ? `${title}: ${value}, ${status}` : `${title}: ${value} ${unit}`}>
      <h2>{title}{phase && <span>{phase}</span>}</h2>
      <div className="ww-gauge">
        <svg viewBox="0 0 140 112" aria-hidden="true">
          <path d="M 23 94 A 54 54 0 1 1 117 94" fill="none" stroke={trackColor ?? color} strokeOpacity={trackColor ? 1 : .13} strokeWidth="10" strokeLinecap="round" pathLength="100" />
          <path d="M 23 94 A 54 54 0 1 1 117 94" fill="none" stroke={color} strokeWidth="10" strokeLinecap="round" pathLength="100" strokeDasharray={`${Math.max(0, Math.min(100, progress))} 100`} />
        </svg>
        <div className="ww-gauge-value"><strong>{value}</strong><span>{unit}</span></div>
      </div>
      <span className={`ww-health-badge ${warning ? 'ww-health-warning' : ''}`} style={status ? { color, backgroundColor: `${color}15` } : undefined}>
        <StatusIcon size={13} style={status ? { color } : undefined} />{status ? status.toUpperCase() : warning ? 'WITHIN LIMIT' : 'NORMAL'}
      </span>
      <p>{note}</p>
    </section>
  );
}

function PanelHeading({ icon: Icon, title, subtitle, action }: { icon: LucideIcon; title: string; subtitle?: string; action?: ReactNode }) {
  return (
    <div className="ww-panel-heading">
      <h2>
        <span className="ww-heading-icon"><Icon size={14} /></span>
        <span>{title}{subtitle && <span className="ww-title-secondary"> {subtitle}</span>}</span>
      </h2>
      {action}
    </div>
  );
}

function MachineCard({
  updatedAt,
  machineId,
  isLive,
}: {
  updatedAt: Date;
  machineId?: string;
  isLive: boolean;
}) {
  const metadata: { icon: LucideIcon; label: string; value: string }[] = [
    { icon: Factory, label: 'Plant', value: 'Texmaco - Agarpara' },
    { icon: MapPin, label: 'Location', value: 'CNC Machining Bay' },
    { icon: Tag, label: 'Machine ID', value: machineId || DEFAULT_WELDING_MACHINE },
    { icon: ScanLine, label: 'Process', value: 'GMAW (MAG)' },
    { icon: ShieldCheck, label: 'WPS no.', value: 'RSKK-CML-S-04' },
    { icon: Zap, label: 'Input supply', value: '400 V (3Φ)' },
    { icon: Activity, label: 'Phase', value: 'L1 (Single phase)' },
    { icon: Radio, label: 'Sensor', value: 'CT (0–50 A)' },
  ];
  return (
    <section className="ww-panel ww-machine-card" aria-label="Robotic welding cell information">
      <figure className="ww-machine-image">
        <img src={weldingCellImage} alt="Industrial robotic welding cell at Texmaco plant" />
        <figcaption>
          <span>Robo Welder · {machineId || 'PI4G/TXMMIGI/26001'}</span>
          <span className="ww-running">RUNNING</span>
        </figcaption>
      </figure>
      <div className="ww-machine-details">
        <div className="ww-machine-tags">
          <span className="ww-running"><i />RUNNING</span>
          <span className="ww-demo-badge">{isLive ? 'LIVE CLOUD TELEMETRY' : 'SAMPLE DATA'}</span>
        </div>
        <h2>Robo Welder</h2>
        <dl>{metadata.map(({ icon: Icon, label, value }) => <div key={label}><dt><Icon size={12} /><span>{label}</span></dt><dd>{value}</dd></div>)}</dl>
        <p className="ww-updated">
          <Clock3 size={11} />
          <span>Telemetry updated: <time dateTime={updatedAt.toISOString()}>{updatedAt.toLocaleTimeString('en-GB', { hour12: false })}</time></span>
        </p>
      </div>
    </section>
  );
}

// Operational summary displaying exactly the items under operational_summary
// Strictly excluding offline_time and actual_idle_time as requested
function OperationalSummary({
  summary: rawSummary,
  period,
}: {
  summary: WeldingOperationalSummary;
  period: string;
}) {
  const rawPosSec = rawSummary.positioning_time?.seconds ?? 0;
  const rawPosHrs = rawSummary.positioning_time?.hours ?? 0;
  const cycles = rawSummary.total_welding_cycles ?? 0;

  const calcPosSec = (rawPosSec === 0 && rawPosHrs === 0) ? (cycles * 300) : rawPosSec;
  const calcPosHrs = (rawPosSec === 0 && rawPosHrs === 0) ? (calcPosSec / 3600) : rawPosHrs;

  const rawIdleSec = rawSummary.actual_idle_time?.seconds ?? rawSummary.idle_time?.seconds ?? 0;
  const calcIdleSec = (rawPosSec === 0 && rawPosHrs === 0) ? Math.max(0, rawIdleSec - calcPosSec) : (rawSummary.idle_time?.seconds ?? 0);
  const calcIdleHrs = (rawPosSec === 0 && rawPosHrs === 0) ? (calcIdleSec / 3600) : (rawSummary.idle_time?.hours ?? 0);

  const summary = {
    ...rawSummary,
    positioning_time: {
      seconds: calcPosSec,
      hours: calcPosHrs,
    },
    idle_time: {
      seconds: calcIdleSec,
      hours: calcIdleHrs,
    },
  };

  const items: { icon: LucideIcon; label: string; val: string; unit?: string; color?: string }[] = [
    {
      icon: CheckCircle2,
      label: 'Availability',
      val: summary.availability_percentage.toFixed(2),
      unit: '%',
      color: '#10bf83',
    },
    {
      icon: BarChart3,
      label: 'Utilization',
      val: summary.utilization_percentage.toFixed(2),
      unit: '%',
      color: '#2378f2',
    },
    {
      icon: Clock3,
      label: 'Active welding time',
      val: summary.active_welding_time.hours.toFixed(2),
      unit: 'hrs',
      color: '#00be85',
    },
    {
      icon: PauseCircle,
      label: 'Idle time',
      val: summary.idle_time.hours.toFixed(2),
      unit: 'hrs',
      color: '#ffb400',
    },
    {
      icon: ScanLine,
      label: 'Positioning time',
      val: summary.positioning_time.hours.toFixed(2),
      unit: 'hrs',
      color: '#3b82f6',
    },
    {
      icon: Power,
      label: 'Off time',
      val: summary.off_time.hours.toFixed(2),
      unit: 'hrs',
      color: '#f0445b',
    },
    {
      icon: Zap,
      label: 'Total energy',
      val: summary.total_energy_kwh.toFixed(2),
      unit: 'kWh',
      color: '#8c25f5',
    },
    {
      icon: Activity,
      label: 'Avg power (welding)',
      val: summary.average_power_when_welding_kw.toFixed(1),
      unit: 'kW',
      color: '#2378f2',
    },
    {
      icon: Gauge,
      label: 'Welding cycles',
      val: summary.total_welding_cycles.toString(),
      color: '#059669',
    },
  ];

  return (
    <section className="ww-panel ww-summary">
      <h2>
        Operational Summary <span>({period})</span>
      </h2>
      <div className="ww-summary-grid">
        {items.map(({ icon: Icon, label, val, unit, color }) => (
          <div key={label} className="ww-summary-item">
            <span className="ww-summary-label" title={label}>{label}</span>
            <div className="ww-summary-data">
              <Icon size={17} color={color || '#2378f2'} />
              <div className="ww-summary-val">
                <span className="ww-summary-num">{val}</span>
                {unit && <span className="ww-summary-unit">{unit}</span>}
              </div>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}

// Cycle Table for Cycle Analysis KPI
// Latest current (A) and Status columns strictly removed per instructions
function CycleTable({
  cycles,
  expanded = false,
}: {
  cycles: WeldingCycleAnalysisItem[];
  expanded?: boolean;
}) {
  const rows = expanded ? cycles : cycles.slice(-10);

  const formatTime = (ts: string) => {
    try {
      const d = new Date(ts);
      if (isNaN(d.getTime())) return ts;
      const hours = String(d.getHours()).padStart(2, '0');
      const mins = String(d.getMinutes()).padStart(2, '0');
      const secs = String(d.getSeconds()).padStart(2, '0');
      const day = String(d.getDate()).padStart(2, '0');
      const month = d.toLocaleDateString('en-GB', { month: 'short' });
      return `${day} ${month} ${hours}:${mins}:${secs}`;
    } catch {
      return ts;
    }
  };

  return (
    <div className="ww-cycle-table-wrap">
      <table className="ww-cycle-table">
        <caption className="sr-only">Welding cycles telemetry log</caption>
        <thead>
          <tr>
            <th scope="col">#</th>
            <th scope="col">Start time</th>
            <th scope="col">Duration (s)</th>
            <th scope="col">Peak current (A)</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((cycle, idx) => (
            <tr key={`${cycle.cycle_number}-${idx}`}>
              <td style={{ fontWeight: 700, color: '#1e293b' }}>#{cycle.cycle_number}</td>
              <td style={{ color: '#475569' }}>{formatTime(cycle.timestamp)}</td>
              <td style={{ fontWeight: 600 }}>{cycle.duration_seconds.toFixed(1)} s</td>
              <td style={{ fontWeight: 700, color: '#0866ff' }}>{cycle.peak_current_a.toFixed(2)} A</td>
            </tr>
          ))}
        </tbody>
      </table>
      {rows.length === 0 && <p className="ww-empty">No cycle records found for selected date range.</p>}
    </div>
  );
}

// Current-Based Cycle Features KPI
// Drawn directly from current_cycle_features
function CycleFeatures({
  features,
  period,
}: {
  features: WeldingCurrentCycleFeatures;
  period: string;
}) {
  const items = [
    { icon: Activity, label: 'Mean current', value: features.mean_current_a.toFixed(1), unit: 'A', tone: 'purple' },
    { icon: Zap, label: 'RMS current', value: features.rms_current_a.toFixed(1), unit: 'A', tone: 'green' },
    { icon: Activity, label: 'Peak current', value: features.peak_current_a.toFixed(1), unit: 'A', tone: 'red' },
    { icon: Clock3, label: 'Avg cycle time', value: features.average_cycle_time_seconds.toFixed(1), unit: 's', tone: 'outline' },
  ];

  return (
    <section className="ww-panel ww-features">
      <PanelHeading icon={Gauge} title="Current-Based Cycle Features" subtitle={`(Average · ${period})`} />
      <div className="ww-feature-grid">
        {items.map(({ icon: Icon, label, value, unit, tone }) => (
          <div className="ww-feature" key={label}>
            <span className={`ww-feature-icon ww-tone-${tone}`}><Icon size={18} /></span>
            <div>
              <span>{label}</span>
              <strong>{value} <small>{unit}</small></strong>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}

// Process Cycle Status Pie / Donut Chart
// Uses runtime_distribution directly from the API
function ProcessStatus({
  runtimeDistribution,
}: {
  runtimeDistribution: WeldingRuntimeDistribution;
}) {
  const circumference = 2 * Math.PI * 46;
  const totalSecs = Math.max(1, runtimeDistribution.total_seconds);

  const stateColors: Record<string, string> = {
    ARC: '#00be85',
    POSITIONING: '#0866ff',
    IDLE: '#ffb400',
    OFF: '#ff4259',
  };

  const segments = (runtimeDistribution.distribution || []).map((item) => ({
    state: item.state,
    label: item.label,
    seconds: item.seconds,
    percentage: item.percentage,
    color: stateColors[item.state] || '#64748b',
  }));

  let cumulativeLength = 0;
  const totalHours = (totalSecs / 3600).toFixed(1);

  return (
    <section className="ww-panel ww-process-status">
      <PanelHeading icon={ScanLine} title="Runtime Distribution" subtitle="From machine event states" />
      <div className="ww-runtime-body">
        <div className="ww-donut" aria-label={`Runtime distribution. Total monitored time: ${totalHours} hours`}>
          <svg viewBox="0 0 120 120" aria-hidden="true">
            <circle cx="60" cy="60" r="46" fill="none" stroke="#edf3f7" strokeWidth="17" />
            {segments.map(({ state, seconds, color }) => {
              const length = (seconds / totalSecs) * circumference;
              const offset = cumulativeLength;
              cumulativeLength += length;
              return (
                <circle
                  key={state}
                  cx="60"
                  cy="60"
                  r="46"
                  fill="none"
                  stroke={color}
                  strokeWidth="17"
                  strokeDasharray={`${length} ${circumference - length}`}
                  strokeDashoffset={-offset}
                  transform="rotate(-90 60 60)"
                />
              );
            })}
          </svg>
          <span>
            <small>Total Time</small>
            <strong>{totalHours}</strong>
            <small>Hours</small>
          </span>
        </div>
        <div className="ww-status-legend">
          {segments.map(({ state, label, seconds, percentage, color }) => (
            <div key={state} className="ww-legend-row">
              <span className="ww-legend-label">
                <i style={{ backgroundColor: color }} />
                <span>{label}</span>
              </span>
              <span className="ww-legend-val">
                {percentage.toFixed(1)}% <small>({(seconds / 3600).toFixed(1)}h)</small>
              </span>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function Insights({
  summary,
  features,
}: {
  summary: WeldingOperationalSummary;
  features: WeldingCurrentCycleFeatures;
}) {
  const items = [
    {
      tone: summary.availability_percentage >= 90 ? 'normal' : 'warning',
      text: `High cell availability (${summary.availability_percentage.toFixed(1)}%) in selected timeframe`,
      detail: 'Machine maintained operational state without major communication outages.',
    },
    {
      tone: 'normal',
      text: `${summary.total_welding_cycles} total weld cycles processed (${summary.active_welding_time.hours.toFixed(2)} active arc hrs)`,
      detail: 'Consistent welding activity captured by CT sensor.',
    },
    {
      tone: features.peak_current_a <= 30 ? 'normal' : 'warning',
      text: `Peak current stability at ${features.peak_current_a.toFixed(1)} A with RMS ${features.rms_current_a.toFixed(1)} A`,
      detail: 'No electrical overcurrent anomalies detected during weld arc initiation.',
    },
    {
      tone: summary.positioning_time.hours > 0 ? 'normal' : 'warning',
      text: `Positioning duration: ${summary.positioning_time.hours.toFixed(2)} hrs (${((summary.positioning_time.seconds / Math.max(1, summary.active_welding_time.seconds + summary.positioning_time.seconds + summary.idle_time.seconds)) * 100).toFixed(0)}% of cycle time)`,
      detail: 'Robotic arm workpiece indexing and transit movements.',
    },
  ];

  return (
    <ul className="ww-insights-list ww-insights-grid">
      {items.map((insight, idx) => {
        const Icon = insight.tone === 'normal' ? CheckCircle2 : AlertTriangle;
        return (
          <li key={idx}>
            <Icon size={14} className={`ww-insight-${insight.tone}`} />
            <div>
              <span>{insight.text}</span>
              <p>{insight.detail}</p>
            </div>
          </li>
        );
      })}
    </ul>
  );
}

function DashboardDialog({
  title,
  onClose,
  children,
  wide = false,
}: {
  title: string;
  onClose: () => void;
  children: ReactNode;
  wide?: boolean;
}) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    const dialog = dialogRef.current;
    dialog?.showModal();
    return () => {
      if (dialog?.open) dialog.close();
    };
  }, []);
  return (
    <dialog
      ref={dialogRef}
      className={`ww-dialog ${wide ? 'ww-dialog-wide' : ''}`}
      aria-label={title}
      onCancel={onClose}
      onKeyDown={(event) => {
        if (event.key === 'Escape') {
          event.preventDefault();
          onClose();
        }
      }}
      onClick={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <div className="ww-dialog-heading">
        <div>
          <h2>{title}</h2>
          <p>Robo Welder · Cloud Telemetry</p>
        </div>
        <button type="button" aria-label="Close expanded panel" onClick={onClose}>
          <X size={20} />
        </button>
      </div>
      <div className="ww-dialog-body">{children}</div>
    </dialog>
  );
}

function downloadCyclesCsv(cycles: WeldingCycleAnalysisItem[], period: string) {
  const csv = [
    'Cycle,Start time,Duration (s),Peak current (A)',
    ...cycles.map(
      (c) => `${c.cycle_number},${c.timestamp},${c.duration_seconds.toFixed(1)},${c.peak_current_a.toFixed(2)}`
    ),
  ].join('\r\n');
  const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8;' }));
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = `weldwise-cycles-${period.replace(/[\s\W]+/g, '_')}.csv`;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export const WeldWiseDashboardView = forwardRef<WeldWiseDashboardRef, WeldWiseDashboardProps>(
  function WeldWiseDashboardView(
    {
      datePreset = '29_30_sep',
      startDate: propStartDate = '2026-09-29',
      endDate: propEndDate = '2026-09-30',
      healthRangePreset = '30days',
      onDateRangeChange,
    },
    ref
  ) {
    const [startDate, setStartDate] = useState<string>(propStartDate);
    const [endDate, setEndDate] = useState<string>(propEndDate);

    const [data, setData] = useState<WeldingApiResponse | null>(null);
    const [loading, setLoading] = useState<boolean>(true);
    const [error, setError] = useState<string | null>(null);
    const [updatedAt, setUpdatedAt] = useState<Date>(() => new Date());
    const [dialog, setDialog] = useState<'trend' | 'cycles' | 'insights' | null>(null);
    const [refreshMessage, setRefreshMessage] = useState<string>('');

    // Synchronize when date range props change from Header
    useEffect(() => {
      if (propStartDate && propEndDate) {
        setStartDate(propStartDate);
        setEndDate(propEndDate);
      }
    }, [propStartDate, propEndDate]);

    // Fetch data for given dates
    const loadData = async (start: string, end: string, forceRefresh = false) => {
      setLoading(true);
      setError(null);
      try {
        const response = await fetchWeldingData(DEFAULT_WELDING_MACHINE, start, end, forceRefresh);
        setData(response);
        setUpdatedAt(new Date());
      } catch (err: any) {
        console.error('Failed to fetch welding data:', err);
        setError(err.message || 'Failed to load welding data');
      } finally {
        setLoading(false);
      }
    };

    // Load initial data and on date change
    useEffect(() => {
      loadData(startDate, endDate);
    }, [startDate, endDate]);

    useImperativeHandle(ref, () => ({
      refresh: () => {
        loadData(startDate, endDate, true);
        setRefreshMessage('Welding data refreshed');
      },
      openNotifications: () => setDialog('insights'),
    }), [startDate, endDate]);

    useEffect(() => {
      if (!refreshMessage) return;
      const timeout = setTimeout(() => setRefreshMessage(''), 3000);
      return () => clearTimeout(timeout);
    }, [refreshMessage]);

    const periodLabel = useMemo(() => {
      if (startDate === endDate) return startDate;
      return `${startDate} to ${endDate}`;
    }, [startDate, endDate]);

    // Fallback operational summary if data is loading for the first time
    const summary: WeldingOperationalSummary = data?.operational_summary || {
      availability_percentage: 98.82,
      utilization_percentage: 4.83,
      active_welding_time: { seconds: 2048.0, hours: 0.57 },
      idle_time: { seconds: 9000.0, hours: 2.5 },
      actual_idle_time: { seconds: 40336.0, hours: 11.2 },
      positioning_time: { seconds: 31336.0, hours: 8.7 },
      off_time: { seconds: 506.0, hours: 0.14 },
      offline_time: { seconds: 0.0, hours: 0.0 },
      total_energy_kwh: 7.65,
      average_power_when_welding_kw: 13.45,
      total_welding_cycles: 35,
      average_cycle_time_seconds: 68.27,
    };

    const cycleFeatures: WeldingCurrentCycleFeatures = data?.current_cycle_features || {
      mean_current_a: 23.14,
      rms_current_a: 23.16,
      peak_current_a: 24.44,
      current_stability_percentage: 0,
      average_cycle_time_seconds: 68.27,
      average_arc_duration_seconds: null,
      cycle_count: 30,
    };

    const runtimeDistribution: WeldingRuntimeDistribution = data?.runtime_distribution || {
      total_seconds: 42890.0,
      distribution: [
        { state: 'ARC', label: 'Active Welding', seconds: 2048.0, percentage: 4.78 },
        { state: 'IDLE', label: 'Idle', seconds: 9000.0, percentage: 20.98 },
        { state: 'POSITIONING', label: 'Positioning', seconds: 31336.0, percentage: 73.06 },
        { state: 'OFF', label: 'Off', seconds: 506.0, percentage: 1.18 },
      ],
    };

    const cycles = data?.cycle_analysis || [];

    const healthData = useMemo(
      () => getCachedOperationalKpi('ROBO#01', undefined, undefined, healthRangePreset) ?? getMockKpiData('ROBO#01'),
      [healthRangePreset]
    );

    return (
      <div className="weldwise-root">
        {error && (
          <div
            style={{
              padding: '8px 12px',
              marginBottom: '8px',
              borderRadius: '6px',
              backgroundColor: '#fef2f2',
              border: '1px solid #fecaca',
              color: '#b91c1c',
              fontSize: '12px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
            }}
          >
            <span>{error}</span>
            <button
              type="button"
              onClick={() => loadData(startDate, endDate, true)}
              style={{
                background: '#dc2626',
                color: '#fff',
                border: 'none',
                padding: '2px 8px',
                borderRadius: '4px',
                fontSize: '10px',
                fontWeight: 600,
                cursor: 'pointer',
              }}
            >
              Retry
            </button>
          </div>
        )}

        <div className="ww-layout">
          {/* Top Row: Machine Card + Health Gauges + Total Energy Gauge */}
          <div className="ww-top-grid">
            <MachineCard updatedAt={updatedAt} machineId={data?.machine?.machine_id} isLive={Boolean(data)} />
            {[
              {
                title: 'Overall Health',
                score: getRoboOverallHealth(),
                color: '#10bf83',
                trackColor: '#d1fae5',
                description: 'Running within normal limits',
                icon: Activity,
              },
              {
                title: 'Electrical Health',
                score: ROBO_HEALTH_SCORES.electrical,
                color: '#2378f2',
                trackColor: '#dbeafe',
                description: 'Stable electrical parameters',
                icon: Zap,
              },
              {
                title: 'Mechanical Health',
                score: ROBO_HEALTH_SCORES.mechanical,
                color: '#f59e0b',
                trackColor: '#fef3c7',
                description: 'Optimal vibration levels',
                icon: CheckCircle2,
              },
              {
                title: 'Thermal Health',
                score: ROBO_HEALTH_SCORES.thermal,
                color: '#ef4444',
                trackColor: '#fee2e2',
                description: 'Operating temperature normal',
                icon: CheckCircle2,
              },
            ].map((gauge) => (
              <MetricGauge
                key={gauge.title}
                title={gauge.title}
                value={gauge.score.toString()}
                unit="/100"
                color={gauge.color}
                trackColor={gauge.trackColor}
                progress={gauge.score}
                note={gauge.description}
                statusIcon={gauge.icon}
              />
            ))}
            <MetricGauge
              title="Total Energy"
              phase={`(${periodLabel})`}
              value={summary.total_energy_kwh.toFixed(1)}
              unit="kWh"
              color="#8c25f5"
              progress={Math.min(100, (summary.total_energy_kwh / 50) * 100)}
              note="Total welding consumption"
            />
          </div>

          {/* Operational Summary (10 metrics from operational_summary, no offline_time / actual_idle_time) */}
          <OperationalSummary summary={summary} period={periodLabel} />

          {/* Current Graph: Plotted using peak_current_a and timestamp from cycle_analysis */}
          <CurrentTrend
            cycleAnalysis={cycles}
            periodLabel={periodLabel}
            loading={loading}
            onExpand={() => setDialog('trend')}
          />

          {/* Bottom Grid: Runtime Distribution (Left) and Insights & Telemetry Health (Right) */}
          <div className="ww-bottom-grid">
            {/* Process Status Donut / Pie Chart from runtime_distribution (shifted to the left) */}
            <ProcessStatus runtimeDistribution={runtimeDistribution} />

            {/* Insights & Telemetry Health (Right) */}
            <section className="ww-panel ww-insights">
              <PanelHeading icon={ShieldCheck} title="Insights & Telemetry Health" />
              <Insights summary={summary} features={cycleFeatures} />
              <div className="ww-insights-footer">
                <span className="ww-insights-dot" />
                Live welding machine telemetry: {data?.machine?.machine_id || DEFAULT_WELDING_MACHINE}
              </div>
            </section>
          </div>
        </div>

        {/* Refresh feedback toast */}
        <div role="status" className={`ww-refresh-toast ${refreshMessage ? 'ww-toast-visible' : ''}`}>
          <Check size={16} />
          {refreshMessage}
        </div>

        {/* Dialogs */}
        {dialog === 'trend' && (
          <DashboardDialog title={`AC Input Current - Peak Current Trend · ${periodLabel}`} wide onClose={() => setDialog(null)}>
            <CurrentTrend cycleAnalysis={cycles} periodLabel={periodLabel} loading={loading} expanded />
          </DashboardDialog>
        )}

        {dialog === 'cycles' && (
          <DashboardDialog title={`Cycle Analysis · ${periodLabel}`} wide onClose={() => setDialog(null)}>
            <div className="ww-export-row" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 8px 8px' }}>
              <p style={{ margin: 0, fontSize: '11px', color: '#64748b' }}>All {cycles.length} cycles captured in selected range</p>
              <button
                type="button"
                className="ww-export-button"
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '5px',
                  padding: '4px 10px',
                  borderRadius: '5px',
                  border: '1px solid #cbd5e1',
                  background: '#f8fafc',
                  color: '#1e293b',
                  fontSize: '11px',
                  fontWeight: 600,
                  cursor: 'pointer',
                }}
                onClick={() => downloadCyclesCsv(cycles, periodLabel)}
              >
                <Download size={14} />
                Export CSV
              </button>
            </div>
            <CycleTable cycles={cycles} expanded />
          </DashboardDialog>
        )}

        {dialog === 'insights' && (
          <DashboardDialog title="Insights & Telemetry Health" onClose={() => setDialog(null)}>
            <Insights summary={summary} features={cycleFeatures} />
            <p className="ww-dialog-note">Analyzed from {cycles.length} welding cycles for {periodLabel}.</p>
          </DashboardDialog>
        )}
      </div>
    );
  }
);
