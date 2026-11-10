export type AssetStatus = 'Online' | 'Offline' | 'Running' | 'Idle' | 'Stopped' | 'Unknown';

/**
 * Returns 'Online' if latest current > 0 (or runState > 0), otherwise 'Offline'.
 * If latest current is explicitly provided (or runState is derived from current),
 * 0 => Offline, > 0 => Online.
 */
export function getOperatingStatus(
  runState?: number,
  loadState?: number,
  assetId?: string,
  latestCurrent?: number
): AssetStatus {
  if (typeof latestCurrent === 'number' && Number.isFinite(latestCurrent)) {
    return latestCurrent > 0 ? 'Online' : 'Offline';
  }
  if (typeof runState !== 'number' || !Number.isFinite(runState)) {
    return 'Offline';
  }
  return runState > 0 ? 'Online' : 'Offline';
}

export function getAssetStatusAppearance(status?: string) {
  switch (status?.trim().toLowerCase()) {
    case 'online':
    case 'running':
      return { label: 'Online', dotClass: 'bg-emerald-500', pillClass: 'bg-emerald-500 text-white' };
    case 'offline':
    case 'stopped':
    case 'not running':
    case 'off':
    case 'downtime':
      return { label: 'Offline', dotClass: 'bg-rose-500', pillClass: 'bg-rose-500 text-white' };
    case 'idle':
    case 'standby':
      return { label: 'Idle', dotClass: 'bg-amber-500', pillClass: 'bg-amber-500 text-white' };
    default:
      return { label: 'Offline', dotClass: 'bg-rose-500', pillClass: 'bg-rose-500 text-white' };
  }
}

export function getCompressorStatusAppearance(status: string | undefined, assetId: string) {
  const appearance = getAssetStatusAppearance(status);
  if (assetId !== 'CMP#01' && assetId !== 'CMP01' && assetId !== 'CMP#02' && assetId !== 'CMP02') {
    return appearance;
  }
  return {
    ...appearance,
    label: appearance.label === 'Online' ? 'Running' : appearance.label === 'Offline' ? 'Stop' : appearance.label,
  };
}

