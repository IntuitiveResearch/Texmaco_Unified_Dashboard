import type { jsPDF } from 'jspdf';
import type { ReportResponse } from './reportTypes';

// Vector charts use API measurements only. Missing readings remain visible as N/A.
export function drawReportTrends(doc: jsPDF, rows: ReportResponse['context']['trends'], y: number) {
  const charts = [{ x: 10, title: 'DAILY AVAILABILITY (%)' }, { x: 108, title: 'UPTIME / DOWNTIME (HOURS)' }];
  const w = 92, h = 56;
  const label = (date: string) => `${Number(date.slice(8))}/${Number(date.slice(5, 7))}`;
  const valid = (value: number | null) => value !== null && Number.isFinite(value);
  for (let chart = 0; chart < 2; chart++) {
    const { x, title } = charts[chart];
    doc.setDrawColor(203, 213, 225); doc.setLineWidth(0.25); doc.rect(x, y, w, h);
    doc.setFont('helvetica', 'bold'); doc.setFontSize(7.7); doc.setTextColor(15, 23, 42);
    doc.text(title, x + 2.8, y + 6);
    doc.setDrawColor(226, 232, 240); doc.line(x + 2.8, y + 8, x + w - 2.8, y + 8);
    const left = x + 9, right = x + w - 4, top = y + 14, bottom = y + 42;
    const maxHours = Math.max(24, ...rows.flatMap(row => [row.runtime_hours ?? 0, row.downtime_hours ?? 0]));
    const max = chart === 0 ? 100 : Math.ceil(maxHours / 12) * 12;
    doc.setFont('helvetica', 'normal'); doc.setFontSize(5.6); doc.setTextColor(100, 116, 139);
    for (const fraction of [0, 0.5, 1]) {
      const gy = bottom - fraction * (bottom - top);
      doc.setLineDashPattern([0.8, 0.8], 0); doc.setDrawColor(226, 232, 240); doc.line(left, gy, right, gy);
      doc.text(`${max * fraction}${chart === 0 ? '%' : 'h'}`, left - 1.5, gy + 1, { align: 'right' });
    }
    doc.setLineDashPattern([], 0);
    const step = (right - left) / Math.max(1, rows.length);
    rows.forEach((row, i) => {
      const cx = left + (i + 0.5) * step;
      const values = chart === 0 ? [row.availability_pct] : [row.runtime_hours, row.downtime_hours];
      values.forEach((value, index) => {
        const barWidth = step * (chart === 0 ? 0.57 : 0.3);
        const bx = chart === 0 ? cx - barWidth / 2 : cx + (index === 0 ? -barWidth - 0.3 : 0.3);
        if (!valid(value)) {
          doc.setTextColor(100, 116, 139); doc.setFontSize(4.5);
          doc.text('N/A', bx + barWidth / 2, bottom - 1, { align: 'center' });
          return;
        }
        const barHeight = (value! / max) * (bottom - top);
        doc.setFillColor(...(index === 0 ? [22, 163, 74] : [220, 38, 38]) as [number, number, number]);
        if (barHeight > 0) doc.rect(bx, bottom - barHeight, barWidth, barHeight, 'F');
        if (chart === 0) {
          doc.setFont('helvetica', 'bold'); doc.setFontSize(5.6); doc.setTextColor(51, 65, 85);
          doc.text(`${Math.round(value!)}%`, cx, bottom - barHeight - 1.5, { align: 'center' });
        }
      });
      doc.setFont('helvetica', 'normal'); doc.setFontSize(5.4); doc.setTextColor(100, 116, 139);
      doc.text(label(row.date), cx, bottom + 3.5, { align: 'center' });
    });
    if (chart === 0) {
      const available = rows.map(row => row.availability_pct).filter(valid) as number[];
      if (available.length) {
        const avg = available.reduce((a, b) => a + b, 0) / available.length;
        const gy = bottom - avg / 100 * (bottom - top);
        doc.setDrawColor(37, 99, 235); doc.setLineDashPattern([1, 0.7], 0); doc.line(left, gy, right, gy); doc.setLineDashPattern([], 0);
        doc.setTextColor(37, 99, 235); doc.setFontSize(6);
        doc.text(`Observed-day average: ${avg.toFixed(1)}%`, x + w / 2, y + 52, { align: 'center' });
      } else { doc.text('Availability data unavailable', x + w / 2, y + 52, { align: 'center' }); }
    } else {
      doc.setFontSize(6); doc.setTextColor(71, 85, 105);
      doc.setFillColor(22, 163, 74); doc.rect(x + 25, y + 49, 2, 2, 'F'); doc.text('Uptime', x + 28, y + 51);
      doc.setFillColor(220, 38, 38); doc.rect(x + 48, y + 49, 2, 2, 'F'); doc.text('Downtime', x + 51, y + 51);
    }
  }
  doc.setFontSize(6.3); doc.setTextColor(100, 116, 139);
  const caption = rows.length ? `Last 7 completed days: ${rows[0].date} to ${rows[rows.length - 1].date}. Gaps = unavailable; offline time is separate from downtime.` : 'Historical trend data unavailable.';
  doc.text(caption, 10, y + h + 4);
  return y + h + 8;
}
