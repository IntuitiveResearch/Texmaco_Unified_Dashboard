import type { ReportResponse } from './reportTypes';

const inFlight = new Map<string, Promise<ReportResponse>>();

export interface RequestReportOptions {
  startDate?: string;
  endDate?: string;
  datePreset?: string;
  availability?: number | null;
  utilization?: number | null;
}

export function requestCompressorReport(compressor: string, options: RequestReportOptions = {}): Promise<ReportResponse> {
  const cacheKey = `${compressor}_${options.startDate || ''}_${options.endDate || ''}`;
  const existing = inFlight.get(cacheKey);
  if (existing) return existing;
  const request = (async () => {
    const response = await fetch('/api/analyze-report', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify({
        compressor,
        start_date: options.startDate,
        end_date: options.endDate,
        date_preset: options.datePreset,
        availability: options.availability,
        utilization: options.utilization,
      }),
      signal: AbortSignal.timeout(140000),
    });
    const body = await response.json();
    if (!response.ok) throw new Error(body.error || `Report request failed (HTTP ${response.status}).`);
    const assetId = body?.context?.asset?.id;
    const matchesAsset = assetId === compressor ||
      body?.context?.asset?.original_id === compressor ||
      (compressor.includes('TXMCNCI') && assetId === 'CNC#01') ||
      (compressor.includes('TXMMIGI') && assetId === 'ROBO#01') ||
      (compressor === 'CNC#01' && assetId === 'CNC#01') ||
      (compressor === 'ROBO#01' && assetId === 'ROBO#01');
    if (!body.report || !body.context || !matchesAsset) throw new Error('The report response is invalid.');
    return body as ReportResponse;
  })().finally(() => inFlight.delete(cacheKey));
  inFlight.set(cacheKey, request);
  return request;
}
