# Changelog

This file records changes to the Texmaco Unified Dashboard in plain language. For earlier merge analysis, see [MERGE_HANDOFF.md](MERGE_HANDOFF.md).

## 2026-11-10 — Compressor health scores, Running/Stop statuses & modal refinements

### O&M and Asset Health
- Added explicit health scoring profiles for Compressors (`CMP#01`: 86 overall, 88 electrical, 74 mechanical, 82 thermal, 90 power; `CMP#02`: 68 overall, 77 electrical, 62 mechanical, 74 thermal, 88 power).
- Updated O&M `HealthGauges` to evaluate individual subsystem health gauges (electrical, mechanical, thermal, power) using compressor health scores.
- Refined status labels for Compressor assets (`CMP#01` and `CMP#02`) to display **Running** (instead of Online) and **Stop** (instead of Offline) across header status indicators, machine header cards, and plant overview cards.
- Added badge styling for `.overview-status-stop`.

### Navigation & UI
- Added `.report-modal-theme` light-mode styling for the generative AI report dialog.
- Automatically dismiss the report modal when navigating away from the Management dashboard.
- Extended report API handler and type definitions to accept `assetId` as an alias for `compressor`/`asset`.
- Added `.env.example` to `.gitignore`.

## 2026-10-22 — Generative RCA reports enabled for all four assets

### Intuitive AI reports
- Enabled the Intuitive AI report button for all four assets (`CMP#01`, `CMP#02`, `CNC#01`, and `ROBO#01`) in the Management dashboard header and standalone management view without changing the visual dashboard styling.
- Prepared specialized system prompts for Gemini API tailored to each equipment type:
  - **Atlas Copco G 160 V2 Compressors** (`CMP#01`, `CMP#02`): Cooling, lubrication, motor current, and vibration mechanics.
  - **Metal Oxide Cutter** (`CNC#01`): Cutting throughput, idle plate setup and crane handling, torch consumable wear (nozzle/orifice erosion), and gantry rail motion.
  - **Robotic Arm Welder** (`ROBO#01`): Weld cycle stability, arc-on utilization vs idle part-handling/clamping, wire feeder tension, and torch nozzle spatter cleaning.
- Removed brand name mentions (CLOOS and ESAB) across metadata, system prompts, limitation text, UI modals, and PDF advisory exports for CNC and Robo Welder assets.
- Configured API parameter mapping when calling upstream `/dashboard`:
  - `CNC#01` queries `MACHINE#PI4G/TXMCNCI/26001`.
  - `ROBO#01` queries `MACHINE#PI4G/TXMMIGI/26001`.
- Added support for the distinct CNC and Robo Welder `/dashboard` response structure (cycles, operational utilization, runtime/idle/downtime, time breakdown) without requiring missing compressor sensor streams.
- Updated the 2-page PDF advisory generator:
  - Dynamic titles: "COMPRESSOR HEALTH ADVISORY", "CNC CUTTER HEALTH ADVISORY", and "ROBOTIC WELDER HEALTH ADVISORY".
  - Dynamic top KPI tiles: displays Cycle Count and Utilization % in place of temperature/vibration for CNC and Robo Welder.
  - Page 2 vector trend charts display Daily Availability % and Uptime/Downtime hours for all four assets.
  - Updated Robot Welder asset identifier in the PDF advisory banner and report modal to display "Robot welder" only.
  - Replaced instances of `ROBO01` with `Robo welder` across UI modal titles, PDF document properties/metadata, report downloads, and equipment mapping.
  - Enabled selected date range support: the frontend now provides exact availability and utilization calculated for the selected date or date range to the report, and the report now renders trends, KPI tiles, and captions for the selected date range instead of hardcoding the last 7 days.
- Added automated unit and integration tests covering telemetry ingestion, prompt dispatch, upstream mapping, brand neutrality, selected date range trends, and PDF generation for all four assets (43 tests passing).

## 2026-10-12 — Texmaco branding, management alerts & equipment metadata

### Look and navigation
- Added the official Texmaco brand logo to the login screen and sidebar.
- Added train line art illustration watermark with gradient masking to the sidebar footer.
- Removed the inactive Reports navigation item from the sidebar (compressor advisory reports remain accessible directly in the Executive dashboard).
- Enabled equipment photo zoom modal from the Executive machine card with accessible controls.

### Management dashboard
- Added the **Availability vs Utilization** management alert for CNC and Robo Welder in both integrated and standalone views.
- Synchronized Executive and O&M machine cards with the unified status map by passing `operatingStatus` from `assetStatuses` instead of hardcoded 'Running', ensuring that an offline asset displays as Offline everywhere.

### Equipment and reports
- Configured Compressor 2's equipment identifier to `PNB960273` in shared metadata, report PDFs, AI advisory prompts, documentation, and automated tests.

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
