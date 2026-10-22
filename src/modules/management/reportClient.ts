import type { ReportResponse } from './reportTypes';

const inFlight = new Map<string, Promise<ReportResponse>>();

export function requestCompressorReport(compressor: string): Promise<ReportResponse> {
  const existing = inFlight.get(compressor);
  if (existing) return existing;
  const request = (async () => {
    const response = await fetch('/api/analyze-report', {
      method: 'POST', headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify({ compressor }), signal: AbortSignal.timeout(140000),
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
  })().finally(() => inFlight.delete(compressor));
  inFlight.set(compressor, request);
  return request;
}
