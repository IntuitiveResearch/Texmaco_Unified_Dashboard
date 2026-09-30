import { jsPDF } from 'jspdf';
import autoTable, { type CellInput, type UserOptions } from 'jspdf-autotable';
import type { ReportResponse } from './reportTypes';
import { drawReportTrends } from './reportCharts';
import { getClientReportFindings } from './reportPresentation';
import { COMPRESSOR_1_SERIAL_NUMBER } from '../../../shared/compressor-equipment.mjs';

type Color = [number, number, number];
const navy: Color = [15, 23, 42];
const slate: Color = [30, 41, 59];
const red: Color = [220, 38, 38];
const amber: Color = [217, 119, 6];
const green: Color = [22, 163, 74];
const blue: Color = [37, 99, 235];
const muted: Color = [100, 116, 139];
const border: Color = [203, 213, 225];
const ink: Color = [71, 85, 105];
const clean = (value: string) => value.replace(/[\u2018\u2019]/g, "'").replace(/[\u201c\u201d]/g, '"').replace(/[\u2013\u2014]/g, '-').replace(/\u2022/g, '-');
const concernColor = (value: string): Color => ['High', 'Critical'].includes(value) ? red : value === 'Medium' ? amber : value === 'Low' ? green : muted;

// Match the supplied advisory: conditions and causes first; measured trends and actions next.
export async function createCompressorReportPdf(result: ReportResponse, options: { sample?: boolean } = {}) {
  const { context, report } = result;
  const findings = getClientReportFindings(report);
  const doc = new jsPDF({ unit: 'mm', format: 'a4', orientation: 'portrait' });
  const margin = 10, width = 210, contentWidth = 190;
  const asset = context.asset.id.replace('#', '');
  const equipment = context.asset.equipment;
  const serialNumber = equipment?.serial_number ?? (asset === 'CMP01' ? COMPRESSOR_1_SERIAL_NUMBER : null);
  const date = new Intl.DateTimeFormat('en-GB', { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'Asia/Kolkata' }).format(new Date(context.generated_at));
  doc.setProperties({ title: `${asset} Root Cause Analysis & Prescriptive Report`, subject: 'Compressor condition monitoring advisory', author: 'IntuitiveIntelligence' });
  let y = 22;
  doc.setFillColor(...navy); doc.rect(margin, y, contentWidth, 25, 'F');
  doc.setTextColor(255, 255, 255); doc.setFontSize(16); doc.setFont('helvetica', 'bold');
  doc.text('COMPRESSOR HEALTH ADVISORY', margin + 4, y + 8);
  doc.setFontSize(9); doc.setTextColor(245, 158, 11);
  doc.text(`${asset}${serialNumber ? `  |  Compressor ID: ${serialNumber}` : equipment ? `  |  ${equipment.manufacturer} ${equipment.model}` : ''}`, margin + 4, y + 14);
  doc.setFont('helvetica', 'normal'); doc.setFontSize(7); doc.setTextColor(203, 213, 225);
  doc.text(`${date}  |  Internal  |  Root Cause Analysis & Prescriptive Report`, margin + 4, y + 21);
  doc.setTextColor(255, 255, 255); doc.setFont('helvetica', 'bold'); doc.setFontSize(7);
  doc.text('Texmaco Rail & Engineering Ltd.', width - margin - 4, y + 13, { align: 'right' });
  doc.setFont('helvetica', 'normal'); doc.setTextColor(203, 213, 225);
  doc.text('Prepared by: IntuitiveIntelligence', width - margin - 4, y + 18, { align: 'right' });
  y += 28;

  const measured = (value: number | null | undefined): value is number => typeof value === 'number' && Number.isFinite(value);
  type KpiCell = { value: string; label: string; color: Color; severity?: boolean };
  const metric = (value: number | null | undefined, label: string, digits = 0, suffix = '', color: Color = amber): KpiCell[] =>
    measured(value) ? [{ value: `${value.toFixed(digits)}${suffix}`, label, color }] : [];
  const kpi = context.kpis;
  const todayAvailable = measured(kpi.today_availability_pct);
  const cells: KpiCell[] = [
    ...metric(todayAvailable ? kpi.today_availability_pct : kpi.availability_pct, todayAvailable ? "TODAY'S\nAVAILABILITY" : '30-DAY\nAVAILABILITY', 1, '%'),
    ...metric(kpi.today_interruptions, 'INTERRUPTIONS\nTODAY', 0, '', red),
    ...metric(kpi.interruptions, 'INTERRUPTIONS\nLAST 30 DAYS', 0, '', ink),
    ...metric(kpi.peak_current_a, 'PEAK CURRENT\nLAST 30 DAYS', 1, ' A'),
    ...metric(kpi.maximum_temperature_c, 'MAX OBSERVED TEMP\nLAST 30 DAYS', 1, '°C'),
    ...(report.severity !== 'Unknown' ? [{ value: report.severity.toUpperCase(), label: ['High', 'Critical'].includes(report.severity) ? 'PRIORITY\nREVIEW REQUIRED' : 'ADVISORY\nSEVERITY', color: concernColor(report.severity), severity: true }] : []),
  ];
  const cellWidth = contentWidth / Math.max(1, cells.length);
  cells.forEach(({ value, label, color, severity }, index) => {
    const x = margin + index * cellWidth;
    doc.setLineWidth(0.25); doc.setFillColor(...(severity ? color : [255, 255, 255] as Color));
    doc.setDrawColor(...border); doc.rect(x, y, cellWidth, 17, 'FD');
    doc.setTextColor(...(severity ? [255, 255, 255] as Color : color));
    doc.setFont('helvetica', 'bold'); doc.setFontSize(severity ? 11.5 : 13);
    doc.text(value, x + cellWidth / 2, y + 7, { align: 'center' });
    doc.setFontSize(6.1);
    if (!severity) doc.setTextColor(...ink);
    doc.text(label, x + cellWidth / 2, y + 11, { align: 'center', lineHeightFactor: 1.2 });
  });
  y += cells.length ? 21 : 4;
  doc.setFont('helvetica', 'normal'); doc.setFontSize(6.6); doc.setTextColor(...muted);
  doc.text(`History: ${context.start_date} to ${context.end_date} (${context.timezone})  |  Latest snapshot requested: ${context.snapshot_date}`, margin, y);
  y += 3;

  const table = (title: string, headings: string[], rows: CellInput[][], columnStyles: UserOptions['columnStyles'] = {}, fontSize = 8.1) => {
    autoTable(doc, {
      startY: y, margin: { left: margin, right: margin, top: 22, bottom: 20 }, tableWidth: contentWidth,
      theme: 'grid', head: [
        [{ content: title, colSpan: headings.length, styles: { fillColor: navy, fontSize: 9, cellPadding: 2.2 } }],
        headings.map(content => ({ content, styles: { fillColor: slate, fontSize: 6.7, cellPadding: 1.8 } })),
      ],
      body: rows,
      headStyles: { textColor: [255, 255, 255], fontStyle: 'bold', lineColor: border, lineWidth: 0.2 },
      bodyStyles: { fontSize, textColor: ink, cellPadding: 2.4, lineColor: border, lineWidth: 0.2, overflow: 'linebreak', valign: 'middle' },
      columnStyles, rowPageBreak: 'avoid',
    });
    y = (doc as jsPDF & { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 3;
  };

  if (findings.conditions.length) table("WHAT'S HAPPENING", ['CONDITION', 'DETAIL'], findings.conditions.map(row => [
    { content: clean(row.condition), styles: { fontStyle: 'bold', textColor: concernColor(row.concern) } }, clean(row.detail),
  ]), { 0: { cellWidth: 48 }, 1: { cellWidth: 142 } });

  const causes: CellInput[][] = findings.rootCauses.map(row => [
    { content: `${clean(row.cause)}\n${row.status}`, styles: { fontStyle: 'bold' } },
    `${clean(row.key_evidence)}\nVerify: ${clean(row.verification)}`,
    { content: row.confidence.toUpperCase(), styles: { fontStyle: 'bold', halign: 'center', fontSize: 7.1 } },
  ]);
  if (causes.length) {
    table('ROOT CAUSE & EVIDENCE', ['ROOT CAUSE', 'KEY EVIDENCE', 'CONFIDENCE'], causes, { 0: { cellWidth: 48 }, 1: { cellWidth: 115 }, 2: { cellWidth: 27 } }, 7.8);
    // Include this clarification in the table flow so overflow cannot collide with the footer.
    autoTable(doc, { startY: y, margin: { left: margin, right: margin, top: 22, bottom: 20 }, theme: 'plain',
      body: [['Confidence describes evidence strength, not failure probability. Suspected causes require field verification.']], styles: { fontSize: 6.5, textColor: muted, cellPadding: 1 } });
  }
  if (!findings.conditions.length && !causes.length) {
    // No published findings is not a healthy verdict. Keep the next step clear.
    autoTable(doc, { startY: y, margin: { left: margin, right: margin, top: 22, bottom: 20 }, theme: 'plain',
      body: [['Complete the recommended equipment checks before assigning a condition rating.']], styles: { fontSize: 8.1, textColor: ink, cellPadding: 2.4 } });
  }

  doc.addPage();
  const decisionPage = doc.getNumberOfPages();
  y = drawReportTrends(doc, context.trends || [], 22);
  table('BUSINESS / MAINTENANCE RISK TIMELINE', ['HORIZON', 'ASSESSMENT'], [
    [{ content: 'NOW', styles: { textColor: red, fillColor: [254, 242, 242], fontStyle: 'bold', halign: 'center' } }, clean(report.risk_timeline.now)],
    [{ content: 'WEEKS', styles: { textColor: amber, fillColor: [255, 251, 235], fontStyle: 'bold', halign: 'center' } }, clean(report.risk_timeline.weeks)],
    [{ content: 'IF IGNORED', styles: { textColor: red, fillColor: [254, 242, 242], fontStyle: 'bold', halign: 'center' } }, clean(report.risk_timeline.if_ignored)],
  ], { 0: { cellWidth: 27 }, 1: { cellWidth: 163 } }, 7.8);

  table('RECOMMENDED ACTIONS', ['PRIORITY', 'WHAT TO DO', 'WHY IT MATTERS'], report.recommendations.map(action => [
    { content: action.category.toUpperCase(), styles: { fillColor: action.category === 'Immediate' ? red : action.category === 'Preventive' ? amber : blue, textColor: [255, 255, 255], fontStyle: 'bold', halign: 'center', fontSize: 7.3 } },
    `${action.actions.map(item => `- ${clean(item)}`).join('\n')}\nOwner: ${clean(action.responsible_role)} | ${clean(action.timing)}\nVerify: ${clean(action.verification)}`,
    clean(action.why_it_matters),
  ]), { 0: { cellWidth: 27 }, 1: { cellWidth: 110 }, 2: { cellWidth: 53 } }, 7.5);
  // Data quality and equipment assumptions remain internal; the PDF ends at actions.

  const pages = doc.getNumberOfPages();
  for (let page = 1; page <= pages; page++) {
    doc.setPage(page); doc.setFont('helvetica', 'bold'); doc.setFontSize(6.7); doc.setTextColor(...ink);
    doc.text(page < decisionPage ? 'TEXMACO CONDITION MONITORING ADVISORY' : 'DECISION SUPPORT & TRENDS', margin, 12);
    doc.setFontSize(9); doc.setTextColor(...navy); doc.text('INTUITIVEINTELLIGENCE', width - margin, 12, { align: 'right' });
    doc.setDrawColor(...border); doc.setLineWidth(0.2); doc.line(margin, 16, width - margin, 16);
    doc.setDrawColor(...slate); doc.line(margin, 282, width - margin, 282);
    doc.setFontSize(6.2); doc.setTextColor(...ink);
    doc.text(`Texmaco Rail & Engineering Ltd.  |  ${asset} Health Advisory  |  ${date}`, margin, 287);
    doc.setTextColor(...red); doc.text(options.sample ? 'SAMPLE DATA / LAYOUT PREVIEW ONLY' : 'CONFIDENTIAL / INTERNAL USE ONLY', margin, 291);
    doc.setTextColor(...muted); doc.setFont('helvetica', 'normal');
    doc.text(`Page ${page} / ${pages}`, width - margin, 290, { align: 'right' });
  }
  return doc;
}

export async function downloadCompressorReport(result: ReportResponse) {
  const doc = await createCompressorReportPdf(result);
  doc.save(`${result.context.asset.id.replace('#', '')}_Health_Report_${result.context.snapshot_date}.pdf`);
}
