# Synthetic store scenarios

These fictitious stores have two products each and four months of sales, from July to October 2026. They deliberately share product ID `SHARED-01` for Whole Wheat Bread. Import each file into its own store to see how the same SKU can have different sales and stock across stores.

| Store | Main scenario | October bread sales | Bread on hand | Expected reorder |
| --- | --- | ---: | ---: | ---: |
| [Cedar Grocery](cedar-grocery.csv) | High demand and low stock | 160 | 9 | 40 |
| [Harbour Market](harbour-market.csv) | Stock exceeds planned demand | 19 | 90 | 0 |
| [Maple Produce](maple-produce.csv) | Apples include a recorded zero-sales month and unknown on-hand stock | 69 | 22 | 27 |

The example uses expected demand of 50 units, safety stock of 4, and incoming stock of 5 for all three bread calculations. The store app will require a stock count before calculating a reorder for apples.

After importing Cedar Grocery, import the [September correction](cedar-grocery-correction.csv). September bread sales should change from 148 to 145 units. October bread stock should stay at 9 because the correction's stock date is older. The [conflicting counts file](cedar-grocery-conflict.csv) should be rejected and leave the saved inventory unchanged.

## Try the simulated camera workflow

Run the self-hosted build and open its local sample-data demo. In **Data Management** → **Video Data**, use this [two-second synthetic shelf MP4](../../e2e/fixtures/synthetic-shelf.mp4). It consists of drawn shelves and colored product blocks. Three blocks disappear halfway through. It contains no real footage and is kept with the test fixtures.

The browser test checks that Chrome decodes the MP4, the app assigns it to a sample camera, and the simulated job finishes. A copy of the same file under a name containing `corrupt` exercises the simulated failure. The test also unassigns the Snacks region and verifies its heatmap shows no coverage, and checks that the original clip is unavailable after navigation reloads the app. Video bytes stay in the browser for that page session. Shelf counts and the missing blocks in the clip are not detected by the app. Its heatmap uses bundled synthetic aisle data.
