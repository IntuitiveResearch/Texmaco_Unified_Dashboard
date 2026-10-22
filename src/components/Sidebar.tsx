import React from 'react';
import {
  LayoutDashboard,
  House,
  TrendingUp,
  Activity,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';
import texmacoLogo from '../assets/texmaco-logo.png';
import trainLineArt from '../assets/sidebar-train-white.png';

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
      icon: House,
    },
    {
      id: 'om' as DashboardTab,
      label: 'O&M Dashboard',
      icon: Activity,
    },
    {
      id: 'management' as DashboardTab,
      label: 'Executive Dashboard',
      icon: LayoutDashboard,
    },
    {
      id: 'finance' as DashboardTab,
      label: 'Financial Dashboard',
      icon: TrendingUp,
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
        <div className="sidebar-brand-row px-2.5 py-2 border-b border-white/10 flex items-center justify-between gap-1.5 min-h-[68px]">
          {!isCollapsed && (
            <div className="sidebar-brand bg-white rounded-lg px-2 py-1 flex items-center justify-center shadow-xs flex-1 max-w-[140px] transition-opacity duration-150">
              <img
                src={texmacoLogo}
                alt="Texmaco Rail & Engineering Ltd."
                className="h-12 w-auto object-contain"
              />
            </div>
          )}
          {isCollapsed && (
            <div className="mx-auto bg-white rounded-md p-1 flex items-center justify-center shadow-xs w-10 h-10">
              <img src={texmacoLogo} alt="Texmaco Rail & Engineering Ltd." className="w-full h-full object-contain" />
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

            return (
              <button
                key={item.id}
                type="button"
                onClick={() => onSelectTab(item.id)}
                aria-current={isActive ? 'page' : undefined}
                title={item.label}
                className={`w-full flex items-center ${
                  isCollapsed ? 'justify-center px-1' : 'justify-between px-2.5'
                } py-2 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                  isActive
                    ? 'bg-blue-600 text-white font-bold shadow-xs border border-blue-400/40'
                    : 'text-slate-300 hover:text-white hover:bg-white/10'
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
              </button>
            );
          })}
        </nav>
      </div>

      {!isCollapsed && (
        <div className="relative flex-1 min-h-0 overflow-hidden pointer-events-none" aria-hidden="true">
          <img
            src={trainLineArt}
            alt=""
            className="absolute bottom-0 -left-5 h-[min(100%,470px)] w-auto max-w-none object-contain opacity-60"
            style={{ maskImage: 'linear-gradient(to bottom, black 0%, black 88%, transparent 100%)' }}
          />
        </div>
      )}

      {/* Bottom Section: Industrial Graphic & Mission Slogan */}
      {!isCollapsed && (
        <div className="sidebar-footer relative overflow-hidden p-3 pt-2 border-t border-white/10 transition-opacity duration-150">
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
