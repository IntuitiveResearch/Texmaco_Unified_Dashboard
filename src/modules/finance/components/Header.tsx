import React from 'react';
import { ChevronDown, Building2, Calendar, Cpu, LogOut, User } from 'lucide-react';
import { TIME_RANGES, ASSET_OPTIONS } from '../mockData';
import { AssetOption } from '../types';

interface HeaderProps {
  selectedAsset: AssetOption;
  onSelectAsset: (asset: AssetOption) => void;
  selectedPlant?: string;
  onSelectPlant?: (plant: string) => void;
  selectedTimeRange: string;
  onSelectTimeRange: (range: string) => void;
  lastUpdated?: string;
  currentUser?: string;
  onLogout?: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  selectedAsset,
  onSelectAsset,
  selectedTimeRange,
  onSelectTimeRange,
  currentUser,
  onLogout,
}) => {
  return (
    <header className="bg-[#08172c] text-white border-b border-slate-800 shadow-md">
      <div className="w-full max-w-[1780px] 3xl:max-w-[2400px] 4xl:max-w-[3200px] mx-auto px-3 sm:px-5 3xl:px-8 4xl:px-12 py-2 3xl:py-3.5 4xl:py-4 flex flex-wrap items-center justify-between gap-3">
        
        {/* Left: Brand + Title + Texmaco */}
        <div className="flex items-center flex-wrap gap-3 sm:gap-5 3xl:gap-8">
          {/* Intuitive Robotics Logo */}
          <div className="flex items-center gap-2 3xl:gap-3">
            <div className="w-7 h-7 3xl:w-9 3xl:h-9 4xl:w-11 4xl:h-11 rounded-md bg-gradient-to-br from-cyan-500 to-blue-600 flex items-center justify-center font-bold text-white shadow-inner tracking-tight text-sm 3xl:text-base 4xl:text-lg">
              iR
            </div>
            <div className="leading-tight">
              <div className="text-xs 3xl:text-sm 4xl:text-base font-bold tracking-wider text-slate-100 uppercase">
                INTUITIVE ROBOTICS
              </div>
              <div className="text-[9px] 3xl:text-xs 4xl:text-sm text-cyan-400 font-medium tracking-wide">
                Machines Know More
              </div>
            </div>
          </div>

          {/* Divider */}
          <div className="hidden sm:block h-7 3xl:h-9 4xl:h-11 w-[1px] bg-slate-700/80" />

          {/* Dashboard Title & Subtitle */}
          <div>
            <h1 className="text-sm sm:text-base 3xl:text-lg 4xl:text-xl font-bold tracking-tight text-white flex items-center gap-2 leading-tight">
              Financial Intelligence Dashboard
            </h1>
            <p className="text-[10px] 3xl:text-xs 4xl:text-sm text-slate-400 font-normal leading-none mt-0.5">
              Turning Machine Performance into Financial Visibility
            </p>
          </div>

          {/* Partner Emblem: Texmaco */}
          <div className="hidden xl:flex items-center gap-2 3xl:gap-3 pl-3 3xl:pl-5 border-l border-slate-700/70">
            <div className="w-7 h-7 3xl:w-9 3xl:h-9 rounded border border-slate-700 bg-slate-900/90 flex items-center justify-center text-slate-300">
              <Building2 className="w-3.5 h-3.5 3xl:w-4.5 3xl:h-4.5 text-slate-400" />
            </div>
            <div className="leading-tight">
              <div className="text-[11px] 3xl:text-xs 4xl:text-sm font-bold tracking-wider text-slate-200 uppercase">
                TEXMACO
              </div>
              <div className="text-[8px] 3xl:text-[10px] 4xl:text-xs text-slate-400 uppercase tracking-widest leading-none">
                RAIL & ENGINEERING LTD.
              </div>
            </div>
          </div>
        </div>

        {/* Right: Controls & Meta */}
        <div className="flex items-center flex-wrap gap-2.5 sm:gap-3 3xl:gap-4">
          {/* Asset Dropdown Menu */}
          <div className="relative flex items-center bg-[#091b32] border border-slate-700/80 rounded-md px-2.5 py-1 3xl:px-3.5 3xl:py-2 text-xs 3xl:text-sm text-slate-200 hover:border-slate-600 transition-colors shadow-inner">
            <Cpu className="w-3.5 h-3.5 3xl:w-4.5 3xl:h-4.5 text-cyan-400 mr-1.5 shrink-0" />
            <span className="text-slate-400 mr-1 font-medium text-[11px] 3xl:text-xs">Asset</span>
            <select
              value={selectedAsset.name}
              onChange={(e) => {
                const found = ASSET_OPTIONS.find((a) => a.name === e.target.value);
                if (found) onSelectAsset(found);
              }}
              className="bg-transparent font-bold text-white focus:outline-none cursor-pointer pr-4 appearance-none text-xs 3xl:text-sm"
            >
              {ASSET_OPTIONS.map((a) => (
                <option key={a.name} value={a.name} className="bg-[#091b32] text-white">
                  {a.name}
                </option>
              ))}
            </select>
            <ChevronDown className="w-3 h-3 3xl:w-4 3xl:h-4 text-slate-400 absolute right-1.5 3xl:right-2 pointer-events-none" />
          </div>

          {/* Time Range Selector - Modern Segmented Control */}
          <div className="flex items-center bg-[#091b32] border border-slate-700/80 rounded-md p-0.5 3xl:p-1 text-xs 3xl:text-sm shadow-inner">
            <div className="hidden sm:flex items-center gap-1 pl-1.5 pr-1 py-0.5 text-slate-400 font-medium text-[10px] 3xl:text-xs">
              <Calendar className="w-3 h-3 3xl:w-4 3xl:h-4 text-cyan-400" />
              <span className="hidden xl:inline text-slate-300">Period:</span>
            </div>
            <div className="flex items-center gap-0.5">
              {TIME_RANGES.map((r) => {
                const isSelected = selectedTimeRange === r.value;
                return (
                  <button
                    key={r.value}
                    type="button"
                    onClick={() => onSelectTimeRange(r.value)}
                    className={`px-2 py-0.5 3xl:px-3 3xl:py-1 4xl:px-3.5 4xl:py-1.5 rounded text-[11px] 3xl:text-xs 4xl:text-sm transition-all duration-150 cursor-pointer whitespace-nowrap font-medium ${
                      isSelected
                        ? 'bg-blue-600 text-white font-semibold shadow-xs'
                        : 'text-slate-300 hover:text-white hover:bg-slate-800/80'
                    }`}
                    title={r.fullLabel}
                  >
                    <span className="hidden md:inline">{r.fullLabel}</span>
                    <span className="hidden sm:inline md:hidden">{r.label}</span>
                    <span className="sm:hidden">{r.shortLabel}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Current User Badge & Logout */}
          {currentUser && (
            <div className="flex items-center gap-1.5 pl-1 sm:pl-2 sm:border-l border-slate-700/70">
              <div className="flex items-center gap-1.5 bg-[#091b32] border border-slate-700/80 rounded-md px-2 py-1 3xl:px-3 3xl:py-1.5 text-xs 3xl:text-sm text-slate-200">
                <div className="w-4 h-4 3xl:w-5 3xl:h-5 rounded-full bg-blue-500/20 text-cyan-400 flex items-center justify-center">
                  <User className="w-2.5 h-2.5 3xl:w-3.5 3xl:h-3.5" />
                </div>
                <span className="font-bold text-slate-100 hidden sm:inline">{currentUser}</span>
              </div>

              {onLogout && (
                <button
                  type="button"
                  onClick={onLogout}
                  title="Sign Out"
                  aria-label="Sign Out"
                  className="flex items-center gap-1 bg-[#091b32] hover:bg-rose-950/40 border border-slate-700/80 hover:border-rose-700/80 rounded-md px-2 py-1 3xl:px-2.5 3xl:py-1.5 text-xs 3xl:text-sm text-slate-300 hover:text-rose-300 transition-colors cursor-pointer"
                >
                  <LogOut className="w-3.5 h-3.5 3xl:w-4 3xl:h-4 text-slate-400 hover:text-rose-400" />
                  <span className="hidden md:inline font-medium text-[11px] 3xl:text-xs">Logout</span>
                </button>
              )}
            </div>
          )}
        </div>

      </div>
    </header>
  );
};
