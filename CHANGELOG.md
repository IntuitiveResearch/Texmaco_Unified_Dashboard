# Changelog

This file records changes to the Texmaco Unified Dashboard in plain language. For earlier merge analysis, see [MERGE_HANDOFF.md](MERGE_HANDOFF.md).

## 2026-10-10 — Financial intelligence live update & input assumptions

### Financial dashboard
- Populated input assumptions directly from the `/financial_intel` API payload (`downtime_cost_per_hour`, `maintenance_event_count`, `average_production_value`, `average_spares_labour_cost`, `average_maintenance_cost`, `electricity_tariff`) on load.
- Eliminated flash of older Kharagpur mock data on initial load. The view now renders cached data immediately or displays a clean loading state until live data resolves.
- Added background preloading of financial telemetry on app load so the dashboard is already fresh when viewed.
- Implemented stale-while-revalidate pattern so viewing the dashboard always checks the live API while remaining fast.
- Resetting assumptions now restores to the API-delivered baseline instead of static defaults.

## 2026-10-03 — Asset status derived from latest current

### Machine status
- Evaluated machine status across the dashboard (header dropdown, machine cards, plant overview) strictly from latest current:
  - If latest current is `0` (or `<= 0`), the asset status is marked as **Offline** (red dot/badge).
  - If latest current is `> 0`, the asset status is marked as **Online** (green dot/badge).
- Fixed Robo Welder falling back to `21.87 A` when `current_time_series` is empty; it now accurately reports `0.00 A` and **Offline**.

## 2026-10-02 — Financial layout equalization & Robo Welder O&M metrics

### Financial dashboard layout
- Removed the "Next Steps" card and expanded Saving Opportunities (7 cols) and Input Assumptions (5 cols).
- Added dynamic Total Estimated Value badge in header and summary footer row in Saving Opportunities.
- Equalized card heights across Row 2 and Row 3, eliminating trailing gaps in Input Assumptions.
- Fixed layout to fit clean single-screen desktop/laptop viewports.

### O&M and Robo Welder
- Derived Robo Welder positioning time (`cycles × 300` seconds) and adjusted idle time (`idle - positioning`) in hours since `/welding` reports 0 for positioning.
- Formatted Availability and Utilization to 2 decimal places across all operational summary views.
- Displayed "Total Idle Time" for Robo Welder on Executive dashboard.

### Verification
- 34 automated tests passing (`node --test`).
- Production build passing with 0 errors (`npm run build`).
