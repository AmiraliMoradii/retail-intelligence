# Retail Intelligence — Interactive UI Prototype

**CPSC 598 Software Entrepreneurship · University of Calgary · Milestone 2: Interactive High-Fidelity UI Prototype**

A clickable, high-fidelity frontend prototype for an AI-powered retail analytics and inventory optimization platform aimed at independent grocery stores and small-to-medium supermarket chains. It shows how a store manager would:

1. sign in and set up a store (store details, cameras, inventory CSV),
2. explore **aisle traffic analytics** derived from existing CCTV footage (aisle visits, dwell time, peak hours, heatmaps),
3. review **inventory** and product sales history,
4. generate **demand forecasts** and calculate **recommended order quantities**,
5. manage **data uploads** (CSV validation, video sources) and **camera / aisle-region configuration**.

> **Scope and honesty statement.** This is a Milestone 2 prototype. **All data is simulated.** No camera is connected, no computer-vision model (YOLO26, ByteTrack, BoT-SORT) runs, and no forecasting model (Chronos-2, TimesFM 2.5) is executed. Every screen is labelled *Demo Mode — Simulated Data*, and forecasts are labelled *Simulated Forecast — AI Integration Planned*. The backend and AI pipelines are planned for Milestone 4.

The product name **Retail Intelligence** is a temporary wordmark. To rename it, edit `src/config/brand.ts`.

---

## Quick start

Requirements: **Node.js 20.19+ or 22.12+** (tested with Node 24) and npm.

```bash
npm install
npm run dev
```

Open the URL Vite prints (normally <http://localhost:5173>).

### Demo account

| Email | Password |
|---|---|
| `manager@demo-grocer.example` | `Demo2026!` |

The login page has a **Use demo account** button that fills these in. Sign-in is simulated in the browser; nothing is sent to a server.

### Other scripts

| Command | What it does |
|---|---|
| `npm run dev` | Start the development server with hot reload |
| `npm run build` | Type-check and build a production bundle into `dist/` |
| `npm run preview` | Serve the production build locally |
| `npm run typecheck` | Type-check only |

### Resetting the demo

All prototype state (store setup, imported CSV records, cameras, aisle regions, forecasts, settings) is saved in the browser's local storage so a refresh does not lose the demo. To start over:

- **Account menu (top right) → Reset demo data**, or **Settings → Privacy → Reset all demo data**.
- **Account menu → Restart store setup** re-runs the onboarding wizard.
- For a completely fresh first-run experience, clear the site's local storage in your browser's developer tools.

---

## What's in the prototype

| Page | Route | Highlights |
|---|---|---|
| Login | `/login` | Validation ("Please enter a valid email address.", "Password is required."), incorrect-credentials error, show/hide password, remember me, loading state |
| Store onboarding | `/onboarding` | 4-step wizard: store info → camera setup (add cameras, sample MP4 preview) → inventory CSV import → summary + "Go to Dashboard". Progress is saved, so refreshing resumes the step |
| Store Overview | `/overview` | Six clickable KPI cards, hourly/daily traffic line chart, aisle popularity bars (click to filter), monthly sales trend with simulated next-month point, inventory alerts, refresh and CSV export |
| Aisle Analytics | `/aisles` | Filters (date range, time of day, aisle, camera); aisle traffic comparison; dwell-time chart with definition tooltip; aisle × hour peak matrix; interactive 2D store heatmap with detail panel; sortable/searchable aisle table |
| Inventory | `/inventory` | 24 demo products; KPI cards as filters; search, category/status filters, sorting, pagination, CSV export; product detail panel with history chart and "View Demand Forecast" |
| Demand Forecasting | `/forecasting` | Product / period / model (Chronos-2, TimesFM 2.5, Compare Both) selection; simulated forecast chart with illustrative interval; placeholder model comparison; live order-recommendation calculator; forecast history |
| Data Management | `/data` | CSV drag-and-drop with type/size checks, progress, PapaParse parsing, column check, 10-row preview, row-level errors, import confirmation and history; MP4 upload, preview, camera assignment and simulated processing (Ready → Processing → Completed / Failed) |
| Cameras & Aisles | `/cameras` | Camera table with add / edit / remove / assign video / details; aisle-region editor with draggable polygon points, rename, camera assignment, coverage, add/delete regions, save/discard |
| Settings | `/settings` | Store details and hours, theme (light/dark/system), date format, reduced motion, notifications, default reporting period, aisle codes, refresh preference, video retention, privacy explanation and local-data deletion |

### Terminology and claims the UI is careful about

- **"Aisle visits", not "unique customers."** A visit is counted each time a tracked person enters an aisle region; re-entering creates another visit. Track IDs are temporary and camera-local, and the platform does not match people across cameras.
- **Camera coverage.** Aisles without an assigned camera (e.g. *Household & Cleaning*, *Health & Beauty* in the demo store) are drawn hatched and labelled *No camera coverage — not measured*; they are excluded from totals. Removing a camera removes coverage from the aisles it covered.
- **Forecasts are simulated.** The chart, metrics and recommendations come from a deterministic placeholder method (`src/utils/calculations.ts`). Model-comparison MAE/WAPE values are tagged *Placeholder* — they come from a hold-out test of the placeholder method on demo data, not from Chronos-2 or TimesFM 2.5.
- **Order rule.** `Recommended Order = max(0, Forecast Demand + Safety Stock − Current Stock − Incoming Inventory)`. Example: 250 + 30 − 60 − 20 = **200 units** (use *Load example* in the calculator).

---

## Demo data and consistency

All numbers come from one deterministic data layer, so every screen agrees:

- **Fixed demo date:** Wednesday, Nov 18, 2026 (`DEMO_TODAY` in `src/data/mockStore.ts`). Values are identical on every run.
- **Store:** *Maple Street Grocer*, Calgary, AB — 8 aisle regions, 6 covered by 3 cameras.
- **Today's traffic** equals the baseline in `src/data/mockAisles.ts`: 1,248 aisle visits; Snacks is the most visited (310); peak hour 5–6 PM; visit-weighted average dwell 44 s. Longer ranges (7/30/90 days) are generated from day-of-week factors with seeded noise.
- **Inventory:** 24 products × 12 months of sales and order history (Nov 2025 – Oct 2026), with seasonality. Demo status mix: 12 need replenishment (5 at potential stockout risk), 3 with potential excess stock, 9 healthy.
- **Traffic** is computed by `computeTrafficSummary()` in `src/services/analyticsService.ts`; **inventory status and recommendations** by `toInventoryRow()` in `src/utils/calculations.ts`. The Overview, Aisle Analytics, heatmap, alerts, sidebar badges and exports all call these same functions.

### Sample files

`sample-data/` (also served from `public/samples/` for the in-app *Try a sample file* menu):

| File | Demonstrates |
|---|---|
| `inventory_valid.csv` | Successful import: 36 rows, 3 products (2 new, 1 updated — Whole Wheat Bread moves from *Stockout risk* to *Replenish*) |
| `inventory_invalid_quantity.csv` | "Row 8 contains an invalid sold_quantity value." |
| `inventory_missing_column.csv` | "Missing required column: sold_quantity." |
| `inventory_empty.csv` | "The selected file contains no records." |
| `inventory_notes.txt` | "Unsupported file format. Please upload a CSV file." |

**CSV format.** Required columns: `product_id, product_name, date, ordered_quantity, sold_quantity`. Optional: `category, current_stock, supplier_lead_time, unit_cost`. Dates use `YYYY-MM-DD`; rows are aggregated by month. Row numbers in messages count data rows (the header row is not counted).

**Video uploads.** Any MP4 can be used; files stay in the browser tab (object URLs) and are never uploaded or stored, so previews disappear after a refresh. A file whose name contains `corrupt` simulates a *Failed* processing job.

---

## Suggested user journeys (all fully interactive)

1. **New store onboarding** — Login → *Use demo account* → Sign in → Store information → Camera setup (add a camera, optionally upload an MP4) → Inventory data (*Try a sample file → Valid inventory file* → Confirm import) → *Go to Dashboard*. (Use *Account menu → Restart store setup* to run it again.)
2. **Aisle analytics** — Overview → click *Total Aisle Visits* → change the date range → compare aisles → scroll to the store heatmap → click *Snacks* → read the detail panel.
3. **Inventory forecasting** — Overview → *Products Needing Replenishment* → click *Milk 2%* → review sales history → *View Demand Forecast* → *Generate Forecast* → review the order recommendation and edit the inputs.
4. **Data upload and validation** — Data Management → *Try a sample file → Invalid quantity (row 8)* → see the error → *Start over* → *Valid inventory file* → preview → *Confirm import* → *View updated inventory*.

A timed 3–5 minute recording script is in [`docs/DEMO_SCRIPT.md`](docs/DEMO_SCRIPT.md), and a Milestone 2 checklist is in [`docs/MILESTONE_2_CHECKLIST.md`](docs/MILESTONE_2_CHECKLIST.md).

---

## Accessibility

- Skip link, semantic landmarks, page titles per route, and focus moved to the main region on navigation.
- Everything is keyboard operable: navigation, menus, dialogs and side panels (Radix UI primitives), sortable table headers (`aria-sort`), heatmap zones and matrix cells, the polygon editor (arrow keys nudge a point; Shift = 10 units).
- Visible focus rings; form fields have labels, `aria-invalid`, `aria-describedby` and announced error messages.
- Status is never conveyed by colour alone (icon + text badges, signed percentages with arrows).
- Every line/bar chart has a **Chart ⇄ Table** toggle and a screen-reader summary. The peak-hour matrix is a real data table (arrow-key navigable cells with labels), and the store heatmap has a text description, keyboard-selectable zones and a matching aisle details table.
- Light and dark themes with separately chosen colours; respects `prefers-reduced-motion` and has an in-app *Reduce motion* setting.

## Responsive behaviour

- **Desktop (≥ 1024 px):** full sidebar (collapsible to an icon rail), multi-column dashboards.
- **Tablet (768–1023 px):** navigation moves into a slide-out drawer; cards reflow to two columns.
- **Mobile (375–430 px):** compact header with drawer navigation, stacked cards, horizontally scrollable tables and matrix. Reshaping aisle polygons is practical on tablet/desktop; names, cameras and coverage can still be edited from the region list on phones.

---

## Tech stack

React 19 · TypeScript 5.9 · Vite 7 · Tailwind CSS 4 · React Router 7 · shadcn/ui-style components on Radix UI primitives · Lucide icons · Recharts 3 · React Hook Form + Zod 4 · TanStack Table 8 · Zustand 5 (persisted) · date-fns 4 · PapaParse 5 · Sonner toasts.

## Project structure

```
src/
├── app/                 App, router, route guards, providers (theme, tooltips, toasts)
├── components/
│   ├── ui/              shadcn-style primitives (button, card, dialog, select, sheet, tabs…)
│   ├── layout/          AppLayout, Sidebar, Header, BrandMark
│   ├── shared/          ChartCard (chart/table toggle), KPI/empty/error/loading states, badges, FloorPlanBase
│   ├── onboarding/      Wizard steps
│   ├── dashboard/       KPICard, TrafficChart, AislePopularityChart, SalesTrendChart, InventoryAlerts
│   ├── aisle/           Traffic/dwell charts, PeakHourMatrix, TrafficHeatmap, AisleDetailPanel, AisleDetailsTable
│   ├── inventory/       InventoryTable, ProductDetails, ProductHistoryChart, OrderRecommendation
│   ├── forecasting/     ForecastConfig, ForecastChart, ModelComparison, ForecastHistoryTable
│   ├── uploads/         CSVUploader, VideoUploader
│   ├── cameras/         CameraTable, CameraFormDialog, AisleRegionEditor, VideoLibrary…
│   └── settings/        StoreSettingsForm, DataDeletionControls…
├── pages/               One file per route
├── services/            mockApi (async API stand-ins), analyticsService, csvService, apiClient (Milestone 4 stub)
├── data/                Centralised deterministic mock datasets
├── store/               Zustand stores (app state + simulated auth), persisted to localStorage
├── hooks/               useTrafficSummary, useInventoryRows, useMockQuery…
├── types/               Domain interfaces (Store, Camera, Aisle, AisleVisit, TrafficSummary, Product, …)
├── utils/               calculations (forecast placeholder, order rule, status), formatters, seeded random
└── config/              Brand and navigation
```

## Path to Milestone 4 (backend integration)

```
React frontend ──► FastAPI ──┬─► Video analytics: OpenCV → YOLO26 → ByteTrack / BoT-SORT → Supervision zones → aisle metrics
                             ├─► Inventory analytics: CSV validation → Chronos-2 / TimesFM 2.5 → order optimisation
                             └─► PostgreSQL
```

- Screens never import mock data directly for live values; they call async functions in `src/services/mockApi.ts` (and the pure computations they wrap). Each function is annotated with its planned endpoint, and `src/services/apiClient.ts` lists the full endpoint plan plus a `request()` helper (`VITE_API_BASE_URL`, default `http://localhost:8000`).
- Swapping `getTrafficSummary`, `generateForecast`, `login` and the video-processing functions for HTTP calls is the main integration step; components already handle loading, error and empty states.
- Domain types in `src/types/` mirror the planned database entities: Store, Camera, Aisle, AisleVisit, TrafficSummary, Product, InventoryRecord, SalesRecord, DemandForecast, OrderRecommendation, ProcessingJob.

## Known limitations (by design for Milestone 2)

- No real authentication, persistence beyond this browser, or multi-store support (the store selector shows "Add another store" as planned for after the MVP).
- Video files are previewed locally only; processing progress is a timer, not inference.
- Forecasts, intervals and model metrics are placeholders, not measured results.
- "Weekly summary email" and data-refresh preferences are stored but nothing is sent or scheduled.
