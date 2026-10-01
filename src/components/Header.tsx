import React, { useState, useRef, useEffect } from 'react';
import { ChevronDown, RefreshCw, Check, Bell, LogOut, Calendar, Bot, Sun, Moon } from 'lucide-react';
import { format, parseISO, isValid } from 'date-fns';
import { DashboardTab } from './Sidebar';
import { getAssetStatusAppearance } from '../utils/assetStatus';

export interface HeaderAsset {
  id: string;
  name: string;
  plant?: string;
  status?: 'Running' | 'Idle' | 'Offline' | string;
}

function AssetStatusDot({ asset }: { asset: HeaderAsset }) {
  const appearance = getAssetStatusAppearance(asset.status);
  return <span className={`w-2 h-2 rounded-full shrink-0 ${appearance.dotClass}`} role="img" aria-label={`${asset.name}: ${appearance.label}`} title={appearance.label} data-asset-status={appearance.label} />;
}

interface HeaderProps {
  currentTab: DashboardTab;
  selectedAsset: string;
  availableAssets: HeaderAsset[];
  isSampleAsset?: boolean;
  onSelectAsset: (assetId: string) => void;
  onAssetMenuOpen?: () => void;
  datePreset?: string;
  onSelectDatePreset?: (preset: string) => void;
  customStartDate?: string;
  customEndDate?: string;
  onCustomDateChange?: (start: string, end: string) => void;
  isRefreshing?: boolean;
  onRefresh?: () => void;
  onOpenIntuitiveAi?: () => void;
  onLogout?: () => void;
  userDisplayName?: string;
  theme?: 'dark' | 'light';
  onToggleTheme?: () => void;
  notificationCount?: number;
  onOpenNotifications?: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  currentTab,
  selectedAsset,
  availableAssets,
  isSampleAsset = false,
  onSelectAsset,
  onAssetMenuOpen,
  datePreset = '30days',
  onSelectDatePreset,
  customStartDate,
  customEndDate,
  onCustomDateChange,
  isRefreshing = false,
  onRefresh,
  onOpenIntuitiveAi,
  onLogout,
  userDisplayName = 'Texmaco Management',
  theme = 'dark',
  onToggleTheme,
  notificationCount = 0,
  onOpenNotifications,
}) => {
  const [isAssetOpen, setIsAssetOpen] = useState(false);
  const [isDateOpen, setIsDateOpen] = useState(false);
  const assetRef = useRef<HTMLDivElement>(null);
  const dateRef = useRef<HTMLDivElement>(null);

  const rangeLabels: Record<string, string> = {
    today: 'Today',
    yesterday: 'Yesterday',
    '7days': 'Last 7 Days',
    '7d': 'Last 7 Days (7d)',
    '30days': 'Last 30 Days',
    '30d': 'Last 30 Days (30d)',
    '1m': 'Last 1 Month (1m)',
    '3m': 'Last 3 Months (3m)',
    '6m': 'Last 6 Months (6m)',
    '1y': 'Last 1 Year (1y)',
    custom: 'Custom Range',
  };

  const formatDateSafe = (dateStr?: string): string => {
    if (!dateStr) return '';
    try {
      const parsed = parseISO(dateStr);
      if (!isValid(parsed)) return dateStr;
      return format(parsed, 'dd MMM');
    } catch {
      return dateStr;
    }
  };

  const getPresetOptions = (): { id: string; label: string }[] => {
    switch (currentTab) {
      case 'management':
        return [
          { id: '7d', label: 'Last 7 Days (7d)' },
          { id: '30d', label: 'Last 30 Days (30d)' },
          { id: 'custom', label: 'Custom Range' },
        ];
      case 'finance':
        return [
          { id: '1m', label: 'Last 1 Month (1m)' },
          { id: '3m', label: 'Last 3 Months (3m)' },
          { id: '6m', label: 'Last 6 Months (6m)' },
          { id: '1y', label: 'Last 1 Year (1y)' },
        ];
      case 'om':
      default:
        return [
          { id: 'today', label: 'Today' },
          { id: '7days', label: 'Last 7 Days' },
          { id: '30days', label: 'Last 30 Days' },
        ];
    }
  };

  const getDisplayLabel = () => {
    if (currentTab === 'management' && datePreset === 'custom') {
      if (customStartDate && customEndDate) {
        return `Custom (${formatDateSafe(customStartDate)} - ${formatDateSafe(customEndDate)})`;
      }
      return 'Custom Range';
    }
    if (currentTab === 'finance') {
      if (datePreset === '1y') return 'Last 1 Year (1y)';
      if (datePreset === '6m') return 'Last 6 Months (6m)';
      if (datePreset === '3m') return 'Last 3 Months (3m)';
      return 'Last 1 Month (1m)';
    }
    return rangeLabels[datePreset] || 'Last 30 Days';
  };

  const getTitleAndSubtitle = () => {
    switch (currentTab) {
      case 'overview':
        return {
          title: 'Plant Asset Overview',
          subtitle: 'Real-Time Monitoring | Higher Productivity | Lower Cost | Smarter Operations',
        };
      case 'om':
        if (selectedAsset === 'CRANE#01') return {
          title: 'EOT Crane Dashboard',
          subtitle: 'Real-Time Vibration Monitoring | Structural Health | Predictive Maintenance',
        };
        return {
          title: 'O&M Dashboard',
          subtitle: 'Real-Time Asset Monitoring | From Machine Data to Action',
        };
      case 'management':
        return {
          title: 'Executive Dashboard',
          subtitle: 'Plant Overview & Reliability Intelligence | Executive Review',
        };
      case 'finance':
        return {
          title: 'Financial Dashboard',
          subtitle: 'Financial Impact & Cost Optimization | Machine Value Realization',
        };
      case 'reports':
      default:
        return {
          title: 'Reports Engine',
          subtitle: 'Executive Operations & Compliance Reporting',
        };
    }
  };

  const { title, subtitle } = getTitleAndSubtitle();

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

  const currentAssetObj = availableAssets.find((a) => a.id === selectedAsset) || {
    id: selectedAsset,
    name: selectedAsset,
    plant: 'Texmaco - Agarpara',
    status: 'Unknown',
  };

  return (
    <header className="bg-[#061431] border-b border-[#0d224d] sticky top-0 z-30 shadow-md flex items-stretch min-h-[58px] text-white select-none">
      {/* Left: Page Title & Subtitle */}
      <div className="bg-[#061431] px-3.5 sm:px-5 py-2 flex flex-col justify-center shrink-0 border-r border-[#0d224d] min-w-[200px] lg:min-w-[240px]">
        <h1 className="text-base sm:text-lg font-bold text-white tracking-tight leading-tight">
          {title}
        </h1>
        <p className="text-[10px] sm:text-[11px] text-slate-300 font-medium leading-none mt-0.5 truncate">
          {subtitle}
        </p>
      </div>

      {/* Right: Rest of Header with Cohesive Deep Blue Theme */}
      <div className="flex-1 w-full px-3 sm:px-4 py-1.5 flex items-center justify-end gap-3 min-w-0">
        {/* Right Section: Intuitive AI (Management only), Asset, Date, Refresh, User */}
        <div className="flex items-center gap-2 sm:gap-2.5 ml-auto flex-wrap justify-end">
          {/* Intuitive AI Button - ONLY FOR MANAGEMENT */}
          {currentTab === 'management' && ['CMP#01', 'CMP#02'].includes(selectedAsset) && (
            <button
              type="button"
              id="btn-intuitive-ai"
              onClick={onOpenIntuitiveAi}
              className="flex items-center gap-1.5 bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white px-3 py-1.5 rounded-lg text-xs font-bold transition-all shadow-sm active:scale-95 cursor-pointer"
            >
              <Bot className="w-3.5 h-3.5 text-cyan-200" />
              <span>Intuitive AI</span>
            </button>
          )}

          {/* Asset Selector */}
          {currentTab === 'om' && selectedAsset === 'CRANE#01' && (
            <div className="hidden xl:flex items-center gap-2 bg-[#0c2250] border border-white/10 rounded-lg px-3 py-1.5 text-xs font-semibold text-white whitespace-nowrap">
              Texmaco - Agarpara
            </div>
          )}
          {currentTab === 'overview' ? (
            <div className="flex items-center gap-2 bg-[#0c2250] border border-white/10 rounded-lg px-3 py-1.5 text-xs font-semibold text-white whitespace-nowrap">
              Texmaco - Agarpara
            </div>
          ) : <div className="relative" ref={assetRef}>
            <button
              type="button"
              id="asset-selector-btn"
              aria-expanded={isAssetOpen}
              aria-label="Select machine asset"
              onClick={() => { if (!isAssetOpen) onAssetMenuOpen?.(); setIsAssetOpen(!isAssetOpen); }}
              className="flex items-center gap-2 bg-[#0c2250] hover:bg-[#112d68] border border-white/10 rounded-lg px-2.5 py-1.5 text-xs font-bold text-white transition-colors shadow-2xs min-w-[140px] justify-between cursor-pointer"
            >
              <div className="flex items-center gap-1.5 truncate">
                <AssetStatusDot asset={currentAssetObj} />
                <span className="truncate">{currentAssetObj.name || selectedAsset}</span>
              </div>
              <ChevronDown className="w-3.5 h-3.5 text-slate-300 shrink-0" />
            </button>

            {isAssetOpen && (
              <div className="absolute right-0 mt-1.5 w-64 bg-[#0a1e42] border border-[#1b3a72] rounded-xl shadow-2xl py-1.5 z-50 animate-in fade-in-50 duration-150">
                <div className="px-3 py-1 border-b border-white/10 text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                  Select Machine Asset
                </div>
                {availableAssets.map((asset) => (
                  <button
                    key={asset.id}
                    type="button"
                    onClick={() => {
                      onSelectAsset(asset.id);
                      setIsAssetOpen(false);
                    }}
                    className={`w-full text-left px-3 py-2 text-xs flex items-center justify-between hover:bg-white/10 transition-colors cursor-pointer ${
                      selectedAsset === asset.id
                        ? 'bg-blue-600/30 text-cyan-300 font-semibold border-l-2 border-cyan-400'
                        : 'text-slate-200'
                    }`}
                  >
                    <div>
                      <div className="flex items-center gap-2">
                        <AssetStatusDot asset={asset} />
                        <span className="font-semibold">{asset.name}</span>
                      </div>
                      {asset.plant && (
                        <div className="text-[10px] text-slate-400 pl-4">{asset.plant}</div>
                      )}
                    </div>
                    {selectedAsset === asset.id && <Check className="w-4 h-4 text-cyan-400" />}
                  </button>
                ))}
              </div>
            )}
          </div>}

          {/* Inline Custom Date Range Selector (Executive when 'custom' is active) */}
          {currentTab === 'management' && datePreset === 'custom' && (
            <div className="flex items-center gap-1.5 bg-[#0c2250] hover:bg-[#112d68] border border-white/10 rounded-lg px-2.5 py-1 text-xs text-slate-200 shadow-2xs">
              <span className="text-[10px] text-slate-400 font-bold uppercase">From</span>
              <input
                type="date"
                value={customStartDate || ''}
                onChange={(e) => {
                  if (onCustomDateChange) {
                    onCustomDateChange(e.target.value, customEndDate || '');
                  }
                }}
                className="bg-[#071838] border border-white/15 rounded px-1.5 py-0.5 text-xs text-cyan-300 font-medium outline-none cursor-pointer focus:border-cyan-400"
              />
              <span className="text-[10px] text-slate-400 font-bold uppercase">To</span>
              <input
                type="date"
                value={customEndDate || ''}
                onChange={(e) => {
                  if (onCustomDateChange) {
                    onCustomDateChange(customStartDate || '', e.target.value);
                  }
                }}
                className="bg-[#071838] border border-white/15 rounded px-1.5 py-0.5 text-xs text-cyan-300 font-medium outline-none cursor-pointer focus:border-cyan-400"
              />
            </div>
          )}

          {/* Date Range Selector Dropdown */}
          {isSampleAsset ? null : currentTab === 'overview' ? (
            <div className="flex items-center gap-1.5 bg-[#0c2250] border border-white/10 rounded-lg px-2.5 py-1.5 text-xs font-semibold text-slate-200 whitespace-nowrap">
              <Calendar className="w-3.5 h-3.5" /> Last 30 Days (30d)
            </div>
          ) : <div className="relative" ref={dateRef}>
            <button
              type="button"
              id="date-selector-btn"
              aria-expanded={isDateOpen}
              aria-label="Select date range"
              onClick={() => setIsDateOpen(!isDateOpen)}
              className="flex items-center gap-1.5 bg-[#0c2250] hover:bg-[#112d68] border border-white/10 rounded-lg px-2.5 py-1.5 text-xs font-semibold text-slate-200 transition-colors shadow-2xs cursor-pointer"
            >
              <Calendar className="w-3.5 h-3.5 text-slate-300" />
              <span>{getDisplayLabel()}</span>
              <ChevronDown className="w-3.5 h-3.5 text-slate-300" />
            </button>

            {isDateOpen && (
              <div
                className={`absolute right-0 mt-1.5 ${
                  currentTab === 'management' ? 'w-64' : currentTab === 'finance' ? 'w-48' : 'w-44'
                } bg-[#0a1e42] border border-[#1b3a72] rounded-xl shadow-2xl py-1.5 z-50 animate-in fade-in-50 duration-150 text-xs`}
              >
                <div className="px-3 py-1 border-b border-white/10 text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                  Select Date Range
                </div>
                {getPresetOptions().map((opt) => {
                  const isSelected =
                    datePreset === opt.id ||
                    (opt.id === '30days' && datePreset === '30d') ||
                    (opt.id === '30d' && datePreset === '30days') ||
                    (opt.id === '7days' && datePreset === '7d') ||
                    (opt.id === '7d' && datePreset === '7days');

                  return (
                    <button
                      key={opt.id}
                      type="button"
                      onClick={() => {
                        if (onSelectDatePreset) {
                          onSelectDatePreset(opt.id);
                        }
                        if (opt.id !== 'custom') {
                          setIsDateOpen(false);
                        }
                      }}
                      className={`w-full text-left px-3 py-1.5 hover:bg-white/10 transition-colors font-medium flex items-center justify-between cursor-pointer ${
                        isSelected
                          ? 'text-cyan-300 font-bold bg-blue-600/30 border-l-2 border-cyan-400'
                          : 'text-slate-200'
                      }`}
                    >
                      <span>{opt.label}</span>
                      {isSelected && <Check className="w-3.5 h-3.5 text-cyan-400 shrink-0" />}
                    </button>
                  );
                })}

                {/* Custom Date Inputs Section inside dropdown for Management */}
                {currentTab === 'management' && (
                  <div className="mt-1 pt-2 px-3 pb-2 border-t border-white/10 bg-[#071838]/80 rounded-b-xl">
                    <div className="text-[10px] font-bold text-slate-300 uppercase tracking-wider mb-2">
                      Custom Date Range
                    </div>
                    <div className="space-y-2">
                      <div>
                        <label className="text-[10px] text-slate-400 font-semibold block mb-0.5">
                          Start Date
                        </label>
                        <input
                          type="date"
                          value={customStartDate || ''}
                          onChange={(e) => {
                            if (onSelectDatePreset) onSelectDatePreset('custom');
                            if (onCustomDateChange) onCustomDateChange(e.target.value, customEndDate || '');
                          }}
                          className="w-full bg-[#0c2250] border border-white/15 rounded px-2 py-1 text-xs text-white outline-none focus:border-cyan-400 cursor-pointer"
                        />
                      </div>
                      <div>
                        <label className="text-[10px] text-slate-400 font-semibold block mb-0.5">
                          End Date
                        </label>
                        <input
                          type="date"
                          value={customEndDate || ''}
                          onChange={(e) => {
                            if (onSelectDatePreset) onSelectDatePreset('custom');
                            if (onCustomDateChange) onCustomDateChange(customStartDate || '', e.target.value);
                          }}
                          className="w-full bg-[#0c2250] border border-white/15 rounded px-2 py-1 text-xs text-white outline-none focus:border-cyan-400 cursor-pointer"
                        />
                      </div>
                      <button
                        type="button"
                        onClick={() => {
                          if (onSelectDatePreset) onSelectDatePreset('custom');
                          setIsDateOpen(false);
                        }}
                        className="w-full mt-1 bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white font-bold py-1.5 rounded text-xs transition-colors cursor-pointer shadow-xs"
                      >
                        Apply Range
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>}

          {/* Refresh Action */}
          {onRefresh && (
            <button
              type="button"
              onClick={onRefresh}
              title="Refresh dashboard data"
              className="p-1.5 text-slate-300 hover:text-white hover:bg-white/10 rounded-lg border border-white/10 transition-colors cursor-pointer"
            >
              <RefreshCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin text-cyan-400' : ''}`} />
            </button>
          )}

          {/* Notification Bell */}
          <button
            type="button"
            title="Notifications"
            aria-label={notificationCount ? `View ${notificationCount} notifications` : 'Notifications'}
            onClick={onOpenNotifications}
            className="p-2 text-slate-300 hover:text-white hover:bg-white/10 rounded-full transition-colors relative cursor-pointer"
          >
            <Bell className="w-4 h-4" />
            {notificationCount > 0 && (
              <span className="absolute -top-0.5 -right-0.5 min-w-4 h-4 px-1 rounded-full bg-rose-500 text-white text-[9px] font-bold flex items-center justify-center">
                {notificationCount}
              </span>
            )}
          </button>



          {/* Logout Button */}
          {onLogout && (
            <button
              type="button"
              onClick={onLogout}
              title="Log Out"
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-rose-300 hover:text-white bg-rose-500/20 hover:bg-rose-600/30 border border-rose-500/30 rounded-lg transition-colors cursor-pointer shadow-2xs active:scale-95"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span className="hidden md:inline">Logout</span>
            </button>
          )}
        </div>
      </div>
    </header>
  );
};
