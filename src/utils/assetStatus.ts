export type AssetStatus = 'Running' | 'Idle' | 'Stopped' | 'Offline' | 'Unknown';

export function getOperatingStatus(runState?: number, loadState?: number, assetId?: string): AssetStatus {
  if (typeof runState !== 'number' || !Number.isFinite(runState)) return 'Unknown';
  if (runState !== 1) return 'Stopped';
  // Compressor load/unload describes utilization, not whether the machine is running.
  const normalizedId = assetId?.trim().toUpperCase().replace('#', '');
  if (normalizedId === 'CMP01' || normalizedId === 'CMP02') return 'Running';
  return loadState === 0 ? 'Idle' : 'Running';
}

export function getAssetStatusAppearance(status?: string) {
  switch (status?.trim().toLowerCase()) {
    case 'running':
      return { label: 'Running', dotClass: 'bg-emerald-500', pillClass: 'bg-emerald-500 text-white' };
    case 'idle':
    case 'standby':
      return { label: 'Idle', dotClass: 'bg-amber-500', pillClass: 'bg-amber-500 text-white' };
    case 'offline':
      return { label: 'Offline', dotClass: 'bg-rose-500', pillClass: 'bg-rose-500 text-white' };
    case 'stopped':
    case 'not running':
    case 'off':
    case 'downtime':
      return { label: 'Stopped', dotClass: 'bg-rose-500', pillClass: 'bg-rose-500 text-white' };
    default:
      return { label: 'Unknown', dotClass: 'bg-slate-400', pillClass: 'bg-slate-400 text-white' };
  }
}
