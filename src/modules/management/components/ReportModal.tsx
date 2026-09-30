import { useCallback, useEffect, useRef, useState } from 'react';
import { Bot, X, AlertTriangle, CheckCircle2, Download, RotateCcw, FileCheck } from 'lucide-react';
import { requestCompressorReport } from '../reportClient';
import type { ReportResponse } from '../reportTypes';

interface ReportModalProps {
  compressor?: string;
  onClose: () => void;
}

export function ReportModal({ compressor = 'CMP#01', onClose }: ReportModalProps) {
  const [status, setStatus] = useState<'generating' | 'completed' | 'failed'>('generating');
  const [result, setResult] = useState<ReportResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isGeneratingPdf, setIsGeneratingPdf] = useState(false);
  const requestVersion = useRef(0);

  const startAnalysis = useCallback(async () => {
    const version = ++requestVersion.current;
    setStatus('generating'); setResult(null); setError(null);
    try {
      if (!['CMP#01', 'CMP#02'].includes(compressor)) throw new Error('Reports currently support Compressor 1 and Compressor 2 only.');
      const report = await requestCompressorReport(compressor);
      if (version !== requestVersion.current) return;
      setResult(report); setStatus('completed');
    } catch (err) {
      if (version !== requestVersion.current) return;
      setStatus('failed');
      setError(err instanceof Error && err.name === 'TimeoutError' ? 'Report generation timed out. Please retry.'
        : err instanceof Error ? err.message : 'Report generation failed. Please retry.');
    }
  }, [compressor]);

  useEffect(() => {
    void startAnalysis();
    return () => { ++requestVersion.current; };
  }, [startAnalysis]);

  const downloadPDF = async () => {
    if (!result) return;
    setIsGeneratingPdf(true); setError(null);
    try {
      const { downloadCompressorReport } = await import('../reportPdf');
      await downloadCompressorReport(result);
    } catch { setError('Could not create the PDF. Please try downloading again.'); }
    finally { setIsGeneratingPdf(false); }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-black/80 backdrop-blur-md">
      <div role="dialog" aria-modal="true" aria-labelledby="report-title" className="bg-[var(--panel)] border border-[var(--line)] rounded-2xl w-full max-w-2xl max-h-[90vh] flex flex-col shadow-2xl overflow-hidden">
        <div className="px-5 py-4 border-b border-[var(--line)] bg-[var(--panel2)] flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-[var(--chip)] flex items-center justify-center text-[var(--cyan)]"><Bot size={22} /></div>
            <div>
              <h2 id="report-title" className="text-[17px] font-bold text-[var(--text)]">{status === 'generating' ? 'Running AI Diagnostics' : 'Compressor Health Advisory'}</h2>
              <span className="text-[12px] text-[var(--muted)]">{compressor}</span>
            </div>
          </div>
          <button onClick={onClose} aria-label="Close report" className="p-2 text-[var(--muted)] hover:text-[var(--text)]"><X size={18} /></button>
        </div>
        <div className="p-6 space-y-5 overflow-y-auto" aria-live="polite">
          {status === 'generating' && (
            <div className="p-6 rounded-2xl bg-[var(--panel2)] border border-[var(--line)] flex flex-col items-center text-center gap-4">
              <div className="w-16 h-16 rounded-full border-4 border-[var(--line)] border-t-[var(--cyan)] animate-spin" />
              <p className="font-semibold text-[var(--text)]">Preparing your maintenance report</p>
              <p className="text-xs text-[var(--muted)]">This can take up to two minutes.</p>
            </div>
          )}
          {error && <div role="alert" className="p-4 rounded-xl border border-[var(--coral)] text-[var(--coral)] text-sm flex gap-2"><AlertTriangle className="shrink-0" size={18} />{error}</div>}
          {status === 'failed' && (
            <button onClick={startAnalysis} className="flex items-center justify-center gap-2 bg-[var(--cyan)] text-white px-5 py-2 rounded-lg text-sm font-bold"><RotateCcw size={15} />Retry Analysis</button>
          )}
          {status === 'completed' && result && (
            <div className="space-y-4">
              <div className="flex items-center gap-3 text-[var(--emerald)]"><FileCheck size={32} /><h3 className="font-bold text-lg">Compressor Health Advisory Ready</h3><CheckCircle2 size={18} /></div>
              <p className="text-[13px] text-[var(--text)]">{result.report.executive_summary}</p>
              <button onClick={downloadPDF} disabled={isGeneratingPdf} className="w-full flex items-center justify-center gap-2 bg-[var(--cyan)] text-white font-bold py-3.5 px-6 rounded-xl text-sm disabled:opacity-50"><Download size={18} />{isGeneratingPdf ? 'Generating PDF...' : 'Download PDF Report'}</button>
              <button onClick={startAnalysis} disabled={isGeneratingPdf} className="flex items-center gap-1.5 text-xs text-[var(--muted)] hover:underline disabled:opacity-50"><RotateCcw size={12} />Re-run Analysis</button>
            </div>
          )}
        </div>
        <div className="px-5 py-3.5 border-t border-[var(--line)] bg-[var(--panel2)] flex items-center justify-between gap-3">
          <span className="text-[11px] text-[var(--muted)]">IntuitiveIntelligence Industrial Diagnostics</span>
          <button onClick={onClose} className="px-5 py-2 rounded-lg text-xs font-bold text-[var(--text)] bg-[var(--panel)] border border-[var(--line)]">Close</button>
        </div>
      </div>
    </div>
  );
}
