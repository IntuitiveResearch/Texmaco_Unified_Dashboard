import React, { useState, useEffect, useCallback, forwardRef, useImperativeHandle } from 'react';
import { KpiCard } from './components/KpiCard';
import { CostDistributionCard } from './components/CostDistributionCard';
import { FinancialTrendCard } from './components/FinancialTrendCard';
import { KeyTakeawayCard } from './components/KeyTakeawayCard';
import { SavingOpportunitiesCard } from './components/SavingOpportunitiesCard';
import { InputAssumptionsCard } from './components/InputAssumptionsCard';
import { NextStepsCard } from './components/NextStepsCard';
import { ASSET_OPTIONS, INITIAL_ASSUMPTIONS, PLANTS_DATA } from './mockData';
import { AssetOption, FinancialAssumption, PlantData } from './types';
import {
  buildPayloadFromAssumptions,
  clearFinancialIntelCache,
  fetchFinancialIntel,
  getCachedIntel,
  mapFinancialIntelToDashboardData,
  saveFinancialAssumptions,
  SaveAssumptionsResponse,
} from './services/api';

export interface FinanceDashboardRef {
  refresh: () => void;
}

interface FinanceDashboardViewProps {
  selectedAssetId: string;
  timeRange: string;
  onRefreshingChange?: (isRefreshing: boolean) => void;
}

export const FinanceDashboardView = forwardRef<FinanceDashboardRef, FinanceDashboardViewProps>(
  ({ selectedAssetId, timeRange, onRefreshingChange }, ref) => {
    // Match asset ID to ASSET_OPTIONS
    const matchedAsset =
      ASSET_OPTIONS.find((a) => a.name === selectedAssetId || a.asset === selectedAssetId) ||
      (selectedAssetId === 'CNC#01' || selectedAssetId.includes('CNC') ? ASSET_OPTIONS[2] : null) ||
      (selectedAssetId === 'CMP#02' ? ASSET_OPTIONS[1] : null) ||
      ASSET_OPTIONS[0];

    const [selectedAsset, setSelectedAsset] = useState<AssetOption>(matchedAsset);
    const [assumptions, setAssumptions] = useState<FinancialAssumption[]>(INITIAL_ASSUMPTIONS);
    const [dashboardData, setDashboardData] = useState<PlantData | null>(null);
    const [notification, setNotification] = useState<string | null>(null);
    const [isLoadingIntel, setIsLoadingIntel] = useState(false);
    const [intelError, setIntelError] = useState<string | null>(null);

    // Sync selectedAsset when prop changes
    useEffect(() => {
      setSelectedAsset(matchedAsset);
    }, [matchedAsset]);

    const defaultPlantData = PLANTS_DATA['Kharagpur'] || PLANTS_DATA['Belgharia'] || Object.values(PLANTS_DATA)[0];
    const activePlantData = dashboardData || defaultPlantData;

    const showNotification = (msg: string) => {
      setNotification(msg);
      setTimeout(() => setNotification(null), 4000);
    };

    const loadFinancialIntel = useCallback(
      async (asset: AssetOption, range: string, forceRefresh = false) => {
        // Fast switch: check cache immediately without spinner or lag
        if (!forceRefresh) {
          const cached = getCachedIntel(asset.asset, range);
          if (cached) {
            const mapped = mapFinancialIntelToDashboardData(cached, asset.name);
            setDashboardData(mapped);
            setIntelError(null);
            setIsLoadingIntel(false);
            if (onRefreshingChange) onRefreshingChange(false);
            return;
          }
        }

        setIsLoadingIntel(true);
        setIntelError(null);
        if (onRefreshingChange) onRefreshingChange(true);

        try {
          const response = await fetchFinancialIntel(asset.asset, range, forceRefresh);
          const mapped = mapFinancialIntelToDashboardData(response, asset.name);
          setDashboardData(mapped);
        } catch (err: any) {
          console.error('Error fetching financial intel:', err);
          const msg = err.message || 'Unable to retrieve insights from API.';
          setIntelError(msg);
          showNotification(`Notice: ${msg}`);
        } finally {
          setIsLoadingIntel(false);
          if (onRefreshingChange) onRefreshingChange(false);
        }
      },
      [onRefreshingChange]
    );

    useImperativeHandle(ref, () => ({
      refresh: () => {
        loadFinancialIntel(selectedAsset, timeRange, true);
      },
    }));

    useEffect(() => {
      loadFinancialIntel(selectedAsset, timeRange, false);
    }, [selectedAsset, timeRange, loadFinancialIntel]);

    const handleUpdateAssumptions = (updated: FinancialAssumption[]) => {
      setAssumptions(updated);
      showNotification('Financial assumptions updated locally.');
    };

    const handleResetAssumptions = () => {
      setAssumptions(INITIAL_ASSUMPTIONS);
      showNotification('Financial assumptions reset to baseline.');
    };

    const handleSaveAssumptionsToApi = async (
      currentAssumptions: FinancialAssumption[]
    ): Promise<{ success: boolean; message?: string; asset?: string }> => {
      try {
        const payload = buildPayloadFromAssumptions(selectedAsset, currentAssumptions);
        const result: SaveAssumptionsResponse = await saveFinancialAssumptions(payload);
        showNotification(`${result.message} (${result.asset})`);
        clearFinancialIntelCache(selectedAsset.asset);
        await loadFinancialIntel(selectedAsset, timeRange, true);
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

    if (isLoadingIntel && !dashboardData) {
      return (
        <div className="flex-1 min-h-[400px] flex items-center justify-center p-6 bg-[#f4f7fb]">
          <div className="flex flex-col items-center gap-3">
            <div className="w-10 h-10 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
            <p className="text-sm font-semibold text-slate-600">Loading...</p>
          </div>
        </div>
      );
    }

    return (
      <div className="w-full max-w-none flex-1 overflow-y-auto overflow-x-hidden bg-[#f4f7fb] box-border p-2 sm:p-2.5 lg:p-3 2xl:p-3.5 min-h-0">
        <div className="w-full max-w-none flex flex-col gap-2 sm:gap-2.5 lg:gap-3">
          {/* Toast */}
          {notification && (
            <div className="fixed bottom-4 right-4 z-50 bg-slate-900 text-white text-xs font-medium px-3.5 py-2 rounded-lg shadow-xl border border-slate-700 flex items-center gap-2 animate-in fade-in slide-in-from-bottom-3 duration-200 max-w-md">
              <span className="w-2 h-2 rounded-full bg-emerald-400 shrink-0" />
              <span>{notification}</span>
            </div>
          )}

          {/* ROW 1: 5 KPI Metric Cards */}
          <section aria-label="Key Performance Indicators" className={`w-full transition-opacity duration-200 ${isLoadingIntel ? 'opacity-70' : 'opacity-100'}`}>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-5 gap-2 sm:gap-2.5 items-start">
              {activePlantData.kpis.map((kpi) => (
                <KpiCard key={kpi.id} kpi={kpi} />
              ))}
            </div>
          </section>

          {/* ROW 2: Charts & Executive Takeaway */}
          <section aria-label="Financial Visualizations" className={`w-full transition-opacity duration-200 ${isLoadingIntel ? 'opacity-70' : 'opacity-100'}`}>
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-2 sm:gap-2.5 items-start">
              {/* Cost Distribution (Donut Chart) */}
              <div className="lg:col-span-5 min-w-0">
                <CostDistributionCard
                  categories={activePlantData.costCategories}
                  totalExposure={activePlantData.totalExposure}
                  timeRange={timeRange.toUpperCase()}
                />
              </div>

              {/* Financial Exposure Trend (Stacked Bar Chart) */}
              <div className="lg:col-span-4 min-w-0">
                <FinancialTrendCard trendData={activePlantData.trendData} />
              </div>

              {/* Key Takeaway Card */}
              <div className="lg:col-span-3 min-w-0">
                <KeyTakeawayCard
                  totalExposure={activePlantData.totalExposure}
                  keyTakeaway={activePlantData.keyTakeaway}
                />
              </div>
            </div>
          </section>

          {/* ROW 3: Saving Opportunities, Input Assumptions & Next Steps */}
          <section aria-label="Actionable Interventions" className="w-full">
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-2 sm:gap-2.5 items-start">
              {/* Saving Opportunities Table */}
              <div className="lg:col-span-5 min-w-0">
                <SavingOpportunitiesCard
                  opportunities={activePlantData.savingOpportunities}
                />
              </div>

              {/* Input Assumptions */}
              <div className="lg:col-span-4 min-w-0">
                <InputAssumptionsCard
                  selectedAsset={selectedAsset}
                  assumptions={assumptions}
                  onUpdateAssumptions={handleUpdateAssumptions}
                  onSaveToApi={handleSaveAssumptionsToApi}
                  onResetAssumptions={handleResetAssumptions}
                />
              </div>

              {/* Next Steps Card */}
              <div className="lg:col-span-3 min-w-0">
                <NextStepsCard />
              </div>
            </div>
          </section>
        </div>
      </div>
    );
  }
);
