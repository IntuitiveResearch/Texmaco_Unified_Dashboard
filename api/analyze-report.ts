import type { IncomingMessage, ServerResponse } from 'node:http';
import { generateReportOnce, ReportError } from '../server/report-service.mjs';

// Supported by Vercel deployments with this execution-duration allowance.
export const config = { maxDuration: 150 };

export default async function handler(req: IncomingMessage & { body?: unknown }, res: ServerResponse) {
  res.setHeader('Content-Type', 'application/json');
  res.setHeader('Cache-Control', 'no-store');
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    res.statusCode = 405;
    res.end(JSON.stringify({ error: 'Method not allowed.' }));
    return;
  }
  try {
    let body = req.body;
    if (body === undefined) {
      let text = '';
      for await (const chunk of req) {
        text += chunk.toString();
        if (Buffer.byteLength(text) > 65536) throw new ReportError('Request is too large.', 413);
      }
      body = text;
    }
    if (typeof body === 'string') {
      if (Buffer.byteLength(body) > 65536) throw new ReportError('Request is too large.', 413);
      try { body = JSON.parse(body); } catch { throw new ReportError('Invalid JSON request.', 400); }
    }
    const targetAsset = (body as any)?.compressor || (body as any)?.asset;
    if (!targetAsset || typeof targetAsset !== 'string') throw new ReportError('A compressor or asset ID is required.', 400);

    const startDate = (body as any)?.start_date || (body as any)?.startDate;
    const endDate = (body as any)?.end_date || (body as any)?.endDate;
    const datePreset = (body as any)?.date_preset || (body as any)?.datePreset;
    const availability = typeof (body as any)?.availability === 'number' ? (body as any).availability : undefined;
    const utilization = typeof (body as any)?.utilization === 'number' ? (body as any).utilization : undefined;

    const result = await generateReportOnce(targetAsset, {
      startDate,
      endDate,
      datePreset,
      availability,
      utilization,
    });
    if (!res.destroyed) { res.statusCode = 200; res.end(JSON.stringify(result)); }
  } catch (error) {
    if (!res.destroyed) {
      res.statusCode = error instanceof ReportError ? error.status : 500;
      res.end(JSON.stringify({ error: error instanceof ReportError ? error.message : 'Report generation failed. Please retry.' }));
    }
  }
}
