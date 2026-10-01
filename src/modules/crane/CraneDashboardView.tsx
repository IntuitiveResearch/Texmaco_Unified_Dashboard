import { useEffect, useMemo, useRef, useState } from 'react';
import {
  ArrowRight, ArrowUpRight, ChevronRight, Clock3,
  Construction, Gauge, Power, Waves,
} from 'lucide-react';
import {
  CartesianGrid, Line, LineChart, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis,
} from 'recharts';
import craneImage from '../../assets/eot-crane.png';
import { CRANE_ASSET_STATUS } from './craneStatus';
import './crane.css';

type SensorId = 's1' | 's2' | 's3' | 's4';
type SensorFilter = SensorId | 'all';
type CranePreset = 'today' | '7days' | '30days';
type Sensor = {
  id: SensorId;
  name: string;
  location: string;
  value: number;
  normalBelow: number;
  criticalAbove: number;
  status: 'normal' | 'attention' | 'abnormal';
  color: string;
  icon: typeof Construction;
};

const SENSORS: Sensor[] = [
  { id: 's1', name: 'Column 1', location: 'Structure', value: 1.8, normalBelow: 3, criticalAbove: 5, status: 'normal', color: '#0dbd93', icon: Construction },
  { id: 's2', name: 'Column 2', location: 'Structure', value: 4.2, normalBelow: 3, criticalAbove: 5, status: 'attention', color: '#f2ac1c', icon: Construction },
  { id: 's3', name: 'Long Travel Motor', location: 'Movement', value: 2.6, normalBelow: 4, criticalAbove: 7, status: 'normal', color: '#09b988', icon: Gauge },
  { id: 's4', name: 'Hoist Motor', location: 'Lifting', value: 6.8, normalBelow: 4, criticalAbove: 6, status: 'abnormal', color: '#ef3551', icon: Gauge },
];

const PERIODS: Record<CranePreset, { label: string; availability: number; utilization: number; movingHours: number }> = {
  today: { label: 'Today', availability: 96.1, utilization: 58.2, movingHours: 6.2 },
  '7days': { label: 'Last 7 Days', availability: 94.8, utilization: 62.4, movingHours: 43.7 },
  '30days': { label: 'Last 30 Days', availability: 93.9, utilization: 60.8, movingHours: 181.2 },
};

function makeTrend(preset: CranePreset) {
  const count = preset === 'today' ? 48 : preset === '30days' ? 120 : 112;
  return Array.from({ length: count }, (_, index) => {
    const step = index / (count - 1);
    const spike = (at: number, width: number, amplitude: number) => amplitude * Math.max(0, 1 - Math.abs(step - at) / width);
    const jitter = (phase: number) => Math.sin(index * 2.31 + phase) * .21 + Math.sin(index * .83 + phase) * .16;
    const dayLabel = preset === 'today'
      ? `${String(Math.floor(index / 2)).padStart(2, '0')}:00`
      : new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric' }).format(
          new Date(Date.now() - (preset === '30days' ? 29 - Math.floor(step * 29) : 6 - Math.floor(step * 6)) * 86400000)
        );
    return {
      index,
      label: dayLabel,
      s1: Math.max(.4, 1.3 + jitter(.2) + spike(.77, .015, 1.4)),
      s2: Math.max(1, 3.3 + jitter(1.8) * 1.5 + spike(.42, .012, 3.6) + spike(.87, .025, 2.1)),
      s3: Math.max(.8, 2.2 + jitter(3.1) + spike(.58, .014, 1.1)),
      s4: Math.max(2, 4.0 + jitter(4.6) * 1.5 + spike(.42, .01, 4.1) + spike(.59, .016, 2.7) + spike(.88, .02, 3.2)),
    };
  });
}

function Sparkline({ sensor, compact = false }: { sensor: Sensor; compact?: boolean }) {
  const values = Array.from({ length: 32 }, (_, index) => {
    const noise = Math.sin(index * 2.13 + sensor.value) * 2.5 + Math.sin(index * .81 + sensor.value) * 1.7;
    const pulse = index === 17 || index === 29 ? 8 : 0;
    return `${index * 3.2},${Math.max(2, 19 - noise - pulse)}`;
  }).join(' ');
  return <svg viewBox="0 0 100 26" preserveAspectRatio="none" className={compact ? 'crane-spark compact' : 'crane-spark'} aria-hidden="true"><polyline points={values} fill="none" stroke={sensor.color} strokeWidth="1.6" vectorEffect="non-scaling-stroke" strokeLinejoin="round" /></svg>;
}

function ArcGauge({ value, color, score = false }: { value: number; color: string; score?: boolean }) {
  const arcPath = 'M 20 76 A 45 45 0 1 1 100 76';
  return (
    <div className="crane-arc" role="img" aria-label={score ? `Overall health score ${Math.round(value)} out of 100` : `${value.toFixed(1)} percent`}>
      <svg viewBox="0 0 120 90" aria-hidden="true">
        <path d={arcPath} fill="none" stroke="#e2edf8" strokeWidth="10" strokeLinecap="round" pathLength="100" />
        <path d={arcPath} fill="none" stroke={color} strokeWidth="10" strokeLinecap="round" pathLength="100" strokeDasharray={`${Math.min(100, Math.max(0, value))} 100`} />
      </svg>
      <strong>{score ? Math.round(value) : `${value.toFixed(1)}%`}</strong>
    </div>
  );
}

function TopCard({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  return <section className={`crane-top-card ${className}`}>{children}</section>;
}

export function CraneDashboardView({ datePreset, refreshKey }: { datePreset: CranePreset; refreshKey: number }) {
  const [selectedSensor, setSelectedSensor] = useState<SensorFilter>('all');
  const [refreshedAt, setRefreshedAt] = useState(() => new Date());
  const chartRef = useRef<HTMLElement>(null);
  const tableRef = useRef<HTMLElement>(null);
  const period = PERIODS[datePreset];
  const trend = useMemo(() => makeTrend(datePreset), [datePreset]);

  useEffect(() => { setRefreshedAt(new Date()); }, [refreshKey]);

  const reveal = (target: React.RefObject<HTMLElement | null>) => target.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });

  return (
    <div className="crane-dashboard">
      <div className="crane-dashboard-inner">
        <div className="crane-update-note">View refreshed {refreshedAt.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}</div>

        <div className="crane-top-grid">
          <TopCard className="crane-status-card">
            <div className="crane-card-label">Asset Status <Power size={19} /></div>
            <div className="crane-asset-status"><span /> {CRANE_ASSET_STATUS.toUpperCase()}</div>
            <p>EOT Crane - Bay 1 (10 Ton)</p>
          </TopCard>
          <TopCard>
            <div className="crane-card-label">Availability <small>({period.label})</small></div>
            <ArcGauge value={period.availability} color="#0ec69b" />
            <div className="crane-card-caption positive"><ArrowUpRight size={15} /> Target &gt; 90%</div>
          </TopCard>
          <TopCard>
            <div className="crane-card-label">Utilization <small>({period.label})</small></div>
            <ArcGauge value={period.utilization} color="#126cf2" />
            <div className="crane-card-caption"><Clock3 size={14} /> Moving Time: {period.movingHours.toFixed(1)} hrs</div>
          </TopCard>
          <TopCard>
            <div className="crane-card-label">Overall Health <small>(Real-Time)</small></div>
            <ArcGauge value={78} color="#f4a800" score />
            <div className="crane-health-note">ATTENTION <small>1 Parameter High</small></div>
          </TopCard>
        </div>

        <div className="crane-middle-grid">
          <section className="crane-panel crane-photo-panel">
            <h2><Construction size={17} /> Crane &amp; Sensor Locations</h2>
            <div className="crane-photo-stage">
              <img src={craneImage} alt="Overhead EOT crane inside a fabrication plant" />
              {SENSORS.map(sensor => (
                <button
                  key={sensor.id}
                  type="button"
                  className={`crane-hotspot ${sensor.id} ${selectedSensor === sensor.id ? 'selected' : ''}`}
                  onClick={() => setSelectedSensor(sensor.id)}
                  title={`Show ${sensor.name} vibration`}
                  aria-label={`Select ${sensor.name} sensor`}
                >
                  <span className="crane-hotspot-label">{sensor.name}<small>({sensor.id.toUpperCase()})</small></span>
                  <span className="crane-hotspot-dot" style={{ '--sensor-color': sensor.color } as React.CSSProperties} />
                </button>
              ))}
            </div>
          </section>

          <div className="crane-middle-right">
            <section className="crane-panel crane-sensor-panel">
              <div className="crane-panel-heading"><h2>Sensor Health Status <small>(Real-Time Vibration)</small></h2><button type="button" onClick={() => reveal(tableRef)}>View Details <ArrowRight size={13} /></button></div>
              <div className="crane-sensor-grid">
                {SENSORS.map(sensor => {
                  const Icon = sensor.icon;
                  return <button type="button" key={sensor.id} onClick={() => setSelectedSensor(sensor.id)} className={`crane-sensor-card ${sensor.status} ${selectedSensor === sensor.id ? 'selected' : ''}`}>
                    <div className="crane-sensor-title"><Icon size={24} color={sensor.color} /><span><strong>{sensor.name}</strong><small>({sensor.location})</small></span><ChevronRight size={15} /></div>
                    <span className="crane-sensor-status">{sensor.status === 'normal' ? '✓' : sensor.status === 'attention' ? '!' : '✦'} {sensor.status.toUpperCase()}</span>
                    <span className="crane-sensor-reading">RMS Vibration <strong>{sensor.value.toFixed(1)} <small>mm/s</small></strong></span>
                    <span className="crane-sensor-limits"><span>Normal &lt; {sensor.normalBelow.toFixed(1)}</span><span>Critical &gt; {sensor.criticalAbove.toFixed(1)}</span></span>
                    <span className="crane-sensor-trend-label">Recent vibration</span>
                    <Sparkline sensor={sensor} />
                  </button>;
                })}
              </div>
            </section>

          </div>
        </div>

        <div className="crane-bottom-grid">
          <section className="crane-panel crane-trends-panel" ref={chartRef}>
            <div className="crane-panel-heading"><h2>Vibration Trends <small>({period.label})</small></h2><label className="crane-filter">Select Sensor <select value={selectedSensor} onChange={event => setSelectedSensor(event.target.value as SensorFilter)}><option value="all">All Sensors</option>{SENSORS.map(sensor => <option key={sensor.id} value={sensor.id}>{sensor.name}</option>)}</select></label></div>
            <div className="crane-chart-legend">{SENSORS.filter(sensor => selectedSensor === 'all' || selectedSensor === sensor.id).map(sensor => <span key={sensor.id}><i style={{ background: sensor.color }} /> {sensor.name} ({sensor.id.toUpperCase()})</span>)}<span className="limit"><i /> Attention Limit</span><span className="limit critical"><i /> Critical Limit</span></div>
            <div className="crane-chart-wrap">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={trend} margin={{ top: 6, right: 10, left: -20, bottom: 0 }}>
                  <CartesianGrid stroke="#e7edf5" strokeDasharray="3 3" vertical={false} />
                  <XAxis dataKey="index" type="number" domain={[0, trend.length - 1]} tickCount={datePreset === 'today' ? 5 : 7} tickFormatter={value => trend[Math.min(trend.length - 1, Math.max(0, Math.round(value)))]?.label ?? ''} tick={{ fontSize: 10, fill: '#60718a' }} axisLine={false} tickLine={false} />
                  <YAxis domain={[0, 10]} tickCount={6} tick={{ fontSize: 10, fill: '#60718a' }} axisLine={false} tickLine={false} unit="" />
                  <Tooltip labelFormatter={value => trend[Number(value)]?.label ?? ''} formatter={(value, name) => [`${Number(value).toFixed(1)} mm/s`, SENSORS.find(sensor => sensor.id === name)?.name ?? name]} />
                  <ReferenceLine y={5} stroke="#e9a91a" strokeDasharray="7 4" />
                  <ReferenceLine y={8} stroke="#e93a55" strokeDasharray="7 4" />
                  {SENSORS.filter(sensor => selectedSensor === 'all' || selectedSensor === sensor.id).map(sensor => <Line key={sensor.id} dataKey={sensor.id} type="monotone" stroke={sensor.color} strokeWidth={1.9} dot={false} isAnimationActive={false} />)}
                </LineChart>
              </ResponsiveContainer>
            </div>
            <p className="crane-chart-caption"><Waves size={13} /> Illustrative vibration readings for the selected period (mm/s)</p>
          </section>

          <section className="crane-panel crane-table-panel" ref={tableRef}>
            <div className="crane-panel-heading"><h2>Current Vibration Levels &amp; Thresholds</h2><button type="button" onClick={() => setSelectedSensor('all')}>View All Data <ArrowRight size={13} /></button></div>
            <div className="crane-table-scroll"><table><thead><tr><th>Sensor</th><th>Current RMS<br />(mm/s)</th><th>Normal (&lt;)</th><th>Attention</th><th>Critical (&gt;)</th><th>Status</th><th>Trend (Last 24h)</th></tr></thead><tbody>{SENSORS.map(sensor => <tr key={sensor.id} className={selectedSensor === sensor.id ? 'selected' : ''} onClick={() => setSelectedSensor(sensor.id)}><th>{sensor.name} ({sensor.id.toUpperCase()})</th><td className={sensor.status === 'abnormal' ? 'danger' : ''}>{sensor.value.toFixed(1)}</td><td>&lt; {sensor.normalBelow.toFixed(1)}</td><td>{sensor.normalBelow.toFixed(1)} – {sensor.criticalAbove.toFixed(1)}</td><td>&gt; {sensor.criticalAbove.toFixed(1)}</td><td><span className={`crane-table-status ${sensor.status}`}>{sensor.status.toUpperCase()}</span></td><td><Sparkline sensor={sensor} compact /></td></tr>)}</tbody></table></div>
          </section>
        </div>
      </div>
    </div>
  );
}
