# Unified dashboard merge handoff

This document describes the local changes in `Unified_Dashboard` for an agent merging them into another version of this project. It records the worktree as of **2026-10-03**, on branch `main` at base commit `193881b` (`fix(executive): display Total Idle Time for Robo Welder KPI card`). These changes are **uncommitted**. Compare the actual files when merging; this document is a guide, not a substitute for the diff.

---

## User-facing changes

| Area | Behavior to preserve | Main files |
| --- | --- | --- |
| **Financial Dashboard: Next Steps Removal** | The "Next Steps" card was completely removed from Row 3 of the Financial Intelligence Dashboard. Row 3 now cleanly divides between Saving Opportunities (expanded to 7 cols) and Input Assumptions (expanded to 5 cols) on large screens. | `src/modules/finance/FinanceDashboardView.tsx`, `src/modules/finance/App.tsx` |
| **Saving Opportunities: Total Estimated Value** | The Saving Opportunities card now displays the dynamic Total Estimated Value in two places: (1) a prominent green pill badge in the header (`Total Est: ₹ X – Y Lakhs`), and (2) a sticky summary `<tfoot>` row at the bottom of the table showing the summed range for either all opportunities or the active priority filter (`All`, `High`, `Med`, `Low`), alongside an item count indicator. | `src/modules/finance/components/SavingOpportunitiesCard.tsx`, `src/modules/finance/services/api.ts`, `src/modules/finance/types.ts` |
| **Equalized Card Heights (Row 2 & Row 3)** | Cards in Row 2 (Cost Distribution, Financial Exposure Trend, Key Takeaway) and Row 3 (Saving Opportunities, Input Assumptions) stretch to the exact same height (`items-stretch h-full`). Target callouts in Key Takeaway are anchored to the bottom (`mt-auto`). | `src/modules/finance/FinanceDashboardView.tsx`, `src/modules/finance/components/CostDistributionCard.tsx`, `src/modules/finance/components/FinancialTrendCard.tsx`, `src/modules/finance/components/KeyTakeawayCard.tsx`, `src/modules/finance/components/SavingOpportunitiesCard.tsx`, `src/modules/finance/App.tsx` |
| **Input Assumptions: Gap Elimination** | The two tinted parameter boxes in Input Assumptions (`#F4F8FF` cool blue and `#F3FAF7` soft teal) stretch to `100%` height (`flex-1 h-full`) and distribute items evenly (`justify-around`). This eliminates any trailing whitespace beneath Input Assumptions and aligns the card's bottom edge flush with Saving Opportunities. | `src/modules/finance/components/InputAssumptionsCard.tsx` |
| **Single-Screen Viewport Fit** | The entire Financial Dashboard layout fits cleanly within desktop/laptop viewports without unnecessary page scrolling. Row 1 (KPIs) is fixed (`shrink-0`), while Rows 2 and 3 share equal proportional vertical space (`flex-1 min-h-0`). All 5 KPI cards in Row 1 stretch uniformly (`h-full justify-between`). | `src/modules/finance/FinanceDashboardView.tsx`, `src/modules/finance/components/KpiCard.tsx`, `src/modules/finance/App.tsx` |
| **Robo Welder Positioning & Idle Time Derivation** | Because `/welding` reports `0` for `positioning_time`, the frontend automatically derives `Positioning_time = (number of cycles × 300) seconds` and `Idle_time = received_idle_time - positioning_time` (displayed in hours). This updates both Operational Summary cards, O&M `runtime_hours`/`unloaded_hours`, and the runtime state distribution (`POSITIONING` vs `IDLE`). | `src/modules/om/services/weldingService.ts`, `src/modules/weldwise/services/weldingService.ts`, `src/modules/om/components/OperationalSummary.tsx`, `src/modules/om/OmDashboardView.tsx`, `src/modules/weldwise/WeldWiseDashboardView.tsx` |
| **O&M Dashboard Precision (2 Decimals)** | Availability and Utilization in the Operational Summary section (for all compressors, CNC, and Robo Welder) are now formatted to 2 decimal places (e.g., `60.00%`, `85.20%`, `30.64%`) instead of 1 decimal place. | `src/modules/om/components/OperationalSummary.tsx`, `src/modules/om/MigOmDashboardView.tsx`, `src/modules/weldwise/WeldWiseDashboardView.tsx` |
| **Asset Status: Online / Offline Based on Latest Current** | Asset status across the Unified Dashboard (header dropdown, machine cards, asset overview) is evaluated strictly from the latest current received from the API telemetry: if latest current is `0` (or `<= 0`), the asset status is marked as **Offline** (red badge/dot); if latest current is `> 0`, the asset status is marked as **Online** (green badge/dot). | `src/utils/assetStatus.ts`, `src/hooks/useAssetStatuses.ts`, `src/modules/om/services/kpiService.ts`, `src/modules/om/OmDashboardView.tsx`, `src/modules/om/components/MachineHeaderCard.tsx`, `src/modules/overview/AssetOverviewView.tsx`, `src/App.tsx` |
| **Robo Welder Executive KPI (Commit 193881b)** | For Robo Welder (`ROBO#01`), the Executive dashboard KPI card specifically displays **Total Idle Time** instead of generic idle time, and availability/utilization metrics map from `/welding` telemetry rather than default CNC routes. | `src/modules/management/ManagementDashboardView.tsx`, `src/modules/management/components/KpiCardsRow.tsx` |
| **Texmaco Branding & Train Artwork** | Added Texmaco logo badge to login header and sidebar top. Added train line art watermark to sidebar footer with gradient masking. Removed inactive "Reports" navigation entry from sidebar (reports remain in Executive dashboard). | `src/components/LoginScreen.tsx`, `src/components/Sidebar.tsx`, `src/assets/texmaco-logo.png`, `src/assets/sidebar-train-white.png` |
| **Availability vs Utilization Alert** | Added dedicated Management Attention alert for CNC and Robo Welder when availability diverges from utilization. | `src/modules/management/components/ActiveAlertsCard.tsx`, `src/modules/management/ManagementDashboardView.tsx`, `src/modules/management/App.tsx`, `tests/management-alerts.test.mjs` |
| **Compressor 2 Configured ID (`PNB960273`)** | Configured Compressor 2's equipment identifier to `PNB960273` across shared metadata, PDF reports, AI prompts, and automated test suites. | `shared/compressor-equipment.mjs`, `server/report-prompt.mjs`, `src/modules/management/reportPdf.ts`, `tests/report.test.mjs`, `tests/report-ui.test.mjs` |

---

## Layout and Data Flow Logic

1. **Saving Opportunities Range Parsing & Totals**:
   - `SavingOpportunity` interface in `src/modules/finance/types.ts` was extended with optional numeric `minValue` and `maxValue` fields (in Lakhs).
   - In `mapFinancialIntelToDashboardData` (`src/modules/finance/services/api.ts`), raw API response values `estimated_min_value` and `estimated_max_value` are normalized by dividing by `100,000` to yield Lakhs values.
   - `SavingOpportunitiesCard.tsx` implements `parseRange()`, which prioritizes typed numeric `minValue`/`maxValue` and falls back to regex extraction from `estimatedValueRange` if numbers are absent.
   - Both `totalAll` and `totalFiltered` are calculated using `reduce()`. When a priority filter (`High`, `Medium`, `Low`) is applied, the footer displays the filtered sum while the header badge continues to reflect the total opportunity potential.

2. **Equal Height Grid Mechanics**:
   - Container rows in `FinanceDashboardView.tsx` and `src/modules/finance/App.tsx` were changed from `items-start` to `items-stretch h-full`.
   - Grid column wrappers (`lg:col-span-5`, `lg:col-span-4`, `lg:col-span-3`, `lg:col-span-7`, `lg:col-span-5`) use `h-full flex flex-col`.
   - Card outer containers use `flex flex-col h-full min-h-0 justify-between`.
   - In `FinancialTrendCard.tsx`, the chart canvas wrapper uses `flex-1 min-h-0` with minimum height restraints (`min-h-[136px] sm:min-h-[142px]`) to ensure stacked bar charts scale smoothly without vertical distortion.

3. **Input Assumptions Box Stretching**:
   - The extra wrapping `<div>` around the assumption zones in `InputAssumptionsCard.tsx` was unnested.
   - The grid container uses `items-stretch flex-1 min-h-0`.
   - Left and right tinted container boxes use `flex flex-col justify-between flex-1 h-full min-h-0`.
   - Inside each tinted box, the item list uses `flex flex-col justify-around flex-1 h-full`, allowing the 4 assumption rows to evenly space across the full height of the card.

4. **Robo Welder Positioning & Idle Time Derivation**:
   - The `/welding` route no longer reports positioning time (returns `0`).
   - `normalizeWeldingData` is implemented in `src/modules/om/services/weldingService.ts` and `src/modules/weldwise/services/weldingService.ts`.
   - **Positioning Time**: `(total_welding_cycles × 300) seconds`. Hours are calculated as `seconds / 3600`.
   - **Idle Time**: `raw_idle_seconds - positioning_seconds`. Hours are calculated as `seconds / 3600`.
   - The normalization also updates `runtime_distribution` (`POSITIONING` and `IDLE` state seconds and percentages) and cache retrieval.
   - `OperationalSummary.tsx`, `OmDashboardView.tsx`, and `WeldWiseDashboardView.tsx` defensively compute these values so all views display the correct positioning time and adjusted idle time in hours.

5. **Standalone Submodule Directories (Legacy)**:
   - Folders `Texmaco_Finance_Intelligence_Dashboard-main`, `Texmaco_Management_Dashboard-main`, and `Texmaco_Operational_Dashboard-main` in the root are historical extracts dating from mid-September 2026.
   - They are excluded via `.gitignore` (`# Standalone submodules/extracts`) and are **not** compiled by `tsconfig.json` or Vite.
   - All active application logic, routing, and styling reside in `src/modules/finance/`, `src/modules/management/`, and `src/modules/om/`.

---

## Merge Order and Conflict Points

1. **Merge Types & API Mappers First**:
   - Apply changes to `src/modules/finance/types.ts` (`minValue`, `maxValue` properties on `SavingOpportunity`).
   - Merge `src/modules/finance/services/api.ts` so `mapFinancialIntelToDashboardData` populates these values.
   - Merge `src/modules/om/services/weldingService.ts` and `src/modules/weldwise/services/weldingService.ts` (`normalizeWeldingData` logic).
2. **Merge Card Component Enhancements**:
   - `SavingOpportunitiesCard.tsx`: Ensure the header badge, `parseRange`, `reduce` math, and `<tfoot>` row are preserved.
   - `InputAssumptionsCard.tsx`: Ensure the `flex-1 h-full` and `justify-around` structure of the tinted columns is maintained; avoid reverting to `h-auto` or adding extra wrapper `div`s.
   - `FinancialTrendCard.tsx`: Preserve `h-full min-h-0 justify-between` on the outer card and `flex-1` on the chart body.
   - `KeyTakeawayCard.tsx`: Preserve `mt-auto` on the target callout box.
   - `KpiCard.tsx`: Preserve `h-full justify-between`.
   - `OperationalSummary.tsx` & `WeldWiseDashboardView.tsx`: Preserve defensive positioning and idle time hour calculations.
3. **Merge View Containers**:
   - `FinanceDashboardView.tsx`: Verify the row grid classes (`items-stretch h-full`), card wrappers (`h-full flex flex-col`), and the removal of `NextStepsCard` imports and JSX.
   - `src/modules/finance/App.tsx`: Match the same grid and column spans (`lg:col-span-7` and `lg:col-span-5` for Row 3).
   - `OmDashboardView.tsx`: Verify `buildRoboOperationalKpi` passes welding data through `normalizeWeldingData`.

---

## Changed-File Checklist

**Financial Dashboard Components:**
- `src/modules/finance/components/SavingOpportunitiesCard.tsx` (Total Est. badge, dynamic summary footer, range calculation)
- `src/modules/finance/components/InputAssumptionsCard.tsx` (Equalized tinted column heights, `justify-around` item spacing)
- `src/modules/finance/components/CostDistributionCard.tsx` (`h-full min-h-0 justify-between` layout)
- `src/modules/finance/components/FinancialTrendCard.tsx` (`h-full min-h-0 justify-between` layout, flexible chart canvas)
- `src/modules/finance/components/KeyTakeawayCard.tsx` (`h-full min-h-0 justify-between` layout, `mt-auto` callout)
- `src/modules/finance/components/KpiCard.tsx` (`h-full justify-between` uniform height)

**Financial Dashboard Views & Routing:**
- `src/modules/finance/FinanceDashboardView.tsx` (NextSteps removal, 7/5 col split in Row 3, `items-stretch h-full` alignment, screen fit)
- `src/modules/finance/App.tsx` (Standalone view aligned with integrated dashboard structure)

**Robo Welder Telemetry & O&M Views:**
- `src/modules/om/services/weldingService.ts` (`normalizeWeldingData` deriving positioning & adjusted idle time)
- `src/modules/weldwise/services/weldingService.ts` (`normalizeWeldingData` in WeldWise service)
- `src/modules/om/components/OperationalSummary.tsx` (Positioning and idle time display in hours)
- `src/modules/om/OmDashboardView.tsx` (Applied `normalizeWeldingData` in `buildRoboOperationalKpi` for accurate runtime/unloaded hours)
- `src/modules/weldwise/WeldWiseDashboardView.tsx` (Operational summary hours display)

**Services & Types:**
- `src/modules/finance/services/api.ts` (Mapped numeric `minValue` and `maxValue` in Lakhs)
- `src/modules/finance/types.ts` (`SavingOpportunity` schema extension)

---

## Verification

- `npx tsc --noEmit` passed with **0 errors**.
- Dev server (`npm run dev`) verified active with hot reloading.
- Row 2 cards visually verified to align to a common horizontal baseline.
- Row 3 Saving Opportunities and Input Assumptions visually verified to share identical height with zero trailing whitespace under Input Assumptions.
- Header and footer totals in Saving Opportunities dynamically update when switching priority filters (`All`, `High`, `Medium`, `Low`).
- Viewport fit tested for standard 1080p and laptop resolutions without vertical scrollbars.
