import { useEffect, useState } from 'react';
import { Activity, ArrowUpRight, BarChart3, ChevronRight, Clock3, IndianRupee, Leaf, Radio } from 'lucide-react';
import type { AssetStatus } from '../../utils/assetStatus';
import { getCompressorStatusAppearance } from '../../utils/assetStatus';
import { fetchOperationalKpi } from '../om/services/kpiService';
import { fetchWeldingData } from '../om/services/weldingService';
import { getRangeDates } from '../om/utils/dateUtils';
import { COMPRESSOR_1_OVERALL_HEALTH, getDisplayedOverallHealth, getRoboOverallHealth } from '../om/utils/overallHealth';
import { MIG_ASSET_ID, MIG_HEALTH_SCORES, MIG_OPERATIONAL_SUMMARY } from '../om/data/migSample';
import { CRANE_ASSET_STATUS } from '../crane/craneStatus';
import { fetchDashboardData } from '../management/api';
import { fetchFinancialIntel } from '../finance/services/api';
import { getFinancialSummary } from '../finance/summary';
import { ASSET_OPTIONS } from '../finance/mockData';
import type { DashboardData } from '../management/types';
import cmp01Image from '../../assets/CMP01.jpeg';
import cmp02Image from '../../assets/CMP02.jpeg';
import cncImage from '../../assets/CNC01.jpeg';
import roboImage from '../../assets/weldwise-robotic-cell.jpg';
import craneImage from '../../assets/eot-crane.png';
import migImage from '../../assets/mig-welder.png';
import './overview.css';

type ConnectedId = 'CMP#01' | 'CMP#02' | 'CNC#01' | 'ROBO#01';
type RoutableId = ConnectedId | 'CRANE#01' | typeof MIG_ASSET_ID;
type CardId = RoutableId;
type CardValues = {
  availability: number | null;
  utilization: number | null;
  health: number | null;
  exposure: number | null;
  savings: number | null;
  financialSample?: boolean;
  trend: number[];
};

type AssetCard = {
  id: CardId;
  title: string;
  model: string;
  image: string;
  mock?: boolean;
  mockStatus?: AssetStatus;
  values?: CardValues;
};

const mockTrend = (level: number, phase: number) => Array.from({ length: 30 }, (_, day) =>
  Math.max(3, Math.min(95, level + Math.sin(day * .75 + phase) * 10 + Math.sin(day * 1.9 + phase) * 5))
);

const CARDS: AssetCard[] = [
  { id: 'CMP#01', title: 'Compressor 1', model: 'Atlas Copco GA 110 VSD+', image: cmp01Image },
  { id: 'CMP#02', title: 'Compressor 2', model: 'Atlas Copco GA 90 FF', image: cmp02Image },
  { id: 'CNC#01', title: 'CNC Plasma Cutter', model: 'Texmaco Precision Plasma', image: cncImage },
  { id: 'ROBO#01', title: 'Robotic Welding Machine', model: 'Texmaco Robotic Welding Cell', image: roboImage },
  {
    id: 'CRANE#01', title: 'EOT Crane', model: '10 Ton EOT Crane · Bay 1', image: craneImage,
    mock: true, mockStatus: CRANE_ASSET_STATUS,
    values: { availability: 94.8, utilization: 62.4, health: 78, exposure: 82000, savings: 33000, trend: mockTrend(62, 2) },
  },
  {
    id: MIG_ASSET_ID, title: 'MIG Welding Machine', model: 'Fronius MIG 400', image: migImage,
    mock: true, mockStatus: 'Offline',
    values: { availability: MIG_OPERATIONAL_SUMMARY.availability, utilization: MIG_OPERATIONAL_SUMMARY.utilization, health: MIG_HEALTH_SCORES.overall, exposure: 452000, savings: 278000, trend: [] },
  },
];

const CONNECTED_IDS: ConnectedId[] = ['CMP#01', 'CMP#02', 'CNC#01', 'ROBO#01'];
const sampleFinancialSummary = getFinancialSummary();
const EMPTY_VALUES: CardValues = {
  availability: null, utilization: null, health: null,
  exposure: sampleFinancialSummary.exposure, savings: sampleFinancialSummary.savings,
  financialSample: true, trend: [],
};
const defaultValuesFor = (id: ConnectedId): CardValues =>
  id === 'CMP#01' ? { ...EMPTY_VALUES, health: COMPRESSOR_1_OVERALL_HEALTH }
    : id === 'ROBO#01' ? { ...EMPTY_VALUES, health: getRoboOverallHealth() }
      : EMPTY_VALUES;
const API_IDS: Record<ConnectedId, string> = {
  'CMP#01': 'CMP#01',
  'CMP#02': 'CMP#02',
  'CNC#01': 'MACHINE#PI4G/TXMCNCI/26001',
  'ROBO#01': 'MACHINE#PI4G/TXMMIGI/26001',
};

function trendFromDashboard(data: DashboardData): number[] {
  const runtimeByDate = new Map((data?.graphs?.runtime_distribution ?? []).map(day => [day.date, day.runtime]));
  return (data?.graphs?.utilization ?? [])
    .slice()
    .sort((a, b) => a.date.localeCompare(b.date))
    .slice(-30)
    .map(day => {
      if (typeof day.value === 'number') return Math.max(0, Math.min(100, day.value));
      const runtime = runtimeByDate.get(day.date) ?? (day.loaded + day.unloaded + day.idle);
      return runtime > 0 ? Math.max(0, Math.min(100, day.loaded / runtime * 100)) : 0;
    });
}

function formatPercent(value: number | null): string {
  return value === null ? '—' : `${value.toFixed(1)}%`;
}

function formatLakhs(value: number | null): string {
  return value === null ? '—' : `₹ ${(value / 100000).toFixed(2)} Lakhs`;
}

function Trend({ values, color }: { values: number[]; color: string }) {
  if (values.length < 2) return <div className="overview-trend-empty">Trend unavailable</div>;
  const points = values.map((value, index) => `${(index / (values.length - 1) * 100).toFixed(2)},${(36 - value * .32).toFixed(2)}`).join(' ');
  return (
    <svg className="overview-trend" viewBox="0 0 100 38" preserveAspectRatio="none" role="img" aria-label="Last 30 days utilization trend">
      <line x1="0" y1="36" x2="100" y2="36" stroke="#e6edf4" strokeWidth=".7" />
      <polyline points={points} fill="none" stroke={color} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" vectorEffect="non-scaling-stroke" />
    </svg>
  );
}

function Gauge({ label, value, color, icon: Icon, score = false }: {
  label: string; value: number | null; color: string; icon: typeof Activity; score?: boolean;
}) {
  const percent = value === null ? 0 : Math.max(0, Math.min(100, value));
  return (
    <div className="overview-gauge-tile">
      <div className="overview-tile-label"><span className="overview-tile-icon"><Icon size={13} /></span>{label}</div>
      <div className="overview-gauge-row">
        <span className="overview-ring" style={{ background: `conic-gradient(${color} ${percent}%, #e5edf5 ${percent}% 100%)` }} aria-hidden="true" />
        <strong>{score ? (value === null ? '—' : Math.round(value)) : formatPercent(value)}</strong>
      </div>
    </div>
  );
}

function AssetOverviewCard({ card, values, status, loading, onOpenAsset }: {
  card: AssetCard; values: CardValues; status: AssetStatus; loading: boolean; onOpenAsset: (id: RoutableId) => void;
}) {
  const connected = !card.mock;
  const clickable = connected || card.id === 'CRANE#01' || card.id === MIG_ASSET_ID;
  const hasMeasurements = values.availability !== null || values.utilization !== null || values.health !== null;
  const appearance = getCompressorStatusAppearance(status, card.id);
  const healthColor = values.health !== null && values.health < 70 ? '#f43f5e' : values.health !== null && values.health < 80 ? '#f4b414' : '#16c89b';
  const trendColor = status === 'Stopped' || status === 'Offline' ? '#ed3855' : status === 'Idle' ? '#eeae1d' : '#18bf93';
  return (
    <article
      className="overview-card"
      data-clickable={clickable}
      role={clickable ? 'button' : undefined}
      tabIndex={clickable ? 0 : undefined}
      aria-label={clickable ? `Open ${card.title} O&M dashboard` : undefined}
      onClick={clickable ? () => onOpenAsset(card.id as RoutableId) : undefined}
      onKeyDown={clickable ? event => {
        if (event.key === 'Enter' || event.key === ' ') {
          event.preventDefault();
          onOpenAsset(card.id as RoutableId);
        }
      } : undefined}
    >
      <div className="overview-card-photo">
        <img className="overview-card-photo-backdrop" src={card.image} alt="" aria-hidden="true" />
        <img className="overview-card-photo-image" src={card.image} alt={card.title} />
        <span className={`overview-status overview-status-${appearance.label.toLowerCase()}`}><span />{appearance.label.toUpperCase()}</span>
        <Radio className="overview-radio" size={18} aria-label={card.mock ? 'Machine status' : 'Connected machine'} />
      </div>
      <div className="overview-card-body">
        <div className="overview-card-heading">
          <div><h2>{card.title}</h2><p>{card.model}</p></div>
          {clickable && <ChevronRight size={20} aria-hidden="true" />}
        </div>
        <div className="overview-gauges">
          <Gauge label="Availability" value={values.availability} color={values.availability !== null && values.availability < 80 ? '#f43f5e' : '#16c89b'} icon={Clock3} />
          <Gauge label="Utilization" value={values.utilization} color="#1779e8" icon={BarChart3} />
          <Gauge label="Health Score" value={values.health} color={healthColor} icon={Activity} score />
        </div>
        <div className="overview-finance">
          <div className="overview-finance-box exposure"><span className="overview-finance-icon"><IndianRupee size={17} /></span><div><small>Financial Exposure<br />(1 Month)</small><strong>{formatLakhs(values.exposure)}</strong></div></div>
          <div className="overview-finance-box savings"><span className="overview-finance-icon"><Leaf size={17} /></span><div><small>Savings Opportunity<br />(1 Month)</small><strong>{formatLakhs(values.savings)}</strong></div></div>
        </div>
        <div className="overview-trend-label">Last 30 Days · Utilization Trend</div>
        <Trend values={values.trend} color={trendColor} />
        <div className="overview-card-footer">
          {!card.mock && <span className="overview-data-tag">{loading ? 'Loading data…' : hasMeasurements ? 'Connected asset' : 'Operational data unavailable'}</span>}
          {clickable && <span className="overview-open">Open O&M <ArrowUpRight size={14} /></span>}
        </div>
      </div>
    </article>
  );
}

export function AssetOverviewView({ statuses, refreshKey, onOpenAsset }: {
  statuses: Record<string, AssetStatus>;
  refreshKey: number;
  onOpenAsset: (id: RoutableId) => void;
}) {
  const [values, setValues] = useState<Partial<Record<ConnectedId, CardValues>>>({});
  const [settled, setSettled] = useState<Partial<Record<ConnectedId, boolean>>>({});

  useEffect(() => {
    let active = true;
    const { start, end } = getRangeDates('30days');
    const force = refreshKey > 0;

    for (const id of CONNECTED_IDS) {
      const operational = id === 'ROBO#01'
        ? fetchWeldingData(API_IDS[id], start, end, force).then(data => {
            const summary = data.operational_summary;
            return {
              availability: summary.availability_percentage,
              utilization: summary.utilization_percentage,
              // Match the fixed health inputs already used by the Robo Welder O&M view.
              health: getRoboOverallHealth(),
            };
          })
        : fetchOperationalKpi(id, start, end, '30days', force).then(data => ({
            availability: data.kpis.availability,
            utilization: data.kpis.utilization,
            health: getDisplayedOverallHealth(data.latest, data.kpis, id),
          }));

      const financeAsset = ASSET_OPTIONS.find(asset => asset.name === id)!;
      const requests = [
        operational.then(result => { if (active) setValues(previous => ({ ...previous, [id]: { ...defaultValuesFor(id), ...previous[id], ...result } })); }),
        fetchDashboardData(API_IDS[id], start, end, force).then(data => {
          const trend = trendFromDashboard(data);
          if (active) setValues(previous => ({ ...previous, [id]: { ...defaultValuesFor(id), ...previous[id], trend } }));
        }),
        fetchFinancialIntel(financeAsset.asset, '1m', force)
          .then(data => getFinancialSummary(data), () => getFinancialSummary())
          .then(summary => {
            if (active) setValues(previous => ({
              ...previous,
              [id]: {
                ...defaultValuesFor(id), ...previous[id],
                exposure: summary.exposure, savings: summary.savings,
                financialSample: summary.sample,
              },
            }));
          }),
      ];
      void Promise.allSettled(requests).then(() => {
        if (active) setSettled(previous => ({ ...previous, [id]: true }));
      });
    }
    return () => { active = false; };
  }, [refreshKey]);

  return (
    <section className="overview-page" aria-label="Plant asset overview">
      <div className="overview-grid">
        {CARDS.map(card => (
          <AssetOverviewCard
            key={card.id}
            card={card}
            values={card.values ?? values[card.id as ConnectedId] ?? defaultValuesFor(card.id as ConnectedId)}
            status={card.mock ? card.mockStatus! : statuses[card.id] ?? 'Online'}
            loading={!card.mock && !settled[card.id as ConnectedId]}
            onOpenAsset={onOpenAsset}
          />
        ))}
      </div>
    </section>
  );
}
