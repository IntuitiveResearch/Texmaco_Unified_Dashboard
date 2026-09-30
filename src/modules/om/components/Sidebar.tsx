import React from 'react';
import {
  LayoutDashboard,
  Boxes,
  LineChart,
  Bell,
  FileText,
  Wrench,
  Settings,
} from 'lucide-react';
import intuitiveRoboticsLogo from '../images/intuitive-robotics-logo.png';

interface SidebarProps {
  currentTab?: string;
  onSelectTab?: (tab: string) => void;
  alertCount?: number;
}

export const Sidebar: React.FC<SidebarProps> = ({
  currentTab = 'dashboard',
  onSelectTab,
  alertCount = 3,
}) => {
  const navItems = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'assets', label: 'Assets', icon: Boxes },
    { id: 'analytics', label: 'Analytics', icon: LineChart },
    { id: 'alerts', label: 'Alerts', icon: Bell },
    { id: 'reports', label: 'Reports', icon: FileText },
    { id: 'maintenance', label: 'Maintenance', icon: Wrench },
    { id: 'settings', label: 'Settings', icon: Settings },
  ];

  return (
    <aside className="w-36 lg:w-40 2xl:w-44 bg-[#061431] border-r border-[#0d224d] flex flex-col justify-between shrink-0 select-none h-screen sticky top-0 z-20 text-white">
      {/* Top Section: Logo & Navigation */}
      <div>
        {/* Brand Logo Header */}
        <div className="px-3 py-2 border-b border-white/10 flex items-center justify-center">
          <div className="bg-white rounded-lg px-2 py-1 flex items-center justify-center shadow-xs w-full max-w-[140px]">
            <img
              src={intuitiveRoboticsLogo}
              alt="Intuitive Robotics"
              className="h-5 2xl:h-6 w-auto max-h-6 object-contain"
            />
          </div>
        </div>

        {/* Navigation Items */}
        <nav className="p-1.5 space-y-0.5">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = currentTab === item.id;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => onSelectTab && onSelectTab(item.id)}
                className={`w-full flex items-center justify-between px-2 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                  isActive
                    ? 'bg-blue-600 text-white font-bold shadow-xs border border-blue-400/40'
                    : 'text-slate-300 hover:text-white hover:bg-white/10'
                }`}
              >
                <div className="flex items-center gap-2">
                  <div
                    className={`w-6 h-6 rounded-md flex items-center justify-center ${
                      isActive ? 'bg-blue-700 text-white shadow-2xs' : 'text-slate-400'
                    }`}
                  >
                    <Icon className="w-3.5 h-3.5" />
                  </div>
                  <span>{item.label}</span>
                </div>
              </button>
            );
          })}
        </nav>
      </div>

      {/* Bottom Section: Industrial Graphic & Mission Slogan */}
      <div className="relative overflow-hidden p-3 pt-2 border-t border-white/10">
        {/* Subtle Refinery / Plant Skyline Watermark */}
        <div className="absolute -bottom-2 -left-2 opacity-15 pointer-events-none text-blue-200">
          <svg width="180" height="110" viewBox="0 0 200 120" fill="currentColor">
            {/* Distillation towers and refinery silhouettes */}
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
            {/* Piping network */}
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
    </aside>
  );
};
