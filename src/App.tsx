import React, { useState, useRef } from 'react';
import { format, subDays } from 'date-fns';
import { Sidebar, DashboardTab } from './components/Sidebar';
import { Header, HeaderAsset } from './components/Header';
import { LoginScreen } from './components/LoginScreen';
import { FileText, Clock, FileSpreadsheet, Download } from 'lucide-react';
import { OmDashboardView, OmDashboardRef } from './modules/om/OmDashboardView';
import { ManagementDashboardView, ManagementDashboardRef } from './modules/management/ManagementDashboardView';
import { FinanceDashboardView, FinanceDashboardRef } from './modules/finance/FinanceDashboardView';
import { useAssetStatuses } from './hooks/useAssetStatuses';
import { AssetOverviewView } from './modules/overview/AssetOverviewView';
import { CraneDashboardView } from './modules/crane/CraneDashboardView';
import { CRANE_ASSET_STATUS } from './modules/crane/craneStatus';
import { MigOmDashboardView } from './modules/om/MigOmDashboardView';
import { MIG_ASSET_ID } from './modules/om/data/migSample';
import { fetchFinancialIntel } from './modules/finance/services/api';
import { ASSET_OPTIONS } from './modules/finance/mockData';

const ReportsPlaceholderView: React.FC = () => (
  <div className="flex-1 w-full p-4 lg:p-6 flex items-center justify-center">
    <div className="bg-white border border-slate-200/90 rounded-2xl p-8 max-w-lg w-full text-center shadow-xs">
      <div className="w-14 h-14 rounded-2xl bg-blue-50 border border-blue-100 text-blue-600 flex items-center justify-center mx-auto mb-4">
        <FileText className="w-7 h-7" />
      </div>
      <h2 className="text-lg font-bold text-slate-800">Executive Reports Center</h2>
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

const AVAILABLE_HEADER_ASSETS: HeaderAsset[] = [
  {
    id: 'CMP#01',
    name: 'Compressor 1',
    plant: 'Agarpara Plant',
    status: 'Online',
  },
  {
    id: 'CMP#02',
    name: 'Compressor 2',
    plant: 'Agarpara Plant',
    status: 'Online',
  },
  {
    id: 'CNC#01',
    name: 'CNC 1',
    plant: 'Agarpara Plant',
    status: 'Online',
  },
  {
    id: 'ROBO#01',
    name: 'Robo Welder',
    plant: 'Texmaco - Agarpara',
    status: 'Online',
  },
  {
    id: 'CRANE#01',
    name: 'EOT Crane - Bay 1 (10 Ton)',
    plant: 'Texmaco - Agarpara',
    status: CRANE_ASSET_STATUS,
  },
  {
    id: MIG_ASSET_ID,
    name: 'MIG Welding Machine',
    plant: 'Texmaco - Agarpara',
    status: 'Offline',
  },
];

export default function App() {
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(() => {
    return localStorage.getItem('isLoggedIn') === 'true';
  });

  const [currentUser, setCurrentUser] = useState<{ uid: string; name: string } | null>(() => {
    try {
      const stored = localStorage.getItem('texmaco_unified_auth');
      return stored ? JSON.parse(stored) : null;
    } catch {
      return null;
    }
  });

  const [currentTab, setCurrentTab] = useState<DashboardTab>('overview');
  const [overviewRefreshKey, setOverviewRefreshKey] = useState(0);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState<boolean>(false);
  const [selectedAsset, setSelectedAsset] = useState<string>(() => {
    const saved = localStorage.getItem('texmaco_selected_asset');
    return saved ? saved : 'CMP#02';
  });

  // Date presets per module
  const [omDatePreset, setOmDatePreset] = useState<string>('30days');
  const [craneDatePreset, setCraneDatePreset] = useState<'today' | '7days' | '30days'>('7days');
  const [craneRefreshKey, setCraneRefreshKey] = useState(0);
  const [mgmtDatePreset, setMgmtDatePreset] = useState<string>('30d');
  const [financeDatePreset, setFinanceDatePreset] = useState<string>('1m');
  const statusRangePreset = omDatePreset === 'today' ? 'today' : omDatePreset === '7days' ? '7days' : '30days';
  const { statuses: assetStatuses, reportRunState, refreshStatuses } = useAssetStatuses(isAuthenticated, statusRangePreset);
  const headerAssets = AVAILABLE_HEADER_ASSETS
    .filter(asset => currentTab === 'om' || (asset.id !== 'CRANE#01' && asset.id !== MIG_ASSET_ID))
    .map(asset => ({ ...asset, status: asset.id === 'CRANE#01' ? CRANE_ASSET_STATUS : asset.id === MIG_ASSET_ID ? 'Offline' : assetStatuses[asset.id] ?? 'Online' }));

  // Custom date range for Executive Dashboard
  const [customStartDate, setCustomStartDate] = useState<string>(
    format(subDays(new Date(), 30), 'yyyy-MM-dd')
  );
  const [customEndDate, setCustomEndDate] = useState<string>(
    format(new Date(), 'yyyy-MM-dd')
  );

  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);
  const theme = 'light';

  // State for Intuitive AI Report Modal in Management
  const [isReportModalOpen, setIsReportModalOpen] = useState<boolean>(false);

  // Always keep light theme active
  React.useEffect(() => {
    document.documentElement.classList.remove('dark');
    localStorage.setItem('texmaco_theme', 'light');
  }, []);

  // Synchronize selected machine asset to persistent storage
  React.useEffect(() => {
    if (selectedAsset) {
      localStorage.setItem('texmaco_selected_asset', selectedAsset);
    }
  }, [selectedAsset]);

  // Preload financial intel in the background so the dashboard is already updated when viewed
  React.useEffect(() => {
    if (!isAuthenticated) return;
    const targetAsset =
      ASSET_OPTIONS.find((a) => a.name === selectedAsset || a.asset === selectedAsset) ||
      (selectedAsset === 'CNC#01' || selectedAsset.includes('CNC') ? ASSET_OPTIONS[2] : null) ||
      (selectedAsset === 'CMP#02' ? ASSET_OPTIONS[1] : null) ||
      ASSET_OPTIONS[0];

    if (targetAsset) {
      void fetchFinancialIntel(targetAsset.asset, financeDatePreset);
    }
  }, [isAuthenticated, selectedAsset, financeDatePreset]);

  // Module Refs for imperative refresh
  const omRef = useRef<OmDashboardRef>(null);
  const managementRef = useRef<ManagementDashboardRef>(null);
  const financeRef = useRef<FinanceDashboardRef>(null);

  const handleLoginSuccess = (user: { uid: string; name: string }) => {
    setIsAuthenticated(true);
    setCurrentUser(user);
  };

  const handleLogout = () => {
    localStorage.removeItem('isLoggedIn');
    localStorage.removeItem('texmaco_unified_auth');
    setIsAuthenticated(false);
    setCurrentUser(null);
  };

  const handleRefresh = () => {
    if (currentTab === 'overview') {
      setOverviewRefreshKey(previous => previous + 1);
      void refreshStatuses();
    } else if (currentTab === 'om' && selectedAsset === 'CRANE#01') {
      setCraneRefreshKey(previous => previous + 1);
    } else if (currentTab === 'om' && omRef.current) {
      omRef.current.refresh();
    } else if (currentTab === 'management' && managementRef.current) {
      managementRef.current.refresh();
    } else if (currentTab === 'finance' && financeRef.current) {
      financeRef.current.refresh();
    }
  };

  const handleOpenIntuitiveAi = () => {
    setIsReportModalOpen(true);
  };

  const handleOpenAsset = (assetId: string) => {
    setSelectedAsset(assetId);
    setCurrentTab('om');
  };

  const handleSelectTab = (tab: DashboardTab) => {
    if ((tab === 'management' || tab === 'finance') && (selectedAsset === 'CRANE#01' || selectedAsset === MIG_ASSET_ID)) {
      setSelectedAsset('CMP#02');
    }
    setCurrentTab(tab);
  };

  // If user is not authenticated, render unified login screen
  if (!isAuthenticated) {
    return <LoginScreen onLoginSuccess={handleLoginSuccess} />;
  }

  return (
    <div className="min-h-screen max-h-screen h-screen flex flex-row overflow-hidden bg-[#f4f7fb] text-slate-800 font-sans">
      {/* Collapsible Left Sidebar */}
      <Sidebar
        currentTab={currentTab}
        onSelectTab={handleSelectTab}
        isCollapsed={isSidebarCollapsed}
        onToggleCollapse={() => setIsSidebarCollapsed((prev) => !prev)}
      />

      {/* Main Content Workspace */}
      <div className="flex-1 flex flex-col min-w-0 h-screen overflow-hidden">
        {/* Unified Executive Header */}
        <Header
          currentTab={currentTab}
          selectedAsset={selectedAsset}
          availableAssets={headerAssets}
          isSampleAsset={currentTab === 'om' && selectedAsset === MIG_ASSET_ID}
          onAssetMenuOpen={() => { if (currentTab === 'om') void refreshStatuses(); }}
          onSelectAsset={(newAssetId) => setSelectedAsset(newAssetId)}
          datePreset={
            currentTab === 'om'
              ? selectedAsset === 'CRANE#01' ? craneDatePreset : omDatePreset
              : currentTab === 'management'
              ? mgmtDatePreset
              : currentTab === 'finance'
              ? financeDatePreset
              : '30days'
          }
          onSelectDatePreset={(newPreset) => {
            if (currentTab === 'om') {
              if (selectedAsset === 'CRANE#01') setCraneDatePreset(newPreset as 'today' | '7days' | '30days');
              else setOmDatePreset(newPreset);
            } else if (currentTab === 'management') {
              setMgmtDatePreset(newPreset);
            } else if (currentTab === 'finance') {
              setFinanceDatePreset(newPreset);
            }
          }}
          customStartDate={customStartDate}
          customEndDate={customEndDate}
          onCustomDateChange={(start, end) => {
            setCustomStartDate(start);
            setCustomEndDate(end);
            setMgmtDatePreset('custom');
          }}
          isRefreshing={isRefreshing}
          onRefresh={currentTab === 'om' && selectedAsset === MIG_ASSET_ID ? undefined : handleRefresh}
          onOpenIntuitiveAi={handleOpenIntuitiveAi}
          onLogout={handleLogout}
          notificationCount={0}
          userDisplayName={currentUser?.name || 'Texmaco Management'}
          theme="light"
        />

        {/* View Routing Canvas - Resolution Agnostic Single-Screen View */}
        <main className="flex-1 min-h-0 flex flex-col overflow-hidden h-full">
          {currentTab === 'overview' && (
            <AssetOverviewView
              statuses={assetStatuses}
              refreshKey={overviewRefreshKey}
              onOpenAsset={handleOpenAsset}
            />
          )}
          {currentTab === 'om' && selectedAsset === 'CRANE#01' && (
            <CraneDashboardView datePreset={craneDatePreset} refreshKey={craneRefreshKey} />
          )}
          {currentTab === 'om' && selectedAsset === MIG_ASSET_ID && <MigOmDashboardView />}
          {currentTab === 'om' && selectedAsset !== 'CRANE#01' && selectedAsset !== MIG_ASSET_ID && (
            <OmDashboardView
              ref={omRef}
              selectedAsset={selectedAsset}
              rangePreset={(omDatePreset as any) || '30days'}
              onRefreshingChange={setIsRefreshing}
              onRunStateChange={reportRunState}
            />
          )}

          {currentTab === 'management' && (
            <ManagementDashboardView
              ref={managementRef}
              selectedAsset={selectedAsset}
              datePreset={mgmtDatePreset}
              customStartDate={customStartDate}
              customEndDate={customEndDate}
              onCustomDateChange={(start, end) => {
                setCustomStartDate(start);
                setCustomEndDate(end);
                setMgmtDatePreset('custom');
              }}
              isReportModalOpen={isReportModalOpen}
              onCloseReportModal={() => setIsReportModalOpen(false)}
              onOpenReportModal={() => setIsReportModalOpen(true)}
              onSelectAsset={(asset) => setSelectedAsset(asset)}
              onSelectDatePreset={(preset) => setMgmtDatePreset(preset)}
              onRefreshingChange={setIsRefreshing}
              theme="light"
            />
          )}

          {currentTab === 'finance' && (
            <FinanceDashboardView
              ref={financeRef}
              selectedAssetId={selectedAsset}
              timeRange={financeDatePreset}
              onRefreshingChange={setIsRefreshing}
            />
          )}

          {currentTab === 'reports' && <ReportsPlaceholderView />}
        </main>
      </div>
    </div>
  );
}
