import type { ForecastHistoryEntry, Product } from "@/types";
import { calculateRecommendedOrder, forecastTotal, simulateForecast } from "@/utils/calculations";

/** A few previously generated (simulated) forecasts so the history table is not empty on first run. */
export function buildSeedForecastHistory(products: Product[]): ForecastHistoryEntry[] {
  const seeds: { productId: string; periodMonths: 1 | 3 | 6; model: ForecastHistoryEntry["model"]; generatedAt: string }[] = [
    { productId: "P-1011", periodMonths: 3, model: "compare", generatedAt: "2026-11-17T16:20:00" },
    { productId: "P-1003", periodMonths: 1, model: "timesfm-2.5", generatedAt: "2026-11-14T09:05:00" },
    { productId: "P-1019", periodMonths: 1, model: "chronos-2", generatedAt: "2026-11-10T13:42:00" },
  ];
  return seeds.flatMap((s) => {
    const p = products.find((x) => x.id === s.productId);
    if (!p) return [];
    const points = simulateForecast(p.id, p.history, s.periodMonths, s.model === "timesfm-2.5" ? "timesfm-2.5" : "chronos-2");
    const predictedDemand = forecastTotal(points);
    return [
      {
        id: `fh-${s.productId}-${s.generatedAt}`,
        productId: p.id,
        productName: p.name,
        periodMonths: s.periodMonths,
        model: s.model,
        generatedAt: s.generatedAt,
        predictedDemand,
        recommendedOrder: calculateRecommendedOrder({
          forecastDemand: predictedDemand,
          safetyStock: p.safetyStock,
          currentStock: p.currentStock,
          incomingStock: p.incomingStock,
        }),
      },
    ];
  });
}
