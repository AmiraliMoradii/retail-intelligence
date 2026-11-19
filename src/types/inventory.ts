export type ProductCategory =
  | "Dairy"
  | "Bakery"
  | "Produce"
  | "Pantry"
  | "Beverages"
  | "Frozen"
  | "Snacks"
  | "Uncategorized";

export interface SalesRecord {
  /** "yyyy-MM" */
  month: string;
  soldQuantity: number;
  orderedQuantity: number;
}

export interface Product {
  id: string;
  name: string;
  category: ProductCategory;
  unit: string;
  unitCost: number;
  supplierLeadTimeDays: number;
  currentStock: number;
  safetyStock: number;
  incomingStock: number;
  lastOrderedQuantity: number;
  /** Monthly history, oldest → newest. */
  history: SalesRecord[];
  /** Set when the product was created/updated by a CSV import. */
  importedAt?: string;
}

/** Raw row shape accepted by the CSV importer. */
export interface InventoryRecord {
  product_id: string;
  product_name: string;
  date: string;
  ordered_quantity: number;
  sold_quantity: number;
  category?: string;
  current_stock?: number;
  supplier_lead_time?: number;
  unit_cost?: number;
}

export type InventoryStatus = "healthy" | "replenish" | "stockout_risk" | "overstock";

export type ForecastModel = "chronos-2" | "timesfm-2.5";
export type ForecastModelOption = ForecastModel | "compare";
export type ForecastPeriod = 1 | 3 | 6;

export interface ForecastPoint {
  month: string;
  label: string;
  forecast: number;
  lower: number;
  upper: number;
}

export interface DemandForecast {
  id: string;
  productId: string;
  model: ForecastModel;
  periodMonths: ForecastPeriod;
  generatedAt: string;
  points: ForecastPoint[];
  totalDemand: number;
  /** Always true in Milestone 2 — no model inference is executed. */
  simulated: true;
}

export interface OrderRecommendation {
  productId: string;
  forecastDemand: number;
  safetyStock: number;
  currentStock: number;
  incomingStock: number;
  recommendedOrder: number;
}

export interface InventoryRow extends Product {
  lastMonthSales: number;
  forecastDemand: number;
  recommendedOrder: number;
  status: InventoryStatus;
  daysOfCover: number;
}

export interface ForecastHistoryEntry {
  id: string;
  productId: string;
  productName: string;
  periodMonths: ForecastPeriod;
  model: ForecastModelOption;
  generatedAt: string;
  predictedDemand: number;
  recommendedOrder: number;
}

export interface ImportBatch {
  id: string;
  fileName: string;
  importedAt: string;
  rowCount: number;
  productIds: string[];
  newProductIds: string[];
}
