import React, { useState } from 'react';
import {
  Wifi,
  Bell,
  CheckCircle,
  AlertTriangle,
  AlertOctagon,
  TrendingUp,
  Download,
  Wrench,
  BarChart2,
  Check,
} from 'lucide-react';
import { LatestTelemetry } from '../types';

interface BottomRowProps {
  latest: LatestTelemetry;
  compressorId?: string;
  onOpenExpandGraphs?: () => void;
  onDownloadReport?: () => void;
  onCreateWorkOrder?: () => void;
}

// Mini SVG sparkline for healthy communication signals
const MiniSparkline: React.FC<{ color?: string }> = ({ color = '#10b981' }) => {
  return (
    <svg className="w-12 h-4 overflow-visible" viewBox="0 0 50 16">
      <path
        d="M 0 10 Q 8 6, 16 9 T 32 7 T 48 8"
        fill="none"
        stroke={color}
        strokeWidth="1.75"
        strokeLinecap="round"
      />
    </svg>
  );
};

export const BottomRow: React.FC<BottomRowProps> = ({
  latest,
  compressorId = 'CMP#02',
  onOpenExpandGraphs,
  onDownloadReport,
  onCreateWorkOrder,
}) => {
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const showFeedback = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  };

  const isRobo =
    compressorId === 'ROBO#01' ||
    compressorId === 'ROBO01' ||
    compressorId?.toUpperCase()?.includes('ROBO') ||
    compressorId?.includes('TXMMIGI');

  const isCnc =
    !isRobo && (
      compressorId === 'CNC#01' ||
      compressorId === 'CNC01' ||
      compressorId?.toUpperCase()?.includes('CNC') ||
      compressorId?.includes('TXMCNCI')
    );

  const handleDownload = () => {
    if (onDownloadReport) {
      onDownloadReport();
    } else {
      // Trigger instant sample CSV download
      const csvContent =
        'data:text/csv;charset=utf-8,Timestamp,RMS_Current,Vibration_X,Vibration_Y,Vibration_Z,Suction_Temp,Discharge_Temp\n' +
        `${latest.current.timestamp},${latest.current.rms_a},${latest.motioniq.axis_x_rms_g},${latest.motioniq.axis_y_rms_g},${latest.motioniq.axis_z_rms_g},${latest.temperature.instant_rate_c_per_min},${latest.temperature.health_score}\n`;
      const encodedUri = encodeURI(csvContent);
      const link = document.createElement('a');
      link.setAttribute('href', encodedUri);
      link.setAttribute('download', `telemetry_report_${new Date().toISOString().slice(0, 10)}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      showFeedback('Telemetry Report CSV downloaded successfully.');
    }
  };

  const handleCreateWorkOrder = () => {
    if (onCreateWorkOrder) {
      onCreateWorkOrder();
    } else {
      showFeedback(
        isRobo
          ? 'Work order draft created for Robo Welder maintenance team.'
          : isCnc
          ? 'Work order draft created for CNC#01 maintenance team.'
          : 'Work order draft created for Compressor 2 maintenance team.'
      );
    }
  };

  const commNodes = [
    { name: 'MotionIQ', rate: '100 %' },
    { name: 'Current', rate: '99.9 %' },
    { name: 'MFM384', rate: '100 %' },
    { name: 'Temperature', rate: '100 %' },
  ];

  // For CNC#01 and Robo Welder, there should be no alerts (all clear, same as others)
  const advisories = isCnc || isRobo
    ? []
    : [
        {
          id: 1,
          title: 'High Discharge Temperature',
          subtitle: 'Discharge temperature above threshold (96.8 °C)',
          time: '22:48',
          severity: 'High',
          badgeBg: 'bg-rose-50 text-rose-600 border border-rose-200',
          icon: AlertOctagon,
          iconColor: 'text-rose-500',
        },
        {
          id: 2,
          title: 'Elevated Vibration Level',
          subtitle: 'Z-axis vibration trending high (0.40 g)',
          time: '21:32',
          severity: 'Medium',
          badgeBg: 'bg-amber-50 text-amber-600 border border-amber-200',
          icon: AlertTriangle,
          iconColor: 'text-amber-500',
        },
      ];

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-1.5 relative">
      {/* Toast feedback notice */}
      {toastMessage && (
        <div className="absolute -top-9 right-4 z-50 bg-slate-900 text-white px-3 py-1 rounded-lg text-xs font-semibold shadow-lg animate-in fade-in slide-in-from-top-2 duration-200 flex items-center gap-1.5">
          <Check className="w-3.5 h-3.5 text-emerald-400" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* 1. Communications Health (col-span-5) */}
      <div className="lg:col-span-5 bg-white rounded-xl border border-slate-200/90 p-1.5 shadow-2xs flex flex-col justify-between overflow-hidden">
        <div className="flex items-center justify-between pb-0.5 border-b border-slate-100">
          <div className="flex items-center gap-1.5">
            <div className="w-4.5 h-4.5 rounded-md bg-emerald-500 text-white flex items-center justify-center shrink-0 shadow-2xs">
              <Wifi className="w-3 h-3" />
            </div>
            <h3 className="text-xs sm:text-[12.5px] font-bold text-slate-800 tracking-tight">
              Communications Health
            </h3>
          </div>
          <span className="flex items-center gap-1 text-[9.5px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-200/80 px-1.5 py-0.2 rounded-full">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 inline-block" />
            Online
          </span>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-1 pt-0.5">
          {commNodes.map((node, idx) => (
            <div key={idx} className="flex flex-col">
              <div className="flex items-center gap-1 text-[9.5px] text-slate-500 font-medium">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 shrink-0" />
                <span className="truncate">{node.name}</span>
              </div>
              <div className="flex items-baseline justify-between gap-1 mt-0.5">
                <span className="text-[11.5px] sm:text-xs font-bold text-slate-900 font-sans">
                  {node.rate}
                </span>
                <MiniSparkline />
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* 2. Active Advisories (col-span-4) */}
      <div className="lg:col-span-4 bg-white rounded-xl border border-slate-200/90 p-1.5 shadow-2xs flex flex-col justify-between overflow-hidden">
        <div className="flex items-center justify-between pb-0.5 border-b border-slate-100">
          <div className="flex items-center gap-1.5">
            <div className={`w-4.5 h-4.5 rounded-md ${advisories.length > 0 ? 'bg-rose-500' : 'bg-emerald-500'} text-white flex items-center justify-center shrink-0 shadow-2xs`}>
              {advisories.length > 0 ? <Bell className="w-3 h-3" /> : <CheckCircle className="w-3 h-3" />}
            </div>
            <h3 className="text-xs sm:text-[12.5px] font-bold text-slate-800 tracking-tight">
              Active Advisories
            </h3>
          </div>
          {advisories.length > 0 ? (
            <span className="text-[9.5px] font-semibold text-slate-500 bg-slate-50 border border-slate-200 px-1.5 py-0.2 rounded-md">
              View All ({advisories.length})
            </span>
          ) : (
            <span className="text-[9.5px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-1.5 py-0.2 rounded-md flex items-center gap-1">
              <Check className="w-2.5 h-2.5 text-emerald-600" /> No Alerts
            </span>
          )}
        </div>

        <div className="space-y-0.5 pt-0.5">
          {advisories.length === 0 ? (
            <div className="flex items-center justify-center gap-2 py-1.5 text-center bg-emerald-50/50 rounded-lg border border-emerald-100/60">
              <CheckCircle className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
              <div className="text-left">
                <span className="text-[10.5px] font-bold text-slate-800 block leading-tight">No Active Advisories</span>
                <span className="text-[9px] text-slate-500 leading-tight">Zero fault advisories detected for this asset</span>
              </div>
            </div>
          ) : (
            advisories.map((item) => {
              const Icon = item.icon;
              return (
                <div
                  key={item.id}
                  className="flex items-center justify-between gap-1.5 p-0.5 rounded-lg hover:bg-slate-50 transition-colors"
                >
                  <div className="flex items-center gap-1.5 min-w-0">
                    <Icon className={`w-3.5 h-3.5 shrink-0 ${item.iconColor}`} />
                    <div className="min-w-0">
                      <div className="text-[10px] 2xl:text-[10.5px] font-bold text-slate-800 truncate">
                        {item.title}
                      </div>
                      <div className="text-[8.5px] 2xl:text-[9px] text-slate-500 truncate">
                        {item.subtitle}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-1.5 shrink-0">
                    <span className="text-[9px] text-slate-400 font-mono">{item.time}</span>
                    <span className={`text-[8.5px] font-bold px-1 py-0.2 rounded ${item.badgeBg}`}>
                      {item.severity}
                    </span>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* 3. Quick Actions Card (col-span-3) */}
      <div className="lg:col-span-3 bg-white rounded-xl border border-slate-200/90 p-1.5 shadow-2xs flex flex-col justify-between overflow-hidden">
        <div className="flex items-center justify-between pb-0.5 border-b border-slate-100">
          <div className="flex items-center gap-1.5">
            <div className="w-4.5 h-4.5 rounded-md bg-blue-600 text-white flex items-center justify-center shrink-0 shadow-2xs">
              <TrendingUp className="w-3 h-3" />
            </div>
            <h3 className="text-xs sm:text-[12.5px] font-bold text-slate-800 tracking-tight">
              Quick Actions
            </h3>
          </div>
        </div>

        {/* 3 Action Buttons */}
        <div className="grid grid-cols-3 gap-1 pt-0.5">
          {/* Action 1: View Details */}
          <button
            type="button"
            onClick={onOpenExpandGraphs}
            className="flex flex-col items-center justify-center p-1 rounded-lg bg-slate-50 hover:bg-blue-50 border border-slate-200/90 hover:border-blue-300 transition-all cursor-pointer group"
          >
            <div className="w-5.5 h-5.5 rounded-md bg-blue-100/60 group-hover:bg-blue-600 flex items-center justify-center text-blue-600 group-hover:text-white transition-colors mb-0.5">
              <BarChart2 className="w-3 h-3" />
            </div>
            <span className="text-[9.5px] font-semibold text-slate-700 group-hover:text-blue-700 text-center leading-tight">
              Details
            </span>
          </button>

          {/* Action 2: Download Report */}
          <button
            type="button"
            onClick={handleDownload}
            className="flex flex-col items-center justify-center p-1 rounded-lg bg-slate-50 hover:bg-blue-50 border border-slate-200/90 hover:border-blue-300 transition-all cursor-pointer group"
          >
            <div className="w-5.5 h-5.5 rounded-md bg-blue-100/60 group-hover:bg-blue-600 flex items-center justify-center text-blue-600 group-hover:text-white transition-colors mb-0.5">
              <Download className="w-3 h-3" />
            </div>
            <span className="text-[9.5px] font-semibold text-slate-700 group-hover:text-blue-700 text-center leading-tight">
              Download
            </span>
          </button>

          {/* Action 3: Create Work Order */}
          <button
            type="button"
            onClick={handleCreateWorkOrder}
            className="flex flex-col items-center justify-center p-1 rounded-lg bg-slate-50 hover:bg-blue-50 border border-slate-200/90 hover:border-blue-300 transition-all cursor-pointer group"
          >
            <div className="w-5.5 h-5.5 rounded-md bg-blue-100/60 group-hover:bg-blue-600 flex items-center justify-center text-blue-600 group-hover:text-white transition-colors mb-0.5">
              <Wrench className="w-3 h-3" />
            </div>
            <span className="text-[9.5px] font-semibold text-slate-700 group-hover:text-blue-700 text-center leading-tight">
              Work Order
            </span>
          </button>
        </div>
      </div>
    </div>
  );
};
