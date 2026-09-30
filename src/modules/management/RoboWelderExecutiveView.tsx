import { forwardRef, useEffect, useImperativeHandle, useMemo, useRef, useState, type ReactNode } from 'react';
import { Activity, BarChart3, Bell, CheckCircle2, Clock3, Factory, MapPin, Maximize2, Pause, Play, Radio, ScanLine, ShieldCheck, Square, Tag, Timer, X, Zap, type LucideIcon } from 'lucide-react';
import { format, parseISO } from 'date-fns';
import weldingCellImage from '../../assets/weldwise-robotic-cell.jpg';
import { buildRoboWelderDemo, type RoboWelderPeriod } from './roboWelderDemoData';
import { RoboWelderChart, ROBO_STATE_COLORS, type RoboChartKind, type RoboRunState } from './components/charts/RoboWelderCharts';
import './robo-welder-executive.css';

export interface RoboWelderExecutiveRef {
  refresh: () => void;
  openNotifications: () => void;
}

interface RoboWelderExecutiveProps {
  datePreset: string;
  customStartDate?: string;
  customEndDate?: string;
  onRefreshingChange?: (refreshing: boolean) => void;
}

const CHART_TITLES: Record<RoboChartKind, { title: string; subtitle: string }> = {
  daily: { title: 'Daily Running vs Idle vs Downtime', subtitle: 'Daily recorded operating hours during the selected period.' },
  utilization: { title: 'Utilization %', subtitle: 'Percentage of active welding time vs total time.' },
  availability: { title: 'Availability Trend', subtitle: 'Daily availability percentage.' },
  production: { title: 'Production Cycle', subtitle: 'Daily welding cycle count.' },
};

function ExecutivePanel({ title, subtitle, children, className = '', onExpand }: { title: string; subtitle?: string; children: ReactNode; className?: string; onExpand?: () => void }) {
  return <section className={`rew-panel ${className}`}><div className="rew-panel-heading"><div><h2>{title}</h2>{subtitle && <p>{subtitle}</p>}</div>{onExpand && <button type="button" className="rew-expand" onClick={onExpand} aria-label={`Expand ${title}`}>Expand</button>}</div>{children}</section>;
}

function ExecutiveKpi({ title, value, color, icon: Icon }: { title: string; value: string; color: string; icon: LucideIcon }) {
  return <section className="rew-panel rew-kpi" style={{ '--rew-accent': color } as React.CSSProperties}><h2>{title}</h2><strong>{value}</strong><span className="rew-kpi-icon"><Icon size={21} /></span></section>;
}

function WeldingEquipment({ updatedAt, onExpand }: { updatedAt: Date; onExpand: () => void }) {
  const rows: { icon: LucideIcon; label: string; value: string }[] = [
    { icon: Factory, label: 'Plant', value: 'Texmaco - Agarpara' },
    { icon: MapPin, label: 'Location', value: 'CNC Machining Bay' },
    { icon: Tag, label: 'Asset tag', value: 'ROBOT#RW-01' },
    { icon: ScanLine, label: 'Process', value: 'GMAW (MAG)' },
    { icon: Zap, label: 'Input supply', value: '400 V (3Φ)' },
    { icon: Radio, label: 'Monitor', value: 'L1 (Single phase)' },
  ];
  return <section className="rew-panel rew-equipment" aria-label="Robo Welder equipment information"><button type="button" className="rew-equipment-photo" onClick={onExpand} aria-label="Expand Robo Welder equipment image"><img src={weldingCellImage} alt="Orange robotic welding arm working on a steel part" /><span><Maximize2 size={14} /></span></button><div className="rew-equipment-details"><div className="rew-equipment-tags"><span className="rew-running">RUNNING</span><span className="rew-sample">SAMPLE DATA</span></div><h2>Robo Welder</h2><p className="rew-equipment-type"><i />Robotic Welding Cell</p><dl>{rows.map(({ icon: Icon, label, value }) => <div key={label}><dt><Icon size={12} />{label}:</dt><dd>{value}</dd></div>)}</dl><p className="rew-updated"><Clock3 size={12} /><span>Preview updated: <time dateTime={updatedAt.toISOString()}>{format(updatedAt, 'dd MMM yyyy HH:mm:ss')}</time></span></p></div></section>;
}

function TimeBreakdown({ period }: { period: RoboWelderPeriod }) {
  const circumference = 2 * Math.PI * 46;
  const segments = [
    { name: 'Running', hours: period.running, color: ROBO_STATE_COLORS.Running },
    { name: 'Idle', hours: period.idle, color: ROBO_STATE_COLORS.Idle },
    { name: 'Downtime', hours: period.downtime, color: ROBO_STATE_COLORS.Downtime },
  ];
  let cumulative = 0;
  return <ExecutivePanel title={`Time Breakdown (${period.label})`} subtitle="Running, idle, and downtime split." className="rew-breakdown"><div className="rew-breakdown-body"><div className="rew-donut" role="img" aria-label={`${period.total.toFixed(1)} total hours: ${period.running.toFixed(1)} running, ${period.idle.toFixed(1)} idle, ${period.downtime.toFixed(1)} downtime`}><svg viewBox="0 0 120 120" aria-hidden="true"><circle cx="60" cy="60" r="46" fill="none" stroke="#edf3f8" strokeWidth="15" />{segments.map(({ name, hours, color }) => {
    const length = hours / period.total * circumference;
    const offset = cumulative;
    cumulative += length;
    return <circle key={name} cx="60" cy="60" r="46" fill="none" stroke={color} strokeWidth="15" strokeDasharray={`${Math.max(0, length - 1.5)} ${circumference - Math.max(0, length - 1.5)}`} strokeDashoffset={-offset} transform="rotate(-90 60 60)" />;
  })}</svg><span><strong>{period.total.toFixed(1)} h</strong><small>Total</small></span></div><ul className="rew-breakdown-legend">{segments.map(({ name, hours, color }) => <li key={name}><span className="rew-breakdown-label"><i style={{ background: color }} />{name}</span><div><strong>{(hours / period.total * 100).toFixed(1)}%</strong><span>({hours.toFixed(1)} h)</span></div></li>)}</ul></div></ExecutivePanel>;
}

function WorstDowntime({ period }: { period: RoboWelderPeriod }) {
  const worst = [...period.days].sort((left, right) => right.downtime - left.downtime).slice(0, 5);
  const maximum = Math.max(2, Math.ceil(worst[0].downtime / 2) * 2);
  return <ExecutivePanel title="Worst 5 Days by Downtime" subtitle="Highest daily downtime during the selected period." className="rew-worst"><div className="rew-worst-head"><span>#</span><span>Date</span><span /><span>Downtime</span></div><ol className="rew-downtime-list">{worst.map((day, index) => <li key={day.date}><span>{index + 1}</span><time dateTime={day.date}>{format(parseISO(day.date), 'dd MMM')}</time><div className="rew-downtime-track" role="meter" aria-label={`Downtime on ${format(parseISO(day.date), 'dd MMM')}`} aria-valuemin={0} aria-valuemax={maximum} aria-valuenow={Number(day.downtime.toFixed(1))}><i style={{ width: `${day.downtime / maximum * 100}%` }} /></div><strong>{day.downtime.toFixed(1)} h</strong></li>)}</ol><div className="rew-downtime-axis"><span /><span /><div>{Array.from({ length: 5 }, (_, index) => <span key={index}>{(index / 4 * maximum).toFixed(0)} h</span>)}</div><span /></div></ExecutivePanel>;
}

function AttentionContent() {
  return <div className="rew-attention-content"><CheckCircle2 size={30} /><strong>No Critical Alerts</strong><p>All sample operational parameters are within expected thresholds.</p></div>;
}

function ExecutiveDialog({ title, subtitle, onClose, children }: { title: string; subtitle?: string; onClose: () => void; children: ReactNode }) {
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(() => { const dialog = ref.current; dialog?.showModal(); return () => { if (dialog?.open) dialog.close(); }; }, []);
  return <dialog ref={ref} className="rew-dialog" aria-label={title} onCancel={onClose} onKeyDown={(event) => { if (event.key === 'Escape') { event.preventDefault(); onClose(); } }} onClick={(event) => { if (event.target === event.currentTarget) onClose(); }}><div className="rew-dialog-heading"><div><h2>{title}</h2><p>{subtitle || 'Robo Welder · Sample data'}</p></div><button type="button" onClick={onClose} aria-label="Close expanded executive panel"><X size={20} /></button></div><div className="rew-dialog-body">{children}</div></dialog>;
}

export const RoboWelderExecutiveView = forwardRef<RoboWelderExecutiveRef, RoboWelderExecutiveProps>(function RoboWelderExecutiveView({ datePreset, customStartDate, customEndDate, onRefreshingChange }, ref) {
  const [updatedAt, setUpdatedAt] = useState(() => new Date());
  const [expanded, setExpanded] = useState<RoboChartKind | 'equipment' | 'attention' | null>(null);
  const [visibleStates, setVisibleStates] = useState<Record<RoboRunState, boolean>>({ Running: true, Idle: true, Downtime: true });
  const [refreshed, setRefreshed] = useState(false);
  const result = useMemo(() => buildRoboWelderDemo(datePreset, customStartDate, customEndDate, updatedAt), [datePreset, customStartDate, customEndDate, updatedAt]);
  useEffect(() => { onRefreshingChange?.(false); }, [onRefreshingChange]);
  useEffect(() => {
    if (!refreshed) return;
    const timeout = setTimeout(() => setRefreshed(false), 2500);
    return () => clearTimeout(timeout);
  }, [refreshed, updatedAt]);
  useImperativeHandle(ref, () => ({ refresh: () => { setUpdatedAt(new Date()); setRefreshed(true); }, openNotifications: () => setExpanded('attention') }), []);

  const period = result.period;
  if (!period) return <div className="robot-executive-root"><div className="rew-range-error" role="status"><Clock3 size={28} /><h2>Choose a date range</h2><p>{result.error}</p><span>Robo Welder · Sample data preview</span></div></div>;

  const stateLegend = <div className="rew-state-legend">{(Object.keys(ROBO_STATE_COLORS) as RoboRunState[]).map((name) => <button type="button" key={name} style={{ '--rew-state-color': ROBO_STATE_COLORS[name] } as React.CSSProperties} className={visibleStates[name] ? '' : 'rew-state-hidden'} aria-label={`Toggle ${name.toLowerCase()} hours`} aria-pressed={visibleStates[name]} onClick={() => setVisibleStates((current) => ({ ...current, [name]: !current[name] }))}>{name}</button>)}</div>;
  const chartExpanded = expanded && expanded in CHART_TITLES ? expanded as RoboChartKind : null;

  return <div className="robot-executive-root"><div className="rew-layout">
    <div className="rew-kpi-grid">
      <ExecutiveKpi title="Availability" value={`${period.availability.toFixed(1)}%`} color="#13a987" icon={Activity} />
      <ExecutiveKpi title="Avg Utilization" value={`${period.utilization.toFixed(1)}%`} color="#087ced" icon={BarChart3} />
      <ExecutiveKpi title="Active Welding Time" value={`${period.running.toFixed(1)} h`} color="#12aa87" icon={Play} />
      <ExecutiveKpi title="Idle Time" value={`${period.idle.toFixed(1)} h`} color="#f29918" icon={Pause} />
      <ExecutiveKpi title="Downtime" value={`${period.downtime.toFixed(1)} h`} color="#f4233c" icon={Square} />
      <ExecutiveKpi title="Cycle Count" value={period.cycles.toLocaleString('en-IN')} color="#8e2cec" icon={Timer} />
    </div>
    <div className="rew-overview-grid"><ExecutivePanel title={CHART_TITLES.daily.title} className="rew-daily" onExpand={() => setExpanded('daily')}>{stateLegend}<RoboWelderChart kind="daily" days={period.days} visibleStates={visibleStates} /></ExecutivePanel><WeldingEquipment updatedAt={updatedAt} onExpand={() => setExpanded('equipment')} /></div>
    <div className="rew-analytics-grid">{(['utilization', 'availability', 'production'] as const).map((kind) => <ExecutivePanel key={kind} title={CHART_TITLES[kind].title} subtitle={CHART_TITLES[kind].subtitle} onExpand={() => setExpanded(kind)} className="rew-trend"><RoboWelderChart kind={kind} days={period.days} /></ExecutivePanel>)}<TimeBreakdown period={period} /></div>
    <div className="rew-bottom-grid"><WorstDowntime period={period} /><section className="rew-panel rew-attention"><div className="rew-attention-heading"><h2><Bell size={18} />Management Attention</h2><span>All clear</span></div><AttentionContent /><div className="rew-period-note"><ShieldCheck size={12} /><span>{period.dateLabel} · Sample data</span></div></section></div>
  </div>
  <div className={`rew-refresh-toast ${refreshed ? 'rew-refresh-visible' : ''}`} role="status">{refreshed && <><CheckCircle2 size={16} />Sample executive preview refreshed</>}</div>
  {chartExpanded && <ExecutiveDialog title={CHART_TITLES[chartExpanded].title} subtitle={`${CHART_TITLES[chartExpanded].subtitle} ${period.dateLabel} · Sample data`} onClose={() => setExpanded(null)}>{chartExpanded === 'daily' && stateLegend}<div className="rew-expanded-chart"><RoboWelderChart kind={chartExpanded} days={period.days} visibleStates={visibleStates} expanded /></div></ExecutiveDialog>}
  {expanded === 'equipment' && <ExecutiveDialog title="Robo Welder · Robotic Welding Cell" onClose={() => setExpanded(null)}><img className="rew-expanded-equipment" src={weldingCellImage} alt="Full equipment view of the robotic welding cell" /></ExecutiveDialog>}
  {expanded === 'attention' && <ExecutiveDialog title="Management Attention" subtitle={`${period.dateLabel} · Sample data`} onClose={() => setExpanded(null)}><AttentionContent /></ExecutiveDialog>}
  </div>;
});
