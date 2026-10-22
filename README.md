# Texmaco Unified Dashboard — Quick Notes

Centralized plant analytics platform for **Texmaco Rail & Engineering** (Agarpara Plant), integrating real-time telemetry, executive KPI analytics, and financial cost modeling.

---

## 🔑 Login Credentials
- **User ID**: `Texmaco_Management`
- **Password**: `Texmaco_Management@123`

---

## 🏭 Monitored Assets

| Asset Name | Asset ID | Backend Key / Machine Tag | Key Telemetry / Notes |
| :--- | :--- | :--- | :--- |
| **Compressor 1** | `CMP#01` | `01` / `CMP#01` | RMS Current, single-axis vibration, temperature (°C), MFM384 |
| **Compressor 2** | `CMP#02` | `02` / `CMP#02` | RMS Current, 3-axis vibration (X/Y/Z), temp rate (°C/min), MFM384 |
| **CNC 1** | `CNC#01` | `MACHINE#PI4G/TXMCNCI/26001` | Average Current live trend & cycle metrics |

---

## 📑 Core Modules (Tabs)

### 1. Operations & Maintenance (O&M)
- The shared asset selector uses O&M telemetry for each device's status: green for running, amber for idle/unloaded, red for stopped/offline, and gray before a status is available. Its selected-device dot and dropdown options share the machine-card color mapping. Status reads reuse the operational KPI cache and update when the dashboard refreshes; Robo Welder retains its frontend preview status.
- **Live KPIs**: Availability %, Utilization %, Runtime, Run/Stop Cycles, MTBI, Active Advisories.
- **Telemetry Cards**:
  - **Current**: RMS Current for compressors; Average Current for CNC.
  - **Vibration**: 1-axis RMS for CMP#01; 3-axis (X, Y, Z) for CMP#02; hidden for CNC.
  - **Temperature**: Direct °C for CMP#01; rate (°C/min) for CMP#02; hidden for CNC.
  - **EnergyIQ (MFM384)**: 3-phase Voltage/Current, kW, Power Factor, Freq, kWh.
- **Interactive Graphs**: Canvas charts (ECharts) with zoom, pan, and full-screen expand.
- **Rule**: **No mock data**. While fetching or if empty, shows empty state until real data arrives. Instant graph reset on asset switch.

### 2. Management Dashboard
- **Executive Metrics**: Runtime vs. downtime breakdown, idle losses, availability trends.
- The machine image opens a full-size dialog. CNC and Robo Welder show an Availability vs Utilization Management Attention item using the selected range's values.
- **Robo Welder preview**: Select **Robo Welder** in the Executive Dashboard asset selector for the reference-based welding overview: six KPIs, daily running/idle/downtime, utilization and availability trends, production cycles, time breakdown, worst downtime days, and management attention. This asset view uses labeled frontend sample data and makes no welding API calls. Seven-day, thirty-day, and custom ranges (up to 366 days), chart expansion, legend toggles, equipment image expansion, notifications, and preview refresh are supported; totals are calculated from the same daily dataset used by the charts.
- **14 Analytical Charts**: Availability & utilization curves, heating/cooling, sustained idle, worst downtime days.
- **Intuitive AI Analysis**: 
  - Gemini prescriptive maintenance reports for Compressor 1 and 2: 30 completed days plus the latest current, temperature and vibration snapshot. MFM is excluded.
  - One-click branded **PDF Report Export** (jsPDF).

### 3. Financial Intelligence
- **Cost Analysis**: Total cost, cost per operating hour, downtime loss vs. energy vs. maintenance.
- **Savings Opportunities**: Ranked operational actions with payback periods.
- **Input Assumptions**: Editable parameters (electricity tariff, downtime cost/hr, maintenance costs). Supports inline editing and saves directly to backend.
- **Robo Welder frontend preview**: Select **Financial Dashboard → Robo Welder** for the reference-based cost cards, distribution, category trends, savings priority filters, and editable assumptions. The sample monthly total is ₹22.36 lakhs; calibrated rates and consumption keep the cost calculations consistent. Period filters aggregate the sample months. Applying edits recalculates the view, and **Save** stores those assumptions in this browser only, without welding API calls. Other assets retain their existing financial views.

### 4. Executive Reports
- The Reports sidebar entry is hidden. Compressor advisory reports remain available from the Executive dashboard.

### 5. WeldWise Dashboard (Frontend Preview)
- Select **O&M Dashboard → Robo Welder** to use the WeldWise robotic welding interface. The standalone **WeldWise Dashboard** sidebar entry also opens this view. Both entry points share the Today/Yesterday selection, refresh, and notifications; the O&M asset selector lets you return to the compressor and CNC views.
- Equipment details, a Total Energy gauge, an operational summary, input-current waveform, recent cycles, current features, cycle status, and insights use clearly marked sample data. The top row reuses O&M's Overall, Electrical, Mechanical, and Thermal Health gauges with cached Robo Welder telemetry from the selected O&M range when available, or the same O&M preview data otherwise. There are no welding API calls.
- The Today/Yesterday selector changes the sample shift. Refresh updates the sample waveform and preview timestamp. Charts support zoom, reset, a last-hour view, and expansion; cycle status buttons filter recent cycles, and expanded cycle analysis exports the selected sample rows as CSV.
- The notification bell opens the sample insights. Layouts adapt to smaller screens with scrolling when needed.

---

## 📐 Calculations & Engineering Formulas

### 1. Operations & Maintenance (O&M)
- **Availability (%)**:
  $$\text{Availability} = \frac{\text{Runtime Hours}}{\text{Runtime Hours} + \text{Stopped Hours}} \times 100$$
- **Utilization (%)**:
  $$\text{Utilization} = \frac{\text{Loaded Hours}}{\text{Total Calendar / Monitored Hours}} \times 100$$
- **Load Ratio vs. Unload Ratio (%)**:
  $$\text{Load \%} = \frac{\text{Loaded Hours}}{\text{Runtime Hours}} \times 100 \qquad \text{Unload \%} = \frac{\text{Unloaded Hours}}{\text{Runtime Hours}} \times 100$$
- **MTBI (Mean Time Between Interruptions)**:
  $$\text{MTBI (hrs)} = \frac{\text{Total Runtime Hours}}{\text{Total Trip / Interruption Count}}$$
- **Phase Voltage Imbalance (%)** *(MFM384)*:
  $$V_{\text{imbalance}} = \frac{\max\big(|V_1 - V_{\text{avg}}|, |V_2 - V_{\text{avg}}|, |V_3 - V_{\text{avg}}|\big)}{V_{\text{avg}}} \times 100$$
- **3-Phase Active Power (kW)**:
  $$P = \frac{\sqrt{3} \times V_{\text{avg}} \times I_{\text{avg}} \times \text{PF}}{1000}$$

---

### 2. Executive Management
- **Total Monitored Time**:
  $$\text{Total Time} = \text{Runtime} + \text{Downtime} + \text{Idle Time} + \text{Offline Time}$$
- **Time Distribution Percentages**:
  $$\text{Runtime \%} = \frac{\text{Runtime}}{\text{Total Time}} \times 100 \qquad \text{Downtime \%} = \frac{\text{Downtime}}{\text{Total Time}} \times 100 \qquad \text{Idle \%} = \frac{\text{Idle}}{\text{Runtime}} \times 100$$
- **Current Metrics**:
  - $\text{Peak Current} = \max(I(t))$
  - $\text{P95 Current} = 95^{\text{th}}\text{ percentile of sampled current waveform points}$
- **Thermal Kinetics**:
  $$\text{Thermal Drift} = T_{\text{max}} - T_{\text{min}} \qquad \text{Thermal Rate} = \frac{\Delta T}{\Delta t} \ (^\circ\text{C/min})$$

---

### 3. Financial Cost Exposure
- **Total Financial Exposure**:
  $$\text{Total Exposure} = \text{Downtime Cost} + \text{Energy Waste Cost} + \text{Idle Cost} + \text{Maintenance Cost}$$
- **Downtime Cost Exposure**:
  $$\text{Downtime Cost} = \text{Unplanned Downtime Hours} \times \text{Downtime Cost per Hour } (₹/\text{hr})$$
- **Energy Waste Cost**:
  $$\text{Energy Waste Cost} = \text{Excess Energy } (\text{kWh}) \times \text{Electricity Tariff } (₹/\text{kWh})$$
- **Idle / Unproductive Cost**:
  $$\text{Idle Cost} = \text{Unproductive Running Hours} \times \Big(\text{Idle Power (kW)} \times \text{Tariff} + \text{Idle Operating Loss Rate } (₹/\text{hr})\Big)$$
- **Maintenance Cost Exposure**:
  $$\text{Maintenance Cost} = (\text{Maintenance Events} \times \text{Avg Cost/Event}) + \text{Avg Spares \& Labour Cost}$$
- **Cost per Operating Hour**:
  $$\text{Cost per Operating Hour} = \frac{\text{Total Exposure}}{\text{Asset Operating Hours (e.g. 720 hrs/month)}}$$
- **Lakhs Conversion**:
  $$₹ \text{ Lakhs} = \frac{₹ \text{ INR}}{100,000}$$

---

## 🌐 API Endpoints

Telemetry uses AWS API Gateway endpoints. The report API runs on the application server:

| Endpoint | Method | Query / Payload Params | Description |
| :--- | :--- | :--- | :--- |
| `/operational_kpi` | `GET` | `compressor={id}&start_date={YYYY-MM-DD}&end_date={YYYY-MM-DD}` | KPIs, run states, latest sensor values |
| `/operational_graphdata` | `GET` | `compressor={id}` (Compressor) or `pk=MACHINE%23PI4G/TXMCNCI/26001` (CNC) | Time-series graph data for telemetry charts |
| `/dashboard` | `POST` | `compressor`, `start_date`, `end_date` | Management aggregated analytics & chart data |
| `/financial_intel` | `GET` / `POST` | `asset={id}` / JSON body of assumptions | Financial costs and saving assumptions |
| `/api/analyze-report` | `POST` | `{ "compressor": "CMP#01" }` or `CMP#02` | Structured Gemini maintenance report |

---

## 💻 Tech Stack & Quick Commands

- **Stack**: React 19 + TypeScript + Vite 6 + Tailwind CSS v4
- **Charts**: Apache ECharts (telemetry waveforms) + Recharts (analytical charts)
- **PDF**: jsPDF + jspdf-autotable

### Commands
```bash
npm run dev     # Start local dev server (port 3000)
npm run build   # Type-check and production build
npm run lint    # Type-check without emitting code
npm run test:reports # Report data, contract, and PDF regression tests
```

## Gemini report setup

Set `GEMINI_API_KEY` in `.env.local` for local development, or in server environment variables on Vercel. Optionally set `GEMINI_MODEL` (default: `gemini-2.5-flash`; the account must have access to the configured model). Never use a `VITE_` prefix for the key. Restart the development server after changing credentials. The implementation uses Gemini's REST API; no browser SDK or additional package installation is needed.

`npm run dev` and `npm run preview` register the same handler as the Vercel function in `api/analyze-report.ts`. A static-only deployment of `dist` must supply this backend separately. The handler allows up to 150 seconds; configure the hosting plan accordingly. The existing dashboard login is client-side; apply your deployment's access controls to the report endpoint before public exposure.

The report always fetches 30 **completed calendar days** in `Asia/Kolkata`, independent of the dashboard date filter, then fetches today's latest snapshot. Missing measurements remain null; missing dates, unknown/stale timestamps and unavailable sensor units are passed to Gemini and retained internally. It bypasses the O&M display normalizer, caches and mock fallbacks. Compressor 1 scalar readings and Compressor 2 structured current/temperature/three-axis vibration are supported. No MFM fields are sent to Gemini. A snapshot alone is not treated as a vibration trend.

The supplied compressor diagram is implemented as a small structured knowledge subset, without a Neo4j service or GNN. Conditional records cover load/control transitions, motor current events, cooling, lubrication, mechanical vibration and measurement verification. The oil filter and oil cooler are separate components. Records include possible mechanisms, alternatives, required evidence, verification steps and source references; exact G 160 V2 manual/field validation remains pending. Only relevant records are selected: interruption/current events, descriptive current variation, or complete six-day temperature/axis-RMS comparisons. These comparisons are not alarm thresholds or proof of matched operating conditions. Snapshot-only or unknown-unit vibration selects verification guidance rather than a mechanical fault. Every generated root cause must reference a selected candidate record and its observations; unsupported references are rejected. The PDF does not print internal record IDs or sources.

Implementation map:

- `server/report-data.mjs`: evidence-preserving API adapter and date window.
- `shared/compressor-equipment.mjs`: shared Atlas Copco G 160 V2 display name and equipment profile. Both compressors are assumed, at the user's request, to share the photographed ratings: 160 kW motor, 8.5 bar(e) maximum final pressure, 478 l/s (28.68 m³/min) rated free-air delivery. This assumption is passed to Gemini and retained internally. The configured Compressor IDs are PNB960437 for Compressor 1 and PNB960273 for Compressor 2; both are used in their respective Gemini inputs and PDFs. The photographed 2022 manufacture year is not assigned to either asset. Drive/cooling configuration, rated current, sensor locations and temperature/vibration limits remain unknown; ratings are not live measurements or diagnostic thresholds.
- `server/knowledge/compressor-rules.mjs`: conditional reference records and their component/method sources.
- `server/compressor-knowledge.mjs`: selects records and attaches measured observations without inventing diagnostic limits.
- `server/report-prompt.mjs`: system prompt, JSON schema and prompt version.
- `server/report-service.mjs`: source fetches, Gemini call and output validation.
- `api/analyze-report.ts`: shared local/production HTTP handler.
- `src/modules/management/reportClient.ts`: concurrent-request deduplication and timeout.
- `src/modules/management/reportPdf.ts`: reference-style advisory: assessed findings in What's Happening, supported hypotheses in Root Cause & Evidence with qualitative confidence, trend charts, Business / Maintenance Risk Timeline, and Immediate / Preventive / Monitor actions. Unassessed findings and the Data Scope & Limitations section stay internal. Normal-length reports occupy two pages; longer evidence flows onto continuation pages without truncation.
- `src/modules/management/reportCharts.ts`: measured vector charts for the last seven completed days. Missing values show N/A, and availability averages exclude missing days.

The KPI strip labels historical values as 30-day values. Today's availability/interruptions are used only when the O&M response explicitly confirms today's aggregate date range. A suspected root cause always includes evidence and a verification step; unsupported causes are not reported as confirmed. Timeline horizons are maintenance planning guidance, not failure-time predictions.

The PDF uses the report's frozen data and generation timestamps, not whatever dashboard values are visible when Download is clicked. The client advisory omits unassessed condition rows (including legacy Indeterminate / Insufficient Data labels), unavailable KPI tiles and unestablished cause placeholders. Remaining KPI tiles reflow; measured zeros are retained. Complete assessments, coverage and limitations remain in the internal response. Measured adverse findings and essential verification notes are preserved, and missing trend readings remain gaps rather than zeroes. Model output is validated; malformed or truncated output is never treated as a healthy report. Tests stub Gemini, so they need no key and incur no model charges. The historical `Texmaco_Management_Dashboard-main` folder remains reference code and is not the active report backend.
