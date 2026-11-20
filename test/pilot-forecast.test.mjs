import assert from "node:assert/strict";
import { test } from "node:test";
import { evaluateBaselines } from "../scripts/evaluate-pilot-forecast.mjs";

function sales(values, product_id = "fictional") {
  return values.map(([date, sold_quantity]) => ({ product_id, date, sold_quantity }));
}

test("evaluates next-month predictions from strictly earlier observations", () => {
  const summary = evaluateBaselines(sales([
    ["2026-05", 50], ["2026-01", 10], ["2026-03", 30],
    ["2026-02", 20], ["2026-04-01", 15], ["2026-04-02", 25],
  ]));
  assert.equal(summary.observations, 2);
  assert.equal(summary.eligibleProducts, 1);
  assert.equal(summary.methods[0].mae, 10);
  assert.equal(summary.methods[1].mae, 20);
  assert.equal(summary.methods[0].wape, 20 / 90);
  assert.equal(summary.methods[1].bias, -20);
});

test("omits gaps, isolates SKUs and reports unavailable WAPE for zero demand", () => {
  const summary = evaluateBaselines([
    ...sales([["2025-11", 0], ["2025-12", 0], ["2026-01", 0], ["2026-02", 0]]),
    ...sales([["2026-01", 10], ["2026-02", 12], ["2026-04", 15], ["2026-05", 20]], "gap"),
  ]);
  assert.equal(summary.eligibleProducts, 1);
  assert.equal(summary.totalProducts, 2);
  assert.equal(summary.missingHistory, 7);
  assert.deepEqual(summary.methods.map(({ mae, wape }) => ({ mae, wape })),
    [{ mae: 0, wape: null }, { mae: 0, wape: null }]);
});
