import type { KpiMetrics, LatestTelemetry } from '../types';
import { MIG_ASSET_ID, MIG_ASSET_TAG, MIG_HEALTH_SCORES } from '../data/migSample';

export const COMPRESSOR_1_OVERALL_HEALTH = 56;

export const ROBO_HEALTH_SCORES = {
  electrical: 88,
  mechanical: 82,
  thermal: 83,
  power: 85,
  operational: 86.3,
} as const;

export function getRoboOverallHealth(): number {
  const { electrical, mechanical, thermal, power, operational } = ROBO_HEALTH_SCORES;
  return Math.round(electrical * .25 + mechanical * .25 + thermal * .2 + power * .15 + operational * .15);
}

export function getOverallHealthScore(latest: LatestTelemetry, kpis?: KpiMetrics): number {
  const currentScore = latest.current?.health_score ?? 78;
  const vibScore = latest.motioniq?.health_score ?? 62;
  const tempScore = latest.temperature?.health_score ?? 38;
  const mfmScore = latest.mfm?.health_score ?? 70;
  const opScore = latest.kpi?.availability_pct ?? kpis?.availability ?? 82;

  return Math.round((
    currentScore * 0.25 +
    vibScore * 0.25 +
    tempScore * 0.2 +
    (mfmScore > 0 ? mfmScore * 0.15 : 0) +
    (opScore > 0 ? opScore * 0.15 : 0)
  ) * 10) / 10;
}

export function getDisplayedOverallHealth(latest: LatestTelemetry, kpis?: KpiMetrics, assetId?: string): number {
  if (assetId === MIG_ASSET_ID || assetId === MIG_ASSET_TAG) return MIG_HEALTH_SCORES.overall;
  if (assetId === 'CMP#01' || assetId === 'CMP01') return COMPRESSOR_1_OVERALL_HEALTH;
  return getOverallHealthScore(latest, kpis) || 82;
}
