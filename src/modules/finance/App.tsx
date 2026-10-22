import React, { useState, useEffect, useCallback } from 'react';
import { Header } from './components/Header';
import { KpiCard } from './components/KpiCard';
import { CostDistributionCard } from './components/CostDistributionCard';
import { FinancialTrendCard } from './components/FinancialTrendCard';
import { KeyTakeawayCard } from './components/KeyTakeawayCard';
import { SavingOpportunitiesCard } from './components/SavingOpportunitiesCard';
import { InputAssumptionsCard } from './components/InputAssumptionsCard';
import { LoginScreen } from './components/LoginScreen';
import { ASSET_OPTIONS, INITIAL_ASSUMPTIONS, PLANTS_DATA } from './mockData';
import { AssetOption, FinancialAssumption, PlantData } from './types';
import {
  buildPayloadFromAssumptions,
  clearFinancialIntelCache,
  fetchFinancialIntel,
  mapFinancialIntelToDashboardData,
  mapInputAssumptionsToState,
  saveFinancialAssumptions,
  SaveAssumptionsResponse,
} from './services/api';

export default function App() {
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(() => {
    return localStorage.getItem('ir_financial_auth') === 'true';
  });
  const [currentUser, setCurrentUser] = useState<string>(() => {
    return localStorage.getItem('ir_financial_user') || 'Financial';
  });

  const [selectedAsset, setSelectedAsset] = useState<AssetOption>(ASSET_OPTIONS[2]); // Default to CNC#01 (MACHINE#PI4G/TXMCNCI/26001)
  const [selectedPlant] = useState<string>('Kharagpur');
  const [selectedTimeRange, setSelectedTimeRange] = useState<string>('1m');
  const [assumptions, setAssumptions] = useState<FinancialAssumption[]>(INITIAL_ASSUMPTIONS);
  const [lastUpdated, setLastUpdated] = useState<string>('Live');
  const [notification, setNotification] = useState<string | null>(null);

  const [dashboardData, setDashboardData] = useState<PlantData | null>(null);
  const [isLoadingIntel, setIsLoadingIntel] = useState<boolean>(false);
  const [intelError, setIntelError] = useState<string | null>(null);

  const defaultPlantData = PLANTS_DATA[selectedPlant] || PLANTS_DATA['Kharagpur'];
  const activePlantData = dashboardData || defaultPlantData;

  const loadFinancialIntel = useCallback(
    async (asset: AssetOption, range: string, forceRefresh = false) => {
      if (!isAuthenticated) return;
      setIsLoadingIntel(true);
      setIntelError(null);
      try {
        const response = await fetchFinancialIntel(asset.asset, range, forceRefresh);
        const mapped = mapFinancialIntelToDashboardData(response, asset.name);
        setDashboardData(mapped);
        if (response.input_assumptions) {
          setAssumptions(mapInputAssumptionsToState(response.input_assumptions));
        }
        const now = new Date();
        setLastUpdated(
          now.toLocaleDateString('en-GB', { day: '2-digit', month: 'short' }) +
          ', ' +
          now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        );
      } catch (err: any) {
        console.error('Error fetching financial intel:', err);
        const msg = err.message || 'Unable to retrieve insights from API.';
        setIntelError(msg);
        showNotification(`API Notice: ${msg}`);
      } finally {
        setIsLoadingIntel(false);
      }
    },
    [isAuthenticated]
  );

  // Fetch financial intel on asset or time range change, and auto-refresh every 30 seconds for fresh updates
  useEffect(() => {
    if (!isAuthenticated) return;
    loadFinancialIntel(selectedAsset, selectedTimeRange);

    // After 30 seconds, cache expires and fresh updates are fetched
    const intervalId = setInterval(() => {
      loadFinancialIntel(selectedAsset, selectedTimeRange, true);
    }, 30 * 1000);

    return () => clearInterval(intervalId);
  }, [isAuthenticated, selectedAsset, selectedTimeRange, loadFinancialIntel]);

  const handleLoginSuccess = (username: string) => {
    setIsAuthenticated(true);
    setCurrentUser(username);
    localStorage.setItem('ir_financial_auth', 'true');
    localStorage.setItem('ir_financial_user', username);
    showNotification(`Authenticated as ${username}`);
  };

  const handleLogout = () => {
    setIsAuthenticated(false);
    localStorage.removeItem('ir_financial_auth');
    localStorage.removeItem('ir_financial_user');
  };

  const handleUpdateAssumptions = (updated: FinancialAssumption[]) => {
    setAssumptions(updated);
    showNotification('Financial assumptions updated locally.');
  };

  const handleResetAssumptions = () => {
    setAssumptions(INITIAL_ASSUMPTIONS);
    showNotification('Financial assumptions reset to default baseline.');
  };

  const handleSaveAssumptionsToApi = async (
    currentAssumptions: FinancialAssumption[]
  ): Promise<{ success: boolean; message?: string; asset?: string }> => {
    try {
      const payload = buildPayloadFromAssumptions(selectedAsset, currentAssumptions);
      const result: SaveAssumptionsResponse = await saveFinancialAssumptions(payload);
      showNotification(`${result.message} (${result.asset})`);
      // Invalidate cache for this asset and pull fresh server calculations immediately
      clearFinancialIntelCache(selectedAsset.asset);
      await loadFinancialIntel(selectedAsset, selectedTimeRange, true);
      return {
        success: true,
        message: result.message,
        asset: result.asset,
      };
    } catch (err: any) {
      console.error('API Save Error:', err);
      const errMsg = err.message || 'Network error while contacting AWS API Gateway.';
      showNotification(`Failed: ${errMsg}`);
      return {
        success: false,
        message: errMsg,
      };
    }
  };

  const showNotification = (msg: string) => {
    setNotification(msg);
    setTimeout(() => setNotification(null), 4000);
  };

  // If not authenticated, display login screen
  if (!isAuthenticated) {
    return <LoginScreen onLoginSuccess={handleLoginSuccess} />;
  }

  return (
    <div className="min-h-screen bg-[#f1f5f9] text-slate-800 flex flex-col font-sans antialiased selection:bg-blue-100 selection:text-blue-900">
      {/* Top Executive Header */}
      <Header
        selectedAsset={selectedAsset}
        onSelectAsset={(asset) => {
          setSelectedAsset(asset);
          showNotification(`Active asset: ${asset.name} (${asset.asset_type})`);
        }}
        selectedTimeRange={selectedTimeRange}
        onSelectTimeRange={(range) => {
          setSelectedTimeRange(range);
          showNotification(`Time range: ${range}`);
        }}
        lastUpdated={lastUpdated}
        currentUser={currentUser}
        onLogout={handleLogout}
      />

      {/* Main Dashboard Canvas */}
      <main className="flex-1 w-full max-w-[1780px] 3xl:max-w-[2400px] 4xl:max-w-[3200px] mx-auto px-2.5 sm:px-4 3xl:px-8 4xl:px-12 py-2 3xl:py-4 4xl:py-6 space-y-2 3xl:space-y-4 4xl:space-y-5">
        
        {/* Floating Notification Toast */}
        {notification && (
          <div className="fixed bottom-4 right-4 z-50 bg-slate-900 text-white text-xs 3xl:text-sm font-medium px-3.5 3xl:px-5 py-2 3xl:py-3 rounded-lg shadow-xl border border-slate-700 flex items-center gap-2 animate-in fade-in slide-in-from-bottom-3 duration-200 max-w-md 3xl:max-w-xl">
            <span className="w-2 h-2 3xl:w-2.5 3xl:h-2.5 rounded-full bg-emerald-400 shrink-0"></span>
            <span>{notification}</span>
          </div>
        )}

        {/* ROW 1: 5 KPI Metric Cards */}
        <section aria-label="Key Performance Indicators" className={`transition-opacity duration-200 ${isLoadingIntel ? 'opacity-70' : 'opacity-100'}`}>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-2 3xl:gap-4 4xl:gap-5 items-stretch">
            {activePlantData.kpis.map((kpi) => (
              <KpiCard key={kpi.id} kpi={kpi} />
            ))}
          </div>
        </section>

        {/* ROW 2: Charts & Executive Takeaway */}
        <section aria-label="Financial Visualizations & Insights" className={`transition-opacity duration-200 ${isLoadingIntel ? 'opacity-70' : 'opacity-100'}`}>
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-2 3xl:gap-4 4xl:gap-5 items-stretch">
            {/* Cost Distribution (Donut Chart) */}
            <div className="lg:col-span-5 flex flex-col h-full">
              <CostDistributionCard
                categories={activePlantData.costCategories}
                totalExposure={activePlantData.totalExposure}
                timeRange={selectedTimeRange.toUpperCase()}
              />
            </div>

            {/* Financial Exposure Trend (Stacked Bar Chart) */}
            <div className="lg:col-span-4 flex flex-col h-full">
              <FinancialTrendCard trendData={activePlantData.trendData} />
            </div>

            {/* Key Takeaway Card (Dynamically rendered from API response) */}
            <div className="lg:col-span-3 flex flex-col h-full">
              <KeyTakeawayCard
                totalExposure={activePlantData.totalExposure}
                keyTakeaway={activePlantData.keyTakeaway}
              />
            </div>
          </div>
        </section>

        {/* ROW 3: Saving Opportunities & Input Assumptions */}
        <section aria-label="Actionable Interventions & Assumptions">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-2 3xl:gap-4 4xl:gap-5 items-stretch">
            {/* Saving Opportunities Table */}
            <div className="lg:col-span-7 flex flex-col h-full">
              <SavingOpportunitiesCard
                opportunities={activePlantData.savingOpportunities}
              />
            </div>

            {/* Input Assumptions (with interactive edit modal & API saving) */}
            <div className="lg:col-span-5 flex flex-col h-full">
              <InputAssumptionsCard
                selectedAsset={selectedAsset}
                assumptions={assumptions}
                onUpdateAssumptions={handleUpdateAssumptions}
                onSaveToApi={handleSaveAssumptionsToApi}
                onResetAssumptions={handleResetAssumptions}
              />
            </div>
          </div>
        </section>

      </main>

      {/* Footer subtle brand tag */}
      <footer className="w-full max-w-[1780px] 3xl:max-w-[2400px] 4xl:max-w-[3200px] mx-auto px-4 sm:px-5 3xl:px-8 4xl:px-12 py-1.5 3xl:py-3 border-t border-slate-200/80 text-center sm:text-left flex flex-wrap items-center justify-between gap-2 text-[10px] 3xl:text-xs 4xl:text-sm text-slate-500">
        <div>
          Intuitive Robotics Financial Intelligence System <span className="text-slate-400">v1.0.0</span>
        </div>
        <div className="text-slate-400">
          Industrial Machine Financial Visibility • Texmaco Rail & Engineering Ltd.
        </div>
      </footer>
    </div>
  );
}
