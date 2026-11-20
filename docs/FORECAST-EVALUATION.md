# Forecast evaluation for a store pilot

Run the one-month baselines on the bundled synthetic export from the repository root.

```sh
node scripts/evaluate-pilot-forecast.mjs sample-data/inventory_valid.csv
```

The evaluator rolls forward one month at a time. Each baseline gets the same evaluation months. It uses the last observed month and the mean of the previous three months. A month is eligible when all three preceding months are present for the same product. An explicit zero is an observation. A missing month is skipped. Multiple rows for a product and month are summed. Use only finalized months and reconcile totals with the merchant before comparing candidates.

The result reports eligible products, evaluated product-months, excluded months, mean absolute error, weighted absolute percentage error as a fraction, and average signed error in units. Positive signed error means overprediction. Weighted error is unavailable when evaluated sales sum to zero.

Keep any de-identified store export outside the checkout and run the script locally. Agree on the buying horizon and success threshold before comparing models. For a one-month horizon, evaluate candidate predictions on the same products and months as these baselines, using only information available at each prediction date. Account for stockouts and promotions when interpreting sales as demand. Use manually entered demand for operational reorder calculations until the merchant approves an evaluation on representative data.
