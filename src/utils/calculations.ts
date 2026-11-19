import { addMonths, format, parseISO } from "date-fns";
import type {
  ForecastModel,
  ForecastPoint,
  InventoryRow,
  InventoryStatus,
  OrderRecommendation,
  Product,
  SalesRecord,
} from "@/types";
import { noise } from "./random";
import { formatMonth } from "./formatters";

const avg = (xs: number[]) => (xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : 0);

/**
 * Replenishment rule from the product report:
 * Recommended Order = max(0, Forecast Demand + Safety Stock − Current Stock − Incoming Inventory)
 */
export function calculateRecommendedOrder(input: {
  forecastDemand: number;
  safetyStock: number;
  currentStock: number;
  incomingStock: number;
}): number {
  const { forecastDemand, safetyStock, currentStock, incomingStock } = input;
  return Math.max(0, Math.round(forecastDemand + safetyStock - currentStock - incomingStock));
}

export function buildOrderRecommendation(product: Product, forecastDemand: number): OrderRecommendation {
  return {
    productId: product.id,
    forecastDemand,
    safetyStock: product.safetyStock,
    currentStock: product.currentStock,
    incomingStock: product.incomingStock,
    recommendedOrder: calculateRecommendedOrder({
      forecastDemand,
      safetyStock: product.safetyStock,
      currentStock: product.currentStock,
      incomingStock: product.incomingStock,
    }),
  };
}

/** Stock-out risk = an order is needed AND on-hand stock covers less than ~35% of next month's demand. */
export const STOCKOUT_COVER_RATIO = 0.35;
/** Excess = on-hand + incoming exceeds 160% of (forecast + safety stock). */
export const OVERSTOCK_RATIO = 1.6;

export function classifyInventory(p: {
  forecastDemand: number;
  safetyStock: number;
  currentStock: number;
  incomingStock: number;
}): InventoryStatus {
  const rec = calculateRecommendedOrder(p);
  if (rec > 0) {
    return p.currentStock < p.forecastDemand * STOCKOUT_COVER_RATIO ? "stockout_risk" : "replenish";
  }
  if (p.currentStock + p.incomingStock > OVERSTOCK_RATIO * (p.forecastDemand + p.safetyStock)) return "overstock";
  return "healthy";
}

export const STATUS_META: Record<InventoryStatus, { label: string; short: string; description: string }> = {
  healthy: { label: "Healthy", short: "Healthy", description: "Stock covers forecast demand plus safety stock." },
  replenish: { label: "Needs replenishment", short: "Replenish", description: "Forecast demand plus safety stock exceeds available stock." },
  stockout_risk: {
    label: "Potential stockout",
    short: "Stockout risk",
    description: "On-hand stock covers less than 35% of next month's forecast demand.",
  },
  overstock: {
    label: "Potential excess",
    short: "Excess",
    description: "Available stock exceeds 160% of forecast demand plus safety stock.",
  },
};

/**
 * SIMULATED forecast — a deterministic seasonal-index + trend method that stands in for
 * Chronos-2 / TimesFM 2.5 until Milestone 4. The `model` argument only applies a small,
 * deterministic perturbation so the two placeholders are distinguishable; no model is executed.
 */
export function simulateForecast(
  productId: string,
  history: SalesRecord[],
  periods: number,
  model: ForecastModel,
): ForecastPoint[] {
  const sales = history.map((h) => h.soldQuantity);
  const n = sales.length;
  if (n === 0) return [];

  // 1) Trend from a least-squares line, clamped to ±1%/month so seasonality is not mistaken for growth.
  const xm = (n - 1) / 2;
  const ym = avg(sales) || 1;
  const sxx = sales.reduce((acc, _y, j) => acc + (j - xm) ** 2, 0) || 1;
  const slope = sales.reduce((acc, y, j) => acc + (j - xm) * (y - ym), 0) / sxx;
  const trend = Math.max(-0.01, Math.min(0.01, slope / ym));

  // 2) Bring every month to today's level, then derive a lightly damped seasonal index (needs 12 months).
  const adj = sales.map((y, j) => y * (1 + trend) ** (n - 1 - j));
  const adjMean = avg(adj) || 1;
  const idx = (j: number) => (n >= 12 && j >= 0 && j < n ? 1 + 0.9 * (adj[j] / adjMean - 1) : 1);

  // 3) Current deseasonalised level from the last three months.
  const recent = [n - 3, n - 2, n - 1].filter((j) => j >= 0);
  const level = avg(recent.map((j) => adj[j] / idx(j)));

  const last = parseISO(`${history[n - 1].month}-01`);
  const points: ForecastPoint[] = [];
  for (let k = 1; k <= periods; k++) {
    const seasonal = idx(n - 12 + (k - 1));
    const base = level * seasonal * (1 + trend) ** k;
    const adj =
      model === "chronos-2"
        ? 1 + 0.012 * noise(`${productId}:chronos:${k}`)
        : 0.99 + 0.03 * noise(`${productId}:timesfm:${k}`);
    const forecast = Math.max(0, Math.round(base * adj));
    const width = (model === "chronos-2" ? 0.07 : 0.085) + 0.025 * (k - 1);
    const month = format(addMonths(last, k), "yyyy-MM");
    points.push({
      month,
      label: formatMonth(month),
      forecast,
      lower: Math.max(0, Math.round(forecast * (1 - width))),
      upper: Math.round(forecast * (1 + width)),
    });
  }
  return points;
}

export function forecastTotal(points: ForecastPoint[]) {
  return points.reduce((a, p) => a + p.forecast, 0);
}

/** Derive the computed inventory row (forecast, recommendation, status) for a product. */
export function toInventoryRow(product: Product): InventoryRow {
  const next = simulateForecast(product.id, product.history, 1, "chronos-2")[0];
  const forecastDemand = next?.forecast ?? 0;
  const lastMonthSales = product.history.at(-1)?.soldQuantity ?? 0;
  const base = {
    forecastDemand,
    safetyStock: product.safetyStock,
    currentStock: product.currentStock,
    incomingStock: product.incomingStock,
  };
  return {
    ...product,
    lastMonthSales,
    forecastDemand,
    recommendedOrder: calculateRecommendedOrder(base),
    status: classifyInventory(base),
    daysOfCover: forecastDemand > 0 ? Math.round((product.currentStock / forecastDemand) * 30) : 0,
  };
}

/**
 * Placeholder error metrics: a 3-month hold-out of the SIMULATED method on demo data.
 * These are NOT measured Chronos-2 / TimesFM 2.5 benchmarks.
 */
export function placeholderBacktest(productId: string, history: SalesRecord[], model: ForecastModel) {
  if (history.length < 9) return null;
  const train = history.slice(0, -3);
  const test = history.slice(-3);
  const pred = simulateForecast(productId, train, 3, model);
  const errors = test.map((t, i) => Math.abs(t.soldQuantity - (pred[i]?.forecast ?? 0)));
  const mae = avg(errors);
  const wape = (errors.reduce((a, b) => a + b, 0) / (test.reduce((a, t) => a + t.soldQuantity, 0) || 1)) * 100;
  return { mae, wape };
}
