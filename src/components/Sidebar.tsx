import React from 'react';
import {
  LayoutDashboard,
  House,
  TrendingUp,
  Activity,
  Zap,
  FileText,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';
import intuitiveRoboticsLogo from '../assets/intuitive-robotics-logo.png';

export type DashboardTab = 'overview' | 'om' | 'management' | 'finance' | 'reports';

interface SidebarProps {
  currentTab: DashboardTab;
  onSelectTab: (tab: DashboardTab) => void;
  isCollapsed: boolean;
  onToggleCollapse: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  currentTab,
  onSelectTab,
  isCollapsed,
  onToggleCollapse,
}) => {
  const navItems = [
    {
      id: 'overview' as DashboardTab,
      label: 'Asset Overview',
      shortLabel: 'Overview',
      icon: House,
      badge: null,
    },
    {
      id: 'om' as DashboardTab,
      label: 'O&M Dashboard',
      shortLabel: 'O&M',
      icon: Activity,
      badge: null,
    },
    {
      id: 'management' as DashboardTab,
      label: 'Executive Dashboard',
      shortLabel: 'Executive',
      icon: LayoutDashboard,
      badge: null,
    },
    {
      id: 'finance' as DashboardTab,
      label: 'Financial Dashboard',
      shortLabel: 'Financial',
      icon: TrendingUp,
      badge: null,
    },
    {
      id: 'reports' as DashboardTab,
      label: 'Reports',
      shortLabel: 'Reports',
      icon: FileText,
      badge: 'Soon',
    },
  ];

  return (
    <aside
      className={`${
        isCollapsed ? 'w-16' : 'w-48 lg:w-52'
      } bg-[#061431] border-r border-[#0d224d] flex flex-col justify-between shrink-0 select-none h-screen sticky top-0 z-40 text-white transition-all duration-200 ease-in-out`}
    >
      {/* Top Section: Logo & Collapsible Header */}
      <div>
        {/* Brand Logo Header */}
        <div className="sidebar-brand-row px-2.5 py-2.5 border-b border-white/10 flex items-center justify-between gap-1.5 min-h-[57px]">
          {!isCollapsed && (
            <div className="sidebar-brand bg-white rounded-lg px-2 py-1 flex items-center justify-center shadow-xs flex-1 max-w-[140px] transition-opacity duration-150">
              <img
                src={intuitiveRoboticsLogo}
                alt="Intuitive Robotics"
                className="h-5 lg:h-6 w-auto object-contain"
              />
            </div>
          )}
          {isCollapsed && (
            <div className="mx-auto bg-white rounded-md p-1 flex items-center justify-center shadow-xs w-8 h-8">
              <span className="text-[#061431] font-black text-xs">IR</span>
            </div>
          )}

          {/* Collapse Toggle Button */}
          <button
            type="button"
            onClick={onToggleCollapse}
            title={isCollapsed ? 'Expand Sidebar' : 'Collapse Sidebar'}
            className="p-1 rounded-md text-slate-400 hover:text-white hover:bg-white/10 transition-colors cursor-pointer shrink-0"
          >
            {isCollapsed ? (
              <ChevronRight className="w-4 h-4 text-slate-300" />
            ) : (
              <ChevronLeft className="w-4 h-4 text-slate-300" />
            )}
          </button>
        </div>

        {/* Navigation Items */}
        <nav className="p-1.5 space-y-1 mt-1">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = currentTab === item.id;
            const isReports = item.id === 'reports';

            return (
              <button
                key={item.id}
                type="button"
                onClick={() => {
                  if (isReports) {
                    // "do nothing for Reports now"
                    return;
                  }
                  onSelectTab(item.id);
                }}
                disabled={isReports}
                aria-current={isActive ? 'page' : undefined}
                title={item.label + (isReports ? ' (Coming Soon)' : '')}
                className={`w-full flex items-center ${
                  isCollapsed ? 'justify-center px-1' : 'justify-between px-2.5'
                } py-2 rounded-lg text-xs font-semibold transition-all ${
                  isReports
                    ? 'opacity-40 cursor-not-allowed text-slate-400'
                    : 'cursor-pointer'
                } ${
                  isActive
                    ? 'bg-blue-600 text-white font-bold shadow-xs border border-blue-400/40'
                    : !isReports
                    ? 'text-slate-300 hover:text-white hover:bg-white/10'
                    : ''
                }`}
              >
                <div className={`flex items-center ${isCollapsed ? 'justify-center' : 'gap-2.5'} min-w-0`}>
                  <div
                    className={`w-6 h-6 rounded-md flex items-center justify-center shrink-0 ${
                      isActive ? 'bg-blue-700 text-white shadow-2xs' : 'text-slate-400'
                    }`}
                  >
                    <Icon className="w-3.5 h-3.5 shrink-0" />
                  </div>
                  {!isCollapsed && (
                    <span className="sidebar-item-label truncate text-[11.5px] lg:text-xs tracking-tight">
                      {item.label}
                    </span>
                  )}
                </div>

                {!isCollapsed && item.badge && (
                  <span className="text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded bg-slate-800 text-slate-400 border border-slate-700">
                    {item.badge}
                  </span>
                )}
              </button>
            );
          })}
        </nav>
      </div>

      {/* Bottom Section: Industrial Graphic & Mission Slogan */}
      {!isCollapsed && (
        <div className="sidebar-footer relative overflow-hidden p-3 pt-2 border-t border-white/10 transition-opacity duration-150">
          {/* Subtle Refinery / Plant Skyline Watermark */}
          <div className="absolute -bottom-2 -left-2 opacity-15 pointer-events-none text-blue-200">
            <svg width="180" height="110" viewBox="0 0 200 120" fill="currentColor">
              <rect x="10" y="50" width="14" height="70" rx="2" />
              <rect x="28" y="30" width="18" height="90" rx="3" />
              <line x1="37" y1="30" x2="37" y2="15" stroke="currentColor" strokeWidth="2" />
              <rect x="50" y="60" width="12" height="60" rx="2" />
              <rect x="66" y="40" width="22" height="80" rx="3" />
              <polygon points="66,40 77,20 88,40" />
              <line x1="77" y1="20" x2="77" y2="10" stroke="currentColor" strokeWidth="1.5" />
              <rect x="92" y="55" width="16" height="65" rx="2" />
              <rect x="112" y="35" width="26" height="85" rx="4" />
              <line x1="125" y1="35" x2="125" y2="12" stroke="currentColor" strokeWidth="2" />
              <path d="M 24 70 H 50 V 85 H 66 V 75 H 92 V 90 H 112" fill="none" stroke="currentColor" strokeWidth="1.5" />
              <rect x="142" y="65" width="20" height="55" rx="2" />
              <rect x="166" y="45" width="16" height="75" rx="2" />
            </svg>
          </div>

          <div className="relative z-10 space-y-0.5">
            <p className="text-[11px] 2xl:text-xs text-slate-300 font-medium">More Uptime</p>
            <p className="text-[11px] 2xl:text-xs text-slate-300 font-medium">Higher Productivity</p>
            <p className="text-[11px] 2xl:text-xs text-slate-300 font-medium">A Sustainable Tomorrow</p>
          </div>
        </div>
      )}
    </aside>
  );
};
