# Milestone 2 — Prototype completion checklist

Status of the interactive UI prototype (section B of the Milestone 2 submission). "Verified" means it was exercised in a browser during development on Nov 18, 2026; "Built" means implemented and type-checked but not separately clicked through.

## Acceptance criteria

| Criterion | Status | Notes |
|---|---|---|
| Runs locally with `npm install` + `npm run dev`, no errors | Verified | `npm run build` (type-check + bundle) passes; no console errors on the main pages |
| Polished, consistent UI | Verified | Shared design tokens (`src/index.css`), shadcn-style components, light and dark themes |
| Every required page exists and navigation works | Verified | Login, Onboarding, Overview, Aisle Analytics, Inventory, Forecasting, Data Management, Cameras & Aisles, Settings; browser back/forward checked |
| Onboarding journey functional, progress persists | Verified | Validation, camera add, CSV import, summary, "Go to Dashboard"; step saved in local storage |
| Aisle analytics charts and visualisations are interactive | Verified | Filters, bar click-to-filter, tooltips, peak matrix, heatmap selection + detail panel |
| Inventory has searchable product data | Verified | Search, filters, sorting, pagination, product panel |
| Forecasting shows simulated predictions | Verified | Generate with loading state; labelled "Simulated Forecast — AI Integration Planned" |
| Order recommendations update with inputs | Verified | Live recalculation, validation of negative values, formula breakdown, 250/60/30/20 → 200 example |
| CSV upload with validation and preview | Verified | Invalid type, missing column, invalid row value, empty file, 10-row preview, confirm import |
| Camera configuration supports meaningful interactions | Verified | Camera table and dialogs; polygon vertex dragging, save/discard |
| At least one complete error-recovery flow | Verified | Invalid CSV → error → upload corrected file → import → updated inventory |
| Keyboard navigation | Verified (main journey) | Skip link, sidebar, menus, dialogs, focus moved to main content on navigation |
| Responsive layouts | Verified | 1440 px desktop, 375 px mobile (no horizontal page scroll); tablet uses the drawer navigation |
| Demo data clearly labelled | Verified | Global "Demo Mode — Simulated Data" indicator plus per-section badges |
| No real AI inference falsely represented | Verified | Placeholder metrics tagged; model names only appear as "planned"/"simulated placeholder" |
| Code organised for FastAPI integration | Built | `services/mockApi.ts` (async, endpoint-annotated) + `services/apiClient.ts` endpoint plan |
| README explains running and demonstrating | Done | `README.md`, `docs/DEMO_SCRIPT.md` |

## Required journeys

- [x] **Journey 1** — Login → Create store → Configure camera → Upload CSV → Complete setup → Dashboard
- [x] **Journey 2** — Dashboard → Aisle Analytics → Select date range → Compare aisles → Heatmap → Select aisle → Detailed metrics
- [x] **Journey 3** — Dashboard → Inventory → Select product → Sales history → Forecasting → Generate simulated forecast → Recommended order
- [x] **Journey 4** — Data Management → Invalid CSV → Validation error → Valid CSV → Preview → Confirm import → Updated inventory

## Still to do by the team (outside the code)

- [ ] Decide on the final venture name and update `src/config/brand.ts`.
- [ ] Publish the code to a repository the teaching team can open (or deploy a build), then test the link from a signed-out browser.
- [ ] Record the 3–5 minute MP4 following `docs/DEMO_SCRIPT.md`; upload an unlisted streaming copy.
- [ ] Fill the "feedback" segment of the video only with feedback actually collected.
- [ ] Do a final click-through on the exact machine/browser used for recording (Chrome or Edge recommended).
- [ ] Check that the screens and terminology match Chapter 6 of the business plan.
