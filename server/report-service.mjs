import { assembleReportInput, reportWindow, SUPPORTED_ASSETS } from './report-data.mjs';
import { PROMPT_VERSION, REPORT_SCHEMA, getSystemPrompt } from './report-prompt.mjs';
import { buildAssetKnowledge } from './compressor-knowledge.mjs';
import { canonicalAssetId, getAssetApiIdentifier } from '../shared/asset-equipment.mjs';

const AWS_BASE = 'https://2zkaym7w85.execute-api.ap-south-1.amazonaws.com';
export class ReportError extends Error {
  constructor(message, status = 502) { super(message); this.status = status; }
}

// Validate again after generation: JSON formatting alone is not a complete contract.
export function validateReport(value, knowledgeContext) {
  const validText = v => typeof v === 'string' && v.trim().length > 0 && v.length <= 6000;
  for (const field of ['overall_health', 'severity', 'executive_summary']) {
    if (!validText(value?.[field])) throw new ReportError(`Report is missing a valid ${field} section.`);
  }
  for (const field of ['severity', 'overall_health']) {
    if (!REPORT_SCHEMA.properties[field].enum.includes(value[field])) throw new ReportError(`Report has an invalid ${field}.`);
  }
  if (!Array.isArray(value.limitations) || !value.limitations.every(validText)) throw new ReportError('Report limitations are invalid.');
  const domains = ['Availability', 'Reliability', 'Electrical', 'Thermal', 'Vibration'];
  if (!Array.isArray(value.conditions) || value.conditions.length !== 5 || !domains.every(domain => value.conditions.filter(row => row?.domain === domain).length === 1)
    || !value.conditions.every(row => validText(row.condition) && validText(row.detail) && ['High', 'Medium', 'Low', 'Unknown'].includes(row.concern))) {
    throw new ReportError('Report must contain five distinct condition assessments, including vibration.');
  }
  value.conditions.sort((a, b) => domains.indexOf(a.domain) - domains.indexOf(b.domain));
  if (!Array.isArray(value.root_causes) || value.root_causes.length > 3 || !value.root_causes.every(cause =>
    cause && ['cause', 'key_evidence', 'verification'].every(key => validText(cause[key]))
    && ['Suspected', 'Not established'].includes(cause.status)
    && ['High', 'Medium', 'Low', 'Insufficient'].includes(cause.confidence)
    && (cause.status !== 'Not established' || cause.confidence === 'Insufficient'))) {
    throw new ReportError('Report root causes need evidence, qualitative confidence and verification.');
  }
  if (knowledgeContext && knowledgeContext.rules && knowledgeContext.rules.length > 0) {
    const candidates = new Map(knowledgeContext.rules.filter(rule => rule.kind === 'candidate_hypothesis').map(rule => [rule.id, rule]));
    for (const cause of value.root_causes) {
      const rule = candidates.get(cause.knowledge_rule_id);
      const references = cause.supporting_observation_ids;
      if (!rule || !Array.isArray(references) || !references.length || references.length !== new Set(references).size
        || !references.every(id => rule.supporting_observation_ids.includes(id))) {
        throw new ReportError('A generated root cause is not supported by the selected equipment evidence. Please retry.');
      }
    }
  }
  if (!['now', 'weeks', 'if_ignored'].every(key => validText(value.risk_timeline?.[key]))) {
    throw new ReportError('Report risk timeline is incomplete.');
  }
  const categories = ['Immediate', 'Preventive', 'Monitor'];
  if (!Array.isArray(value.recommendations) || value.recommendations.length !== 3 || !categories.every(category => value.recommendations.filter(row => row?.category === category).length === 1)) {
    throw new ReportError('Report must contain the 3 action categories: Immediate, Preventive and Monitor.');
  }
  for (const action of value.recommendations) {
    if (!['why_it_matters', 'timing', 'responsible_role', 'verification'].every(key => validText(action[key]))
      || !Array.isArray(action.actions) || !action.actions.length || action.actions.length > 2 || !action.actions.every(validText)) {
      throw new ReportError('Report contains an incomplete recommendation.');
    }
  }
  value.recommendations.sort((a, b) => categories.indexOf(a.category) - categories.indexOf(b.category));
  return Object.fromEntries(REPORT_SCHEMA.required.map(key => [key, value[key]]));
}

async function fetchJson(fetchImpl, url, init, label) {
  try {
    const response = await fetchImpl(url, { ...init, signal: AbortSignal.timeout(25000) });
    if (!response.ok) throw new ReportError(`${label} is unavailable (HTTP ${response.status}).`);
    return await response.json();
  } catch (error) {
    if (error instanceof ReportError) throw error;
    throw new ReportError(`${label} could not be fetched. Please retry.`, 502);
  }
}

export async function generateReport(asset, { env = process.env, fetchImpl = fetch, now = new Date() } = {}) {
  const canonical = canonicalAssetId(asset);
  if (!canonical || !SUPPORTED_ASSETS.includes(canonical)) {
    throw new ReportError('Reports currently support Compressor 1, Compressor 2, CNC 1, and Robo Welder 1 only.', 400);
  }
  if (!env.GEMINI_API_KEY?.trim()) throw new ReportError('Report service is not configured. Set GEMINI_API_KEY on the server.', 503);
  const model = env.GEMINI_MODEL || 'gemini-2.5-flash';
  if (!/^[a-zA-Z0-9._-]+$/.test(model)) throw new ReportError('GEMINI_MODEL is invalid.', 503);

  const dates = reportWindow(now);
  const apiId = getAssetApiIdentifier(canonical);
  const query = new URLSearchParams({ compressor: apiId, start_date: dates.snapshot_date, end_date: dates.snapshot_date, option: 'today' });

  const [history, snapshot] = await Promise.all([
    fetchJson(fetchImpl, env.MANAGEMENT_DASHBOARD_ENDPOINT || `${AWS_BASE}/dashboard`, {
      method: 'POST', headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify({ compressor: apiId, start_date: dates.start_date, end_date: dates.end_date }),
    }, 'Historical telemetry'),
    fetchJson(fetchImpl, `${env.OPERATIONAL_KPI_ENDPOINT || `${AWS_BASE}/operational_kpi`}?${query}`, {
      headers: { Accept: 'application/json', 'Cache-Control': 'no-cache' },
    }, 'Latest telemetry').catch(() => ({ compressor: apiId, latest: {} })),
  ]);

  let input;
  try { input = assembleReportInput(canonical, history, snapshot, now); }
  catch (error) { throw new ReportError(error.message); }

  input.knowledge_context = buildAssetKnowledge(input);
  const systemPrompt = getSystemPrompt(input.asset);

  let response;
  try {
    // Use Gemini REST server-side, keeping credentials out of Vite's browser bundle.
    response = await fetchImpl(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-goog-api-key': env.GEMINI_API_KEY },
      signal: AbortSignal.timeout(90000),
      body: JSON.stringify({
        systemInstruction: { parts: [{ text: systemPrompt }] },
        contents: [{ role: 'user', parts: [{ text: JSON.stringify(input) }] }],
        generationConfig: { responseMimeType: 'application/json', responseSchema: REPORT_SCHEMA, maxOutputTokens: 12000 },
      }),
    });
  } catch (error) {
    if (error instanceof ReportError) throw error;
    if (error?.name === 'TimeoutError' || error?.name === 'AbortError') {
      throw new ReportError('Gemini did not respond within the request window. Please retry.', 504);
    }
    throw error;
  }
  if (!response.ok) {
    // Do not pass provider payloads or credentials back to the browser.
    throw new ReportError(response.status === 429 ? 'Gemini quota is currently exhausted. Please retry later.'
      : `Gemini request failed (HTTP ${response.status}). Check the server API key and model access.`, response.status === 429 ? 429 : 502);
  }
  let result;
  try {
    const body = await response.json();
    const candidate = body.candidates?.[0];
    if (candidate?.finishReason !== 'STOP') throw new Error('Incomplete or blocked generation');
    const text = (candidate.content?.parts || []).filter(part => !part.thought).map(part => part.text || '').join('');
    result = validateReport(JSON.parse(text), input.knowledge_context);
  } catch (error) {
    if (error instanceof ReportError) throw error;
    throw new ReportError('Gemini returned an incomplete or invalid report. Please retry.');
  }
  // Source limitations cannot disappear because the model omitted them.
  result.limitations = [...new Set([...input.data_quality.limitations, ...result.limitations])];
  return {
    report: result,
    context: {
      asset: input.asset, ...input.report_context, generated_at: new Date().toISOString(),
      coverage: input.historical.coverage,
      trends: input.historical.chart_days,
      latest: Object.fromEntries(Object.entries(input.latest).map(([name, reading]) => [name, {
        available: reading.available, measured_at: reading.measured_at, freshness: reading.freshness,
      }])),
      kpis: {
        availability_pct: input.historical.summary.availability,
        interruptions: input.historical.summary.trip_count ?? null,
        restarts: input.historical.summary.restart_count ?? null,
        utilization_pct: input.historical.derived.mean_daily_loaded_utilization_pct,
        maximum_temperature_c: input.historical.derived.maximum_observed_temperature_c,
        peak_current_a: input.historical.derived.peak_current_a,
        today_availability_pct: input.today_kpis.availability_pct,
        today_interruptions: input.today_kpis.interruptions,
        cycle_count: input.historical.derived.total_cycle_count ?? input.historical.summary.cycle_count ?? null,
        idle_seconds: input.historical.summary.idle_seconds ?? null,
        downtime_seconds: input.historical.summary.downtime_seconds ?? null,
        runtime_seconds: input.historical.summary.runtime_seconds ?? null,
      },
      prompt_version: PROMPT_VERSION, model,
      knowledge_version: input.knowledge_context.version,
      knowledge_rule_ids: input.knowledge_context.rules.map(rule => rule.id),
    },
  };
}

// Concurrent duplicate clicks/StrictMode share a request within this server instance.
// No stale completed-report cache; an explicit rerun fetches a new snapshot.
const inFlight = new Map();
export function generateReportOnce(asset) {
  const canonical = canonicalAssetId(asset) || asset;
  if (inFlight.has(canonical)) return inFlight.get(canonical);
  const request = generateReport(canonical).finally(() => inFlight.delete(canonical));
  inFlight.set(canonical, request);
  return request;
}
