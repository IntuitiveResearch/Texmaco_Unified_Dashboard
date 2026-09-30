import { DateRangePreset } from '../types';

export function formatDateISO(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function getRangeDates(preset: DateRangePreset, baseDate = new Date()): { start: string; end: string } {
  const end = formatDateISO(baseDate);

  if (preset === 'today') {
    return { start: end, end };
  }

  if (preset === '7days') {
    const start = new Date(baseDate);
    start.setDate(baseDate.getDate() - 7);
    return { start: formatDateISO(start), end };
  }

  if (preset === '30days') {
    const start = new Date(baseDate);
    start.setDate(baseDate.getDate() - 30);
    return { start: formatDateISO(start), end };
  }

  // default fallback for custom
  const start = new Date(baseDate);
  start.setDate(baseDate.getDate() - 30);
  return { start: formatDateISO(start), end };
}

export function formatHumanDate(dateStr: string): string {
  try {
    const [year, month, day] = dateStr.split('-').map(Number);
    if (!year || !month || !day) return dateStr;
    const d = new Date(year, month - 1, day);
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  } catch {
    return dateStr;
  }
}
