import React from 'react';
import { FileText, Clock, FileSpreadsheet, Download, ShieldCheck } from 'lucide-react';

export const ReportsPlaceholderView: React.FC = () => {
  return (
    <div className="flex-1 w-full p-4 lg:p-6 flex items-center justify-center">
      <div className="bg-white border border-slate-200/90 rounded-2xl p-8 max-w-lg w-full text-center shadow-xs">
        <div className="w-14 h-14 rounded-2xl bg-blue-50 border border-blue-100 text-blue-600 flex items-center justify-center mx-auto mb-4">
          <FileText className="w-7 h-7" />
        </div>
        <h2 className="text-lg font-bold text-slate-800">
          Executive Reports Center
        </h2>
        <p className="text-xs text-slate-500 mt-1 mb-6 leading-relaxed">
          The centralized report generation and scheduled compliance delivery engine for Texmaco Rail & Engineering is currently being provisioned.
        </p>

        <div className="grid grid-cols-2 gap-3 text-left mb-6">
          <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
            <div className="flex items-center gap-2 text-slate-700 font-semibold text-xs mb-1">
              <FileSpreadsheet className="w-4 h-4 text-emerald-600" />
              <span>Shift Telemetry</span>
            </div>
            <p className="text-[10.5px] text-slate-400">Automated shift-wise operational CSV logs</p>
          </div>

          <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
            <div className="flex items-center gap-2 text-slate-700 font-semibold text-xs mb-1">
              <Download className="w-4 h-4 text-blue-600" />
              <span>Financial Audit</span>
            </div>
            <p className="text-[10.5px] text-slate-400">Monthly asset exposure PDF summaries</p>
          </div>
        </div>

        <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-slate-100 text-slate-500 text-xs font-semibold">
          <Clock className="w-3.5 h-3.5" />
          <span>Status: Module Scheduled for Deployment</span>
        </div>
      </div>
    </div>
  );
};
