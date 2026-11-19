# Milestone 2 — Screen-recording script (≈ 4:30)

Target: 1080p, 3–5 minutes, clear voice-over. Record in a desktop browser window at about 1440 × 900.

## Before you record

1. `npm install` then `npm run dev`, and open the app.
2. Start from a clean first-run state: open the browser's developer tools → *Application* → *Local storage* → clear the site's entries, then reload. (Alternatively sign in and use *Account menu → Reset demo data*, then *Restart store setup*.)
3. Have `sample-data/inventory_invalid_quantity.csv` and `sample-data/inventory_valid.csv` handy if you prefer the OS file picker; otherwise use the in-app **Try a sample file** menu.
4. Optional: a short MP4 clip (any store/hallway footage you are allowed to use) to show the video preview.
5. Close other tabs and notifications; zoom the browser to 100–110 %.

Say "simulated" out loud whenever numbers or AI output appear; the UI labels them too.

---

## 0:00 – 0:45 · Persona, problem, goal

*Screen: login page.*

> "Meet Alex, the manager of an independent grocery store in Calgary. Alex orders stock from spreadsheets and past sales reports, and knows the store's busy periods mostly from experience. The security cameras record all day, but nobody turns that footage into answers like *which aisles do people actually visit* or *when are we busiest*.
>
> Our platform turns the cameras and sales records a store already has into one dashboard: aisle traffic analytics from existing CCTV, and demand forecasts with recommended order quantities. This is our Milestone 2 interactive prototype — everything you'll see runs on clearly labelled simulated data; the computer-vision and forecasting models are integrated in Milestone 4."

Actions: click **Use demo account** → **Sign in**.

## 0:45 – 1:15 · Onboarding

1. **Store information** — point out required fields; click **Save and continue**.
2. **Camera setup** — "Cameras are simulated; we never claim to connect to hardware." Click **Add camera**, name it *Produce Section*, choose an area, **Add**. (Optional: **Upload sample video** → **Preview**.) **Continue**.
3. **Inventory data** — **Try a sample file → Valid inventory file**; show the column check and 10-row preview; **Confirm import**; **Continue**.
4. **Complete setup** — read the summary; click **Go to Dashboard**.

## 1:15 – 2:15 · Aisle analytics

1. On **Store Overview**, point at the **Demo Data** badge and the KPIs: 1,248 aisle visits, Snacks most visited, 44-second average dwell, peak 5–6 PM.
2. Click the **Total Aisle Visits** card → **Aisle Analytics**.
3. Read the note: "These are *aisle visits*, not unique customers — track IDs are temporary and camera-local."
4. Change **Date range** to *Last 7 days*, then **Time range** to *Evening*; show the comparison bars update.
5. Hover the **Dwell-Time Analysis** info icon to show the definition.
6. Scroll to **Peak-Hour Analytics**: "Darker cells are busier; the outlined cell is each aisle's peak."
7. Scroll to the **Store Traffic Heatmap**; click **Snacks** → detail panel (visits, dwell, peak hour, rank). Point out the hatched *Household & Cleaning* region: "No camera covers it, so we don't estimate anything there."

## 2:15 – 3:15 · Inventory intelligence

1. Sidebar → **Inventory**. Click **Products Needing Replenishment** to filter.
2. Click **Milk 2%** → product panel: current stock, forecast demand, days of cover, recommended replenishment, monthly sales vs. orders chart.
3. Click **View Demand Forecast** → the product is preloaded. Choose **Compare Both**, click **Generate Forecast**.
4. "This forecast is *simulated* — Chronos-2 and TimesFM 2.5 are the candidate models we will evaluate on real sales history; these placeholder metrics are not benchmarks."
5. In **Order Recommendation**, change *Safety stock* and show the result and the breakdown update instantly; click **Load example** (250 + 30 − 60 − 20 = 200).
6. Scroll to **Forecast History** to show the run was recorded.

## 3:15 – 4:00 · Validation, edge cases and accessibility

1. Sidebar → **Data Management**. **Try a sample file → Invalid quantity (row 8)**: "Row 8 contains an invalid sold_quantity value." The bad row is highlighted in the preview.
2. **Start over** → **Valid inventory file** → **Confirm import** → **View updated inventory** (the *Recently imported* filter shows the imported products with an *Imported* badge).
3. Keyboard: press **Tab** from the top of a page to show the *Skip to main content* link and visible focus rings; open a table with the **Chart ⇄ Table** toggle.
4. Optional: open **Settings → Dark** theme, or narrow the window to show the mobile layout and drawer navigation.

## 4:00 – 4:30 · Feedback and next steps

> "*[Only describe feedback you actually collected — e.g. who you spoke to, what they said, and what you changed. If none has been collected yet, say so.]*
>
> Next, for Milestone 4, we will connect this interface to a FastAPI backend with PostgreSQL: recorded video will run through OpenCV, YOLO26 person detection and ByteTrack tracking with aisle zones defined in this editor, and imported sales history will be forecast with Chronos-2 and TimesFM 2.5, compared against a simple baseline using MAE and WAPE. The service layer in the prototype was built so those real endpoints can replace the simulated ones without redesigning the screens."

---

### Recording tips

- Keep the cursor still while speaking about a chart; hover only to show tooltips.
- If a step is slow on camera, cut it in editing rather than rushing the narration.
- Verify the final video is between 3 and 5 minutes and exported as MP4.
