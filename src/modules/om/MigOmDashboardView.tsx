import { Activity, BarChart3, CheckCircle2, Clock3, PauseCircle, Radio, Waves } from 'lucide-react';
import { ScreenFitContainer } from '../../components/ScreenFitContainer';
import { HealthGauges } from './components/HealthGauges';
import { MachineHeaderCard } from './components/MachineHeaderCard';
import { getMockKpiData } from './data/mockData';
import { MIG_ASSET_ID, MIG_HEALTH_SCORES, MIG_OPERATIONAL_SUMMARY } from './data/migSample';

const base = getMockKpiData(MIG_ASSET_ID);
const migKpis = {
  ...base.kpis,
  availability: MIG_OPERATIONAL_SUMMARY.availability,
  utilization: MIG_OPERATIONAL_SUMMARY.utilization,
};
const migLatest = {
  ...base.latest,
  current: { ...base.latest.current, run_state: 0, load_state: 0, health_score: MIG_HEALTH_SCORES.electrical },
  motioniq: { ...base.latest.motioniq, health_score: MIG_HEALTH_SCORES.mechanical },
  temperature: { ...base.latest.temperature, health_score: MIG_HEALTH_SCORES.thermal },
  mfm: { ...base.latest.mfm, health_score: MIG_HEALTH_SCORES.power },
  kpi: { ...base.latest.kpi, availability_pct: MIG_OPERATIONAL_SUMMARY.availability },
};

const metrics = [
  { label: 'Availability', value: `${MIG_OPERATIONAL_SUMMARY.availability.toFixed(1)}%`, icon: CheckCircle2, color: '#10bf83' },
  { label: 'Utilization', value: `${MIG_OPERATIONAL_SUMMARY.utilization.toFixed(1)}%`, icon: BarChart3, color: '#2378f2' },
  { label: 'Active welding time', value: `${MIG_OPERATIONAL_SUMMARY.activeWeldingHours.toFixed(2)} hrs`, icon: Clock3, color: '#00be85' },
  { label: 'Idle time', value: `${MIG_OPERATIONAL_SUMMARY.idleHours.toFixed(2)} hrs`, icon: PauseCircle, color: '#f59e0b' },
  { label: 'Welding cycles', value: String(MIG_OPERATIONAL_SUMMARY.weldingCycles), icon: Activity, color: '#8c25f5' },
];

export function MigOmDashboardView() {
  return (
    <ScreenFitContainer className="bg-[#f4f7fb]">
      <div className="flex-1 min-h-0 overflow-y-auto">
        <div className="w-full px-2 sm:px-3 2xl:px-4 pt-2 pb-4 space-y-2">
          <section className="grid grid-cols-1 lg:grid-cols-12 gap-1.5">
            <div className="lg:col-span-4">
              <MachineHeaderCard
                compressorId={MIG_ASSET_ID}
                assetMeta={{ id: MIG_ASSET_ID, name: 'MIG Welding Machine', plant: 'Texmaco - Agarpara', deviceId: MIG_ASSET_ID, type: 'MIG Welder', status: 'Stopped' }}
                runState={0}
                loadState={0}
                hideCycleId
              />
            </div>
            <div className="lg:col-span-8">
              <HealthGauges latest={migLatest} kpis={migKpis} assetId={MIG_ASSET_ID} overallDescription="Health within normal range" />
            </div>
          </section>

          <section className="bg-white rounded-xl border border-slate-200/90 p-3 sm:px-4 sm:py-3 shadow-2xs" aria-label="MIG operational summary">
            <h2 className="text-sm sm:text-[15px] font-bold text-slate-800 tracking-tight border-b border-slate-100 pb-2 mb-2">
              Operational Summary
            </h2>
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2.5">
              {metrics.map(({ label, value, icon: Icon, color }) => (
                <div key={label} className="min-w-0 min-h-[66px] px-3 py-2.5 rounded-lg bg-slate-50 border border-slate-100">
                  <span className="block text-[12px] 2xl:text-[13px] font-bold text-slate-800">{label}</span>
                  <div className="flex items-center gap-2 mt-1.5">
                    <Icon size={18} color={color} className="shrink-0" />
                    <strong className="text-[19px] 2xl:text-[22px] font-semibold text-slate-900 whitespace-nowrap tabular-nums">{value}</strong>
                  </div>
                </div>
              ))}
            </div>
          </section>

          <section className="rounded-xl border border-emerald-200 bg-emerald-50/70 shadow-2xs overflow-hidden" aria-label="Current live trend">
            <div className="flex items-center gap-2 px-3 py-2 border-b border-emerald-100 text-slate-800">
              <span className="w-5 h-5 rounded-full bg-emerald-500 text-white flex items-center justify-center"><Activity size={13} /></span>
              <h2 className="text-sm font-bold">Current Live Trend</h2>
              <span className="ml-auto text-[10px] font-semibold text-slate-500">No live feed</span>
            </div>
            <div className="min-h-44 flex flex-col items-center justify-center gap-1 text-center px-4 py-6">
              <Waves size={26} className="text-slate-400" />
              <strong className="text-sm text-slate-700">No current trend data yet</strong>
              <span className="text-xs text-slate-500">The graph will appear when live MIG current telemetry is available.</span>
            </div>
          </section>

          <section className="grid grid-cols-1 md:grid-cols-2 gap-1.5" aria-label="MIG telemetry status">
            <div className="bg-white rounded-xl border border-slate-200/90 p-3 shadow-2xs">
              <h2 className="flex items-center gap-2 text-xs font-bold text-slate-800"><Radio size={16} className="text-blue-600" /> Communications Health</h2>
              <p className="text-[11px] text-slate-500 mt-2">Live sensor communication is not available for this machine.</p>
            </div>
            <div className="bg-white rounded-xl border border-slate-200/90 p-3 shadow-2xs">
              <h2 className="flex items-center gap-2 text-xs font-bold text-slate-800"><Activity size={16} className="text-blue-600" /> Active Advisories</h2>
              <p className="text-[11px] text-slate-500 mt-2">No live advisory feed is connected for this machine.</p>
            </div>
          </section>
        </div>
      </div>
    </ScreenFitContainer>
  );
}
