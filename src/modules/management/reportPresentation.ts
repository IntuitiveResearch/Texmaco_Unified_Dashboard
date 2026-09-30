import type { PrescriptiveReport } from './reportTypes';

// Assessments stay complete internally. Only supported findings belong in the advisory.
// Check labels too so older reports with a mismatched concern do not leak placeholders.
const unassessedLabel = /^(?:indeterminate\b|insufficient[\s-]+(?:data|evidence)\b|(?:data|evidence)[\s-]+(?:unavailable|insufficient)\b|no[\s-]+(?:usable[\s-]+)?data\b|not[\s-]+(?:assessed|established)\b|(?:unknown|unavailable)\s*$)/i;
const isUnassessed = (label: string) => unassessedLabel.test(label.trim().replace(/^(?:availability|reliability|electrical|thermal|vibration)\s*[:\u2013\u2014-]\s*/i, ''));

export function getClientReportFindings(report: PrescriptiveReport) {
  return {
    conditions: report.conditions.filter(row => row.concern !== 'Unknown' && !isUnassessed(row.condition)),
    rootCauses: report.root_causes.filter(row => row.status === 'Suspected' && row.confidence !== 'Insufficient' && !isUnassessed(row.cause)),
  };
}
