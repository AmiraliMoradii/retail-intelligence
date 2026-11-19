import { useMemo } from "react";
import { useAppStore } from "@/store/useAppStore";
import { toInventoryRow } from "@/utils/calculations";
import type { InventoryRow } from "@/types";

/** Inventory rows with derived forecast, recommendation and status — memoised on the product list. */
export function useInventoryRows(): InventoryRow[] {
  const products = useAppStore((s) => s.products);
  return useMemo(() => products.map(toInventoryRow), [products]);
}

export function useInventorySummary() {
  const rows = useInventoryRows();
  return useMemo(() => {
    const needs = rows.filter((r) => r.recommendedOrder > 0);
    const lastMonth = rows.reduce((a, r) => a + r.lastMonthSales, 0);
    const forecast = rows.reduce((a, r) => a + r.forecastDemand, 0);
    return {
      rows,
      total: rows.length,
      needsReplenishment: needs.length,
      stockoutRisk: rows.filter((r) => r.status === "stockout_risk").length,
      overstock: rows.filter((r) => r.status === "overstock").length,
      lastMonthSales: lastMonth,
      forecastNextMonth: forecast,
      demandChangePct: lastMonth > 0 ? ((forecast - lastMonth) / lastMonth) * 100 : 0,
    };
  }, [rows]);
}
