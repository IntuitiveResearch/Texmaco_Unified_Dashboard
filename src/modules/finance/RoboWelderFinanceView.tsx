import { forwardRef, useEffect, useImperativeHandle, useMemo, useRef, useState, type CSSProperties, type ReactNode } from 'react';
import { CheckCircle2, Clock3, Cpu, Edit3, IndianRupee, Leaf, Lightbulb, Maximize2, Save, Settings, Target, Wrench, X, Zap, type LucideIcon } from 'lucide-react';
import { RoboFinancialTrend } from './components/RoboFinancialTrend';
import { DEFAULT_ROBO_FINANCE_ASSUMPTIONS, ROBO_FINANCE_STORAGE_KEY, calculateRoboFinance, formatRoboLakhs, formatRoboNumber, readRoboFinanceAssumptions, validateRoboAssumptions, type RoboCostMode, type RoboFinanceAssumptions, type RoboFinanceModel, type RoboPriority } from './roboWelderFinanceData';
import './robo-welder-finance.css';

export interface RoboWelderFinanceRef { refresh: () => void; openNotifications: () => void }
interface RoboWelderFinanceProps { timeRange: string; onRefreshingChange?: (refreshing: boolean) => void }

const ASSUMPTION_FIELDS: { key: keyof RoboFinanceAssumptions; label: string; unit: string; integer?: boolean; minimum?: number }[] = [
  { key: 'tariff', label: 'Electricity Tariff', unit: '₹ / kWh' },
  { key: 'downtimeRate', label: 'Downtime Cost', unit: '₹ / hour' },
  { key: 'idleRate', label: 'Idle Running Cost', unit: '₹ / hour' },
  { key: 'maintenanceRate', label: 'Maintenance Event Cost', unit: '₹ / event' },
  { key: 'operatingHours', label: 'Asset Operating Hours', unit: 'hours / month', minimum: 1 },
  { key: 'energyKwh', label: 'Total Energy (Month)', unit: 'kWh' },
  { key: 'weldingCurrent', label: 'Avg Welding Current', unit: 'A' },
  { key: 'voltage', label: 'Supply Voltage', unit: 'V (3Φ)' },
  { key: 'maintenanceEvents', label: 'Maintenance Events (Month)', unit: 'events', integer: true },
  { key: 'cycles', label: 'Production Cycles (Month)', unit: 'cycles', integer: true },
  { key: 'downtimeHours', label: 'Unplanned Downtime (Month)', unit: 'hours' },
  { key: 'idleHours', label: 'Idle Running Time (Month)', unit: 'hours' },
];

function FinanceDialog({ title, children, onClose, wide = false }: { title: string; children: ReactNode; onClose: () => void; wide?: boolean }) {
  const element = useRef<HTMLDialogElement>(null);
  useEffect(() => { const dialog = element.current; dialog?.showModal(); return () => { if (dialog?.open) dialog.close(); }; }, []);
  return <dialog ref={element} className={`rfin-dialog ${wide ? 'rfin-dialog-wide' : ''}`} aria-label={title} onCancel={onClose} onKeyDown={(event) => { if (event.key === 'Escape') { event.preventDefault(); onClose(); } }} onClick={(event) => { if (event.target === event.currentTarget) onClose(); }}><div className="rfin-dialog-heading"><div><h2>{title}</h2><p>Robo Welder · Robotic Welding Cell · Sample data</p></div><button type="button" aria-label="Close financial panel" onClick={onClose}><X size={20} /></button></div><div className="rfin-dialog-body">{children}</div></dialog>;
}

function CostKpi({ title, value, subtitle, icon: Icon, color }: { title: string; value: number; subtitle: string; icon: LucideIcon; color: string }) {
  return <section className="rfin-panel rfin-kpi" style={{ '--rfin-accent': color } as CSSProperties}><h2><span><Icon size={17} /></span>{title}</h2><strong>{formatRoboLakhs(value)} Lakhs</strong><p>{subtitle}</p></section>;
}

function CostDistribution({ model, mode, onSelect }: { model: RoboFinanceModel; mode: RoboCostMode; onSelect: (mode: RoboCostMode) => void }) {
  const circumference = 2 * Math.PI * 48;
  let offset = 0;
  return <section className="rfin-panel rfin-distribution"><h2 className="rfin-simple-heading">Cost Distribution – Where is the Money Going?</h2><div className="rfin-distribution-body"><button type="button" className="rfin-donut" aria-label="Show total cost trend" onClick={() => onSelect('total')}><svg viewBox="0 0 124 124" aria-hidden="true"><circle cx="62" cy="62" r="48" fill="none" stroke="#edf2f7" strokeWidth="24" />{model.categories.map((category) => {
    const length = category.percentage / 100 * circumference;
    const currentOffset = offset;
    offset += length;
    return <circle key={category.key} cx="62" cy="62" r="48" fill="none" stroke={category.color} strokeWidth="24" strokeDasharray={`${Math.max(0, length - 1.4)} ${circumference - Math.max(0, length - 1.4)}`} strokeDashoffset={-currentOffset} transform="rotate(-90 62 62)" />;
  })}</svg><span><strong>{formatRoboLakhs(model.total)}</strong><small>Lakhs</small></span></button><div className="rfin-distribution-legend">{model.categories.map((category) => <button type="button" key={category.key} onClick={() => onSelect(mode === category.key ? 'total' : category.key)} aria-label={`Show ${category.name.toLowerCase()} cost trend`} aria-pressed={mode === category.key}><span><i style={{ background: category.color }} />{category.name}</span><span>{category.percentage.toFixed(1)}%</span><strong>{formatRoboLakhs(category.amount)}L</strong></button>)}</div></div></section>;
}

function KeyTakeaway({ model }: { model: RoboFinanceModel }) {
  const largest = model.ranked[0];
  const second = model.ranked[1];
  return <section className="rfin-panel rfin-takeaway"><h2><span className="rfin-round-icon"><Lightbulb size={18} /></span>Key Takeaway</h2><strong className="rfin-takeaway-total">{formatRoboLakhs(model.total)} Lakhs</strong><p>of operational cost exposure identified in the {model.periodText}.</p><p>The largest opportunity lies in <b>{largest.action}</b> ({largest.percentage.toFixed(1)}% of total cost), followed by <b>{second.action}</b>.</p><div className="rfin-takeaway-callout"><Target size={22} /><span>A 20% reduction in {largest.key === 'idle' ? 'idle time' : largest.key === 'downtime' ? 'downtime' : `${largest.name.toLowerCase()} cost`} can save <b>~ {formatRoboLakhs(largest.amount * .2)} Lakhs per {model.periodUnit}.</b></span></div></section>;
}

function SavingsTable({ model, filter, onFilter }: { model: RoboFinanceModel; filter: RoboPriority | 'All'; onFilter: (value: RoboPriority | 'All') => void }) {
  const rows = model.opportunities.filter((opportunity) => filter === 'All' || opportunity.priority === filter);
  const totalMin = model.opportunities.reduce((total, opportunity) => total + opportunity.min, 0);
  const totalMax = model.opportunities.reduce((total, opportunity) => total + opportunity.max, 0);
  const filteredMin = rows.reduce((total, opportunity) => total + opportunity.min, 0);
  const filteredMax = rows.reduce((total, opportunity) => total + opportunity.max, 0);
  return <section className="rfin-panel rfin-savings"><div className="rfin-savings-heading"><span className="rfin-savings-icon"><Leaf size={18} /></span><div><div className="rfin-savings-title"><h2>Saving Opportunities</h2><span className="rfin-total-value">TOTAL EST. VALUE: <b>{formatRoboLakhs(totalMin, 1)} – {(totalMax / 100000).toFixed(1)} Lakhs</b></span></div><p>Areas where intervention can create financial value</p></div><div className="rfin-priority-filter"><span>Filter:</span>{(['All', 'High', 'Medium', 'Low'] as const).map((priority) => <button type="button" key={priority} aria-label={`Filter ${priority.toLowerCase()} priority savings`} aria-pressed={filter === priority} onClick={() => onFilter(priority)}>{priority === 'Medium' ? 'Med' : priority}</button>)}</div></div><div className="rfin-table-wrap"><table className="rfin-savings-table"><caption className="sr-only">Sample savings opportunities for Robo Welder, filtered to {filter.toLowerCase()} priorities</caption><thead><tr><th scope="col">Opportunity</th><th scope="col">Current Situation</th><th scope="col">Est. Savings (₹)</th><th scope="col">Priority</th></tr></thead><tbody>{rows.map((opportunity) => <tr key={opportunity.id}><td>{opportunity.name}</td><td>{opportunity.situation}</td><td>{formatRoboLakhs(opportunity.min)} – {(opportunity.max / 100000).toFixed(2)} Lakhs</td><td><span className={`rfin-priority rfin-priority-${opportunity.priority.toLowerCase()}`}>{opportunity.priority}</span></td></tr>)}</tbody><tfoot><tr><td colSpan={2}>{filter === 'All' ? 'Total Est. Savings Range' : 'Filtered Savings Range'}</td><td>{formatRoboLakhs(filteredMin, 1)} – {(filteredMax / 100000).toFixed(1)} Lakhs</td><td>{rows.length} Action{rows.length === 1 ? '' : 's'}</td></tr></tfoot></table></div></section>;
}

function AssumptionsCard({ assumptions, onEdit, onSave, dirty }: { assumptions: RoboFinanceAssumptions; onEdit: () => void; onSave: () => void; dirty: boolean }) {
  const display = (key: keyof RoboFinanceAssumptions) => {
    const value = assumptions[key];
    if (['tariff', 'downtimeRate', 'idleRate', 'maintenanceRate'].includes(key)) return `₹ ${formatRoboNumber(value, 2)} / ${key === 'tariff' ? 'kWh' : key === 'maintenanceRate' ? 'event' : 'hour'}`;
    if (key === 'operatingHours') return `${formatRoboNumber(value, 0)} hours / month`;
    if (key === 'energyKwh') return `${formatRoboNumber(value)} kWh`;
    if (key === 'weldingCurrent') return `${formatRoboNumber(value)} A`;
    if (key === 'voltage') return `${formatRoboNumber(value, 0)} V (3Φ)`;
    return formatRoboNumber(value, 0);
  };
  return <section className="rfin-panel rfin-assumptions"><div className="rfin-assumptions-heading"><span className="rfin-round-icon"><Settings size={18} /></span><div><h2>Input Assumptions</h2><p><Cpu size={12} />Robo Welder <span className="rfin-sample-label">SAMPLE DATA</span></p></div><div className="rfin-assumption-actions"><button type="button" aria-label="Save Robo Welder assumptions" onClick={onSave} className="rfin-save-button"><Save size={13} />Save</button><button type="button" aria-label="Edit Robo Welder assumptions" onClick={onEdit}><Edit3 size={13} />Edit</button></div></div><div className="rfin-assumption-zones">{[ASSUMPTION_FIELDS.slice(0, 5), ASSUMPTION_FIELDS.slice(5, 10)].map((fields, index) => <dl key={index} className={`rfin-assumption-zone rfin-zone-${index}`}>{fields.map((field) => <div key={field.key}><dt>{field.label}</dt><dd>{display(field.key)}</dd></div>)}</dl>)}</div><p className="rfin-storage-note">{dirty ? 'Unsaved changes · Save to keep these assumptions in this browser.' : 'Sample assumptions · Save keeps your changes in this browser.'}</p></section>;
}

function AssumptionEditor({ assumptions, onApply, onClose }: { assumptions: RoboFinanceAssumptions; onApply: (value: RoboFinanceAssumptions) => void; onClose: () => void }) {
  const [draft, setDraft] = useState<Record<keyof RoboFinanceAssumptions, string>>(() => Object.fromEntries(Object.entries(assumptions).map(([key, value]) => [key, String(value)])) as Record<keyof RoboFinanceAssumptions, string>);
  const [error, setError] = useState('');
  return <form className="rfin-edit-form" onSubmit={(event) => {
    event.preventDefault();
    const parsed = Object.fromEntries(Object.entries(draft).map(([key, value]) => [key, Number(value)]));
    if (Object.values(draft).some((value) => value.trim() === '') || !validateRoboAssumptions(parsed)) { setError('Enter valid nonnegative numbers. Operating hours must be greater than zero, and event and cycle counts must be whole numbers.'); return; }
    onApply(parsed);
  }}><p className="rfin-edit-intro">Update the monthly sample inputs to compare costs and potential savings.</p><div className="rfin-edit-grid">{ASSUMPTION_FIELDS.map((field) => <label key={field.key} htmlFor={`robo-finance-${field.key}`}><span>{field.label}<small>{field.unit}</small></span><input id={`robo-finance-${field.key}`} name={field.key} type="number" min={field.minimum ?? 0} max={1000000000} step={field.integer ? 1 : 'any'} required value={draft[field.key]} onChange={(event) => { setDraft((current) => ({ ...current, [field.key]: event.target.value })); setError(''); }} /></label>)}</div>{error && <p className="rfin-edit-error" role="alert">{error}</p>}<div className="rfin-edit-footer"><button type="button" className="rfin-reset-button" onClick={() => { setDraft(Object.fromEntries(Object.entries(DEFAULT_ROBO_FINANCE_ASSUMPTIONS).map(([key, value]) => [key, String(value)])) as Record<keyof RoboFinanceAssumptions, string>); setError(''); }}>Reset to defaults</button><button type="button" onClick={onClose}>Cancel</button><button type="submit" className="rfin-primary-button">Apply Changes</button></div></form>;
}

export const RoboWelderFinanceView = forwardRef<RoboWelderFinanceRef, RoboWelderFinanceProps>(function RoboWelderFinanceView({ timeRange, onRefreshingChange }, ref) {
  const [assumptions, setAssumptions] = useState(readRoboFinanceAssumptions);
  const [dirty, setDirty] = useState(false);
  const [updatedAt, setUpdatedAt] = useState(() => new Date());
  const [mode, setMode] = useState<RoboCostMode>('total');
  const [filter, setFilter] = useState<RoboPriority | 'All'>('All');
  const [dialog, setDialog] = useState<'edit' | 'trend' | 'insights' | null>(null);
  const [notice, setNotice] = useState('');
  const model = useMemo(() => calculateRoboFinance(assumptions, timeRange, updatedAt), [assumptions, timeRange, updatedAt]);
  useEffect(() => { onRefreshingChange?.(false); }, [onRefreshingChange]);
  useEffect(() => { if (!notice) return; const timeout = setTimeout(() => setNotice(''), 3000); return () => clearTimeout(timeout); }, [notice, updatedAt]);
  useImperativeHandle(ref, () => ({ refresh: () => { setUpdatedAt(new Date()); setNotice('Sample financial preview refreshed'); }, openNotifications: () => setDialog('insights') }), []);
  const save = () => {
    try { localStorage.setItem(ROBO_FINANCE_STORAGE_KEY, JSON.stringify(assumptions)); setDirty(false); setNotice('Robo Welder assumptions saved in this browser'); }
    catch { setNotice('Browser storage is unavailable. Your changes remain in this preview.'); }
  };
  const trendModes = <div className="rfin-trend-tabs" role="group" aria-label="Cost trend category">{(['total', 'downtime', 'energy', 'idle', 'maintenance'] as const).map((value) => <button type="button" key={value} aria-label={`View ${value} cost trend`} aria-pressed={mode === value} onClick={() => setMode(value)}>{value[0].toUpperCase() + value.slice(1)}</button>)}</div>;
  return <div className="robo-finance-root"><div className="rfin-layout"><div className="rfin-kpi-grid">
    <CostKpi title="Downtime Cost Exposure" value={model.costs.downtime} subtitle={`${formatRoboNumber(model.downtimeHours)} hrs unplanned downtime`} icon={Clock3} color="#ec2b50" />
    <CostKpi title="Energy Cost (Actual)" value={model.costs.energy} subtitle={`${formatRoboNumber(model.energyKwh)} kWh consumed (₹ ${formatRoboNumber(assumptions.tariff, 2)} / kWh)`} icon={Zap} color="#08a986" />
    <CostKpi title="Idle / Unproductive Cost" value={model.costs.idle} subtitle={`${formatRoboNumber(model.idleHours)} hrs idle running`} icon={Settings} color="#b76a00" />
    <CostKpi title="Maintenance Cost Exposure" value={model.costs.maintenance} subtitle={`${formatRoboNumber(model.maintenanceEvents, 0)} maintenance events`} icon={Wrench} color="#ee3057" />
    <CostKpi title="Total Cost Exposure" value={model.total} subtitle="Across all cost categories" icon={IndianRupee} color="#8b22ec" />
  </div><div className="rfin-visual-grid"><CostDistribution model={model} mode={mode} onSelect={setMode} /><section className="rfin-panel rfin-trend"><div className="rfin-trend-heading"><h2>Cost Trend (Last {model.trend.length} Months)</h2><button type="button" className="rfin-icon-button" aria-label="Expand financial cost trend" onClick={() => setDialog('trend')}><Maximize2 size={14} /></button></div>{trendModes}<RoboFinancialTrend months={model.trend} mode={mode} /></section><KeyTakeaway model={model} /></div><div className="rfin-bottom-grid"><SavingsTable model={model} filter={filter} onFilter={setFilter} /><AssumptionsCard assumptions={assumptions} onEdit={() => setDialog('edit')} onSave={save} dirty={dirty} /></div></div>
  <div className={`rfin-toast ${notice ? 'rfin-toast-visible' : ''}`} role="status">{notice && <><CheckCircle2 size={16} />{notice}</>}</div>
  {dialog === 'edit' && <FinanceDialog title="Edit Input Assumptions" wide onClose={() => setDialog(null)}><AssumptionEditor assumptions={assumptions} onClose={() => setDialog(null)} onApply={(value) => { setAssumptions(value); setDirty(true); setDialog(null); setNotice('Sample costs and savings recalculated'); }} /></FinanceDialog>}
  {dialog === 'trend' && <FinanceDialog title={`Cost Trend · Last ${model.trend.length} Months`} wide onClose={() => setDialog(null)}>{trendModes}<div className="rfin-expanded-trend"><RoboFinancialTrend months={model.trend} mode={mode} /></div></FinanceDialog>}
  {dialog === 'insights' && <FinanceDialog title="Financial Insights" onClose={() => setDialog(null)}><ul className="rfin-insight-list"><li><Target size={20} /><div><strong>Largest sample cost driver: {model.ranked[0].name}</strong><p>{model.ranked[0].percentage.toFixed(1)}% of exposure · {formatRoboLakhs(model.ranked[0].amount)} Lakhs in the {model.periodText}.</p></div></li><li><Leaf size={20} /><div><strong>Two high-priority savings opportunities</strong><p>Eliminate idle running and improve productive asset utilization in this sample scenario.</p></div></li><li><Settings size={20} /><div><strong>{dirty ? 'Assumptions have unsaved changes' : 'Review your sample input assumptions'}</strong><p>Adjust the cost rates and operating inputs to compare scenarios. Save retains your choices in this browser.</p></div></li></ul></FinanceDialog>}
  </div>;
});
