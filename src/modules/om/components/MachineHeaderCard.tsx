import React from 'react';
import { MapPin, Tag, RefreshCw, Clock, Building2, Maximize2 } from 'lucide-react';
import { getCompressorImage, getAssetDisplayName } from '../utils/assetImages';
import { AssetMeta } from '../types';
import { COMPRESSOR_MODEL } from '../../../../shared/compressor-equipment.mjs';
import { getCompressorStatusAppearance, getOperatingStatus, type AssetStatus } from '../../../utils/assetStatus';
import { MIG_ASSET_ID, MIG_ASSET_TAG } from '../data/migSample';

interface MachineHeaderCardProps {
  compressorId: string;
  assetMeta?: AssetMeta;
  cycleId?: number;
  lastUpdate?: string;
  runState?: number;
  loadState?: number;
  operatingStatus?: AssetStatus;
  hideAssetTag?: boolean;
  hideCycleId?: boolean;
  hideStatusIndicator?: boolean;
  hideStatusDot?: boolean;
  onImageClick?: () => void;
  className?: string;
}

export const MachineHeaderCard: React.FC<MachineHeaderCardProps> = ({
  compressorId,
  assetMeta,
  cycleId,
  lastUpdate,
  runState = 1,
  loadState,
  operatingStatus,
  hideAssetTag = false,
  hideCycleId = false,
  hideStatusIndicator = false,
  hideStatusDot = false,
  onImageClick,
  className = '',
}) => {
  const imageUrl = getCompressorImage(compressorId);
  const resolvedStatus = operatingStatus ?? getOperatingStatus(runState, loadState, compressorId);
  const status = getCompressorStatusAppearance(resolvedStatus, assetMeta?.id ?? compressorId);
  const displayName = getAssetDisplayName(compressorId);
  const isMig = compressorId === MIG_ASSET_ID || compressorId === MIG_ASSET_TAG;
  const isRobo =
    !isMig && (compressorId === 'ROBO#01' ||
    compressorId === 'ROBO01' ||
    compressorId?.toUpperCase()?.includes('ROBO') ||
    compressorId?.includes('TXMMIGI'));
  const isCnc =
    !isRobo && (
      compressorId === 'CNC#01' ||
      compressorId === 'CNC01' ||
      compressorId?.toUpperCase()?.includes('CNC') ||
      compressorId?.includes('TXMCNCI')
    );

  // Format timestamp cleanly
  const formattedDate = lastUpdate
    ? lastUpdate.replace('T', ' ').slice(0, 19)
    : '09 Sep 2026 23:09:26';
  const imageClassName = 'relative w-full sm:w-28 md:w-36 shrink-0 h-24 sm:h-auto rounded-lg overflow-hidden bg-slate-900 border border-slate-200/80 dark:border-slate-800 flex items-center justify-center';
  const imageContent = <>
    <img src={imageUrl} alt={displayName} className="w-full h-full object-cover object-center" />
    <span className="absolute bottom-1 right-1 bg-slate-900/80 backdrop-blur-xs text-[9px] text-white px-1.5 py-0.2 rounded font-mono">
      {isMig ? 'PI4G/TXMMIGI/26002' : isRobo ? 'PI4G/TXMMIGI/26001' : isCnc ? 'Duce Pack Cutter' : COMPRESSOR_MODEL}
    </span>
    {onImageClick && <Maximize2 size={14} className="absolute top-1 right-1 text-white drop-shadow" aria-hidden="true" />}
  </>;

  return (
    <div className={`bg-white dark:bg-[#0c1f48] rounded-xl border border-slate-200/90 dark:border-slate-800 p-1.5 sm:p-2 shadow-2xs flex flex-col sm:flex-row items-stretch gap-2 h-full ${className}`}>
      {/* Compressor / Machine Image Container */}
      {onImageClick
        ? <button type="button" className={`${imageClassName} cursor-zoom-in`} onClick={onImageClick} aria-label={`Expand ${displayName} image`}>{imageContent}</button>
        : <div className={imageClassName}>{imageContent}</div>}

      {/* Machine Details */}
      <div className="flex-1 w-full flex flex-col justify-between py-0.2 min-w-0">
        <div>
          {/* Top Status Pill & Asset ID */}
          <div className="flex items-center gap-1.5 mb-0.5 flex-wrap">
            <span
              className={`text-[9px] font-bold px-1.5 py-0.2 rounded uppercase tracking-wider shadow-2xs ${status.pillClass}`}
            >
              {status.label.toUpperCase()}
            </span>
            {isRobo && (
              <span className="text-[8px] font-bold px-1.5 py-0.2 rounded uppercase tracking-wider bg-slate-100 text-slate-500 border border-slate-200">
                LIVE CLOUD TELEMETRY
              </span>
            )}
          </div>

          <div className="flex items-center gap-1.5">
            <h2 className="text-sm sm:text-base font-bold text-slate-900 dark:text-slate-100 tracking-tight leading-tight">
              {displayName}
            </h2>
            {!hideStatusIndicator && !hideStatusDot && (
              <span
                className={`w-2 h-2 rounded-full shrink-0 ${status.dotClass}`}
                role="img"
                aria-label={`${displayName}: ${status.label}`}
                data-asset-status={status.label}
              />
            )}
          </div>

          {/* Subtitle with bullet */}
          <p className="text-[10px] sm:text-[10.5px] text-slate-600 dark:text-slate-300 font-medium flex items-center gap-1 mt-0.5 truncate">
            <span className="text-emerald-500 font-bold">●</span>
            <span className="truncate">
              {isMig
                ? 'Fronius MIG 400 · MIG Welding Machine'
                : isRobo
                ? 'GMAW (MAG) · Robotic Welding System'
                : isCnc
                ? 'Duce Pack Cutter · Precision CNC System'
                : `Atlas Copco ${COMPRESSOR_MODEL} Air Compressor`}
            </span>
          </p>
        </div>

        {/* Metadata Details List */}
        <div className="space-y-0.5 text-[10.5px] text-slate-600 dark:text-slate-300 font-medium mt-1 pt-1 border-t border-slate-100 dark:border-slate-800">
          <div className="flex items-center gap-1.5">
            <Building2 className="w-3 h-3 text-slate-400 shrink-0" />
            <span className="text-slate-500 dark:text-slate-400 text-[10px]">Plant:</span>
            <span className="text-slate-800 dark:text-slate-200 font-semibold truncate">
              {assetMeta?.plant || 'Texmaco - Agarpara'}
            </span>
          </div>

          <div className="flex items-center gap-1.5">
            <MapPin className="w-3 h-3 text-slate-400 shrink-0" />
            <span className="text-slate-500 dark:text-slate-400 text-[10px]">Location:</span>
            <span className="text-slate-800 dark:text-slate-200 font-semibold truncate">
              {isMig ? 'Welding Bay' : isRobo || isCnc ? 'CNC Machining Bay' : 'Compressor Room 1'}
            </span>
          </div>

          {!hideAssetTag && (
            <div className="flex items-center gap-1.5">
              <Tag className="w-3 h-3 text-slate-400 shrink-0" />
              <span className="text-slate-500 text-[10px]">Asset Tag:</span>
              <span className="text-slate-800 font-semibold truncate">
                {isMig ? MIG_ASSET_TAG : isRobo ? 'MACHINE#PI4G/TXMMIGI/26001' : compressorId}
              </span>
            </div>
          )}

          {!hideCycleId && cycleId !== undefined && (
            <div className="flex items-center gap-1.5">
              <RefreshCw className="w-3 h-3 text-slate-400 shrink-0" />
              <span className="text-slate-500 text-[10px]">Cycle ID:</span>
              <span className="text-slate-800 font-semibold">{cycleId}</span>
            </div>
          )}

          <div className="flex items-center gap-1.5 text-slate-400 text-[9.5px] font-normal truncate">
            <Clock className="w-2.5 h-2.5 text-slate-400 shrink-0" />
            <span className="truncate">{isMig ? 'Live telemetry unavailable' : `Last Updated ${formattedDate}`}</span>
          </div>
        </div>
      </div>
    </div>
  );
};
