import React, { useState, useRef, useEffect } from 'react';
import { ChevronDown, RefreshCw, Check, Bell, LogOut, Calendar } from 'lucide-react';
import { AVAILABLE_ASSETS } from '../data/mockData';
import { AuthUser, DateRangePreset } from '../types';
import { getAssetDisplayName } from '../utils/assetImages';
import { getRangeDates } from '../utils/dateUtils';

interface HeaderProps {
  selectedAsset: string;
  onSelectAsset: (assetId: string) => void;
  startDate: string;
  endDate: string;
  onDateRangeChange: (start: string, end: string, preset?: DateRangePreset) => void;
  rangeType?: DateRangePreset;
  lastUpdate: string;
  isRefreshing: boolean;
  onRefresh: () => void;
  nextPollInSeconds?: number;
  runState?: number;
  currentUser?: AuthUser | null;
  onLogout?: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  selectedAsset,
  onSelectAsset,
  isRefreshing,
  onRefresh,
  runState = 1,
  currentUser,
  onLogout,
  rangeType = '30days',
  onDateRangeChange,
}) => {
  const [isAssetOpen, setIsAssetOpen] = useState(false);
  const [isDateOpen, setIsDateOpen] = useState(false);
  const assetRef = useRef<HTMLDivElement>(null);
  const dateRef = useRef<HTMLDivElement>(null);

  const rangeLabels: Record<string, string> = {
    today: 'Today',
    '7days': 'Last 7 Days',
    '30days': 'Last 30 Days',
    custom: 'Custom Range',
  };

  const uniqueAssets = React.useMemo(() => {
    const seen = new Set<string>();
    return [...AVAILABLE_ASSETS]
      .filter((asset) => {
        const key = asset.id.toLowerCase().replace(/[^a-z0-9]/g, '');
        if (seen.has(key)) return false;
        seen.add(key);
        return true;
      })
      .sort((a, b) => a.id.localeCompare(b.id));
  }, []);

  // Click outside listener
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (assetRef.current && !assetRef.current.contains(e.target as Node)) {
        setIsAssetOpen(false);
      }
      if (dateRef.current && !dateRef.current.contains(e.target as Node)) {
        setIsDateOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <header className="bg-white border-b border-slate-200 sticky top-0 z-30 shadow-2xs flex items-stretch">
      {/* Left: Page Title & Subtitle (Marked Area with #061431) */}
      <div className="bg-[#061431] px-3.5 sm:px-5 py-1.5 sm:py-2 flex flex-col justify-center shrink-0 border-r border-[#0d224d]">
        <h1 className="text-base sm:text-lg font-bold text-white tracking-tight leading-tight">
          O&M Dashboard
        </h1>
        <p className="text-[10px] sm:text-[11px] text-slate-300 font-medium leading-none mt-0.5">
          Real-Time Asset Monitoring <span className="text-slate-500 mx-1">|</span> From Machine Data to Action
        </p>
      </div>

      {/* Right: Rest of Header with White Background */}
      <div className="flex-1 w-full px-3 sm:px-5 py-1.5 sm:py-2 flex items-center justify-between gap-3 min-w-0">

        {/* Center: Brand Philosophy (Sense Understand Transform) */}
        <div className="hidden lg:flex items-center gap-5 text-[10.5px] 2xl:text-xs font-bold tracking-[0.2em] text-blue-900/80 select-none">
          <span>SENSE</span>
          <span className="text-slate-300">•</span>
          <span>UNDERSTAND</span>
          <span className="text-slate-300">•</span>
          <span>TRANSFORM</span>
        </div>

        {/* Right Section: Asset Selector, Notifications, User */}
        <div className="flex items-center gap-3">
          {/* Asset Selector */}
          <div className="relative" ref={assetRef}>
            <button
              type="button"
              id="asset-selector-btn"
              onClick={() => setIsAssetOpen(!isAssetOpen)}
              className="flex items-center gap-2 bg-slate-50 hover:bg-slate-100 border border-slate-200/90 rounded-lg px-2.5 py-1.5 text-xs font-bold text-slate-800 transition-colors shadow-2xs min-w-[140px] justify-between cursor-pointer"
            >
              <div className="flex items-center gap-1.5 truncate">
                <span
                  className={`w-2 h-2 rounded-full shrink-0 ${
                    runState === 1 ? 'bg-emerald-500' : 'bg-red-500'
                  }`}
                />
                <span className="truncate">{getAssetDisplayName(selectedAsset)}</span>
              </div>
              <ChevronDown className="w-3.5 h-3.5 text-slate-400 shrink-0" />
            </button>

            {isAssetOpen && (
              <div
                id="asset-dropdown-menu"
                className="absolute right-0 mt-1.5 w-60 bg-white border border-slate-200 rounded-xl shadow-lg py-1.5 z-50 animate-in fade-in-50 duration-150"
              >
                <div className="px-3 py-1 border-b border-slate-100 text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                  Select Asset
                </div>
                {uniqueAssets.map((asset) => (
                  <button
                    key={asset.id}
                    type="button"
                    onClick={() => {
                      onSelectAsset(asset.id);
                      setIsAssetOpen(false);
                    }}
                    className={`w-full text-left px-3 py-2 text-xs flex items-center justify-between hover:bg-slate-50 transition-colors cursor-pointer ${
                      selectedAsset === asset.id
                        ? 'bg-blue-50/70 text-blue-800 font-semibold'
                        : 'text-slate-700'
                    }`}
                  >
                    <div>
                      <div className="flex items-center gap-2">
                        <span
                          className={`w-2 h-2 rounded-full ${
                            asset.status === 'Running' ? 'bg-emerald-500' : 'bg-slate-400'
                          }`}
                        />
                        <span className="font-semibold">
                          {asset.name || getAssetDisplayName(asset.id)}
                        </span>
                      </div>
                      <div className="text-[10px] text-slate-400 pl-4">{asset.plant}</div>
                    </div>
                    {selectedAsset === asset.id && <Check className="w-4 h-4 text-blue-600" />}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Date Range Selector Dropdown */}
          <div className="relative" ref={dateRef}>
            <button
              type="button"
              onClick={() => setIsDateOpen(!isDateOpen)}
              className="flex items-center gap-1.5 bg-slate-50 hover:bg-slate-100 border border-slate-200/90 rounded-lg px-2.5 py-1.5 text-xs font-semibold text-slate-700 transition-colors shadow-2xs cursor-pointer"
            >
              <Calendar className="w-3.5 h-3.5 text-slate-500" />
              <span>{rangeLabels[rangeType || '30days'] || 'Last 30 Days'}</span>
              <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
            </button>

            {isDateOpen && (
              <div className="absolute right-0 mt-1.5 w-36 bg-white border border-slate-200 rounded-xl shadow-lg py-1 z-50 animate-in fade-in-50 duration-150 text-xs">
                {(['today', '7days', '30days'] as DateRangePreset[]).map((preset) => (
                  <button
                    key={preset}
                    type="button"
                    onClick={() => {
                      if (onDateRangeChange) {
                        const dates = getRangeDates(preset);
                        onDateRangeChange(dates.start, dates.end, preset);
                      }
                      setIsDateOpen(false);
                    }}
                    className={`w-full text-left px-3 py-1.5 hover:bg-slate-50 transition-colors font-medium cursor-pointer ${
                      rangeType === preset ? 'text-blue-600 font-bold bg-blue-50/60' : 'text-slate-700'
                    }`}
                  >
                    {rangeLabels[preset]}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Refresh Action */}
          <button
            type="button"
            onClick={onRefresh}
            title="Refresh dashboard data"
            className="p-1.5 text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-lg border border-slate-200 transition-colors cursor-pointer"
          >
            <RefreshCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin text-blue-600' : ''}`} />
          </button>

          {/* Notification Bell */}
          <div className="relative">
            <button
              type="button"
              title="Notifications"
              className="p-2 text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-full transition-colors relative cursor-pointer"
            >
              <Bell className="w-4 h-4" />
            </button>
          </div>

          {/* Logout Button */}
          <button
            type="button"
            onClick={onLogout}
            title="Log Out"
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-rose-600 hover:text-rose-700 bg-rose-50/80 hover:bg-rose-100/80 border border-rose-200/70 rounded-lg transition-colors cursor-pointer shadow-2xs active:scale-95"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span>Logout</span>
          </button>
        </div>
      </div>
    </header>
  );
};
