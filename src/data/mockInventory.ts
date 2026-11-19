import { addMonths, format } from "date-fns";
import type { Product, ProductCategory, SalesRecord } from "@/types";
import { noise } from "@/utils/random";
import { simulateForecast } from "@/utils/calculations";

/** 12 complete months of history: Nov 2025 → Oct 2026 (demo "today" is Nov 18, 2026). */
export const HISTORY_START = new Date(2025, 10, 1);
export const HISTORY_MONTHS = 12;
export const HISTORY_MONTH_KEYS = Array.from({ length: HISTORY_MONTHS }, (_, i) =>
  format(addMonths(HISTORY_START, i), "yyyy-MM"),
);

export const PRODUCT_CATEGORIES: ProductCategory[] = ["Dairy", "Bakery", "Produce", "Pantry", "Beverages", "Frozen", "Snacks"];

/** Monthly seasonality profiles, Jan..Dec. */
const SEASON: Record<string, number[]> = {
  flat: [1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1],
  holidayLite: [0.97, 0.96, 0.98, 1, 1, 0.99, 0.98, 0.99, 1, 1.01, 1.04, 1.1],
  holiday: [0.92, 0.9, 0.95, 1.0, 0.98, 0.96, 0.95, 0.97, 1.0, 1.03, 1.1, 1.28],
  holidayStrong: [0.85, 0.85, 0.9, 1.05, 0.92, 0.9, 0.88, 0.9, 0.98, 1.08, 1.25, 1.45],
  autumn: [0.95, 0.9, 0.88, 0.85, 0.85, 0.85, 0.9, 1.0, 1.2, 1.25, 1.12, 1.05],
  winterLite: [1.08, 1.06, 1.03, 0.98, 0.95, 0.92, 0.92, 0.94, 0.98, 1.02, 1.05, 1.07],
  winter: [1.15, 1.12, 1.05, 0.95, 0.88, 0.82, 0.8, 0.82, 0.95, 1.05, 1.12, 1.18],
  winterStrong: [1.35, 1.3, 1.1, 0.9, 0.75, 0.65, 0.6, 0.65, 0.9, 1.15, 1.3, 1.4],
  summerLite: [0.92, 0.92, 0.95, 0.98, 1.03, 1.08, 1.12, 1.1, 1.0, 0.97, 0.94, 0.96],
  summer: [0.78, 0.8, 0.88, 0.95, 1.08, 1.22, 1.32, 1.28, 1.05, 0.92, 0.82, 0.85],
  summerStrong: [0.6, 0.62, 0.75, 0.9, 1.15, 1.45, 1.65, 1.55, 1.1, 0.8, 0.65, 0.7],
  school: [1.02, 1.0, 0.98, 0.97, 0.95, 0.88, 0.85, 0.95, 1.18, 1.08, 1.02, 1.0],
};

interface ProductSeed {
  id: string;
  name: string;
  category: ProductCategory;
  unit: string;
  unitCost: number;
  leadTime: number;
  base: number;
  season: keyof typeof SEASON;
  trend: number;
  /** current stock as a share of next-month forecast — drives the demo status mix */
  stock: number;
  incoming: number;
  safety: number;
  pack: number;
}

const SEEDS: ProductSeed[] = [
  { id: "P-1001", name: "Milk 2%", category: "Dairy", unit: "4 L jug", unitCost: 4.1, leadTime: 2, base: 520, season: "holidayLite", trend: 0.002, stock: 0.22, incoming: 0.04, safety: 0.12, pack: 12 },
  { id: "P-1002", name: "White Sandwich Bread", category: "Bakery", unit: "675 g loaf", unitCost: 1.85, leadTime: 1, base: 410, season: "flat", trend: 0.004, stock: 0.6, incoming: 0.1, safety: 0.1, pack: 12 },
  { id: "P-1003", name: "Large Eggs", category: "Dairy", unit: "12 ct carton", unitCost: 2.95, leadTime: 3, base: 380, season: "holiday", trend: 0.003, stock: 0.28, incoming: 0, safety: 0.12, pack: 15 },
  { id: "P-1004", name: "Gala Apples", category: "Produce", unit: "3 lb bag", unitCost: 3.2, leadTime: 2, base: 260, season: "autumn", trend: 0.002, stock: 0.7, incoming: 0.05, safety: 0.1, pack: 10 },
  { id: "P-1005", name: "Long Grain White Rice", category: "Pantry", unit: "2 kg bag", unitCost: 3.6, leadTime: 7, base: 140, season: "flat", trend: 0.003, stock: 1.35, incoming: 0, safety: 0.15, pack: 10 },
  { id: "P-1006", name: "Spaghetti Pasta", category: "Pantry", unit: "900 g box", unitCost: 1.55, leadTime: 7, base: 190, season: "winter", trend: 0.002, stock: 2.4, incoming: 0.2, safety: 0.15, pack: 20 },
  { id: "P-1007", name: "Aged Cheddar Cheese", category: "Dairy", unit: "400 g block", unitCost: 4.8, leadTime: 4, base: 170, season: "holiday", trend: 0.003, stock: 0.75, incoming: 0, safety: 0.12, pack: 12 },
  { id: "P-1008", name: "Plain Greek Yogurt", category: "Dairy", unit: "750 g tub", unitCost: 3.4, leadTime: 3, base: 150, season: "summerLite", trend: 0.006, stock: 1.4, incoming: 0, safety: 0.12, pack: 12 },
  { id: "P-1009", name: "Honey Oat Cereal", category: "Pantry", unit: "500 g box", unitCost: 2.7, leadTime: 7, base: 130, season: "school", trend: 0.002, stock: 1.3, incoming: 0.1, safety: 0.15, pack: 12 },
  { id: "P-1010", name: "Orange Juice", category: "Beverages", unit: "1.75 L carton", unitCost: 3.05, leadTime: 3, base: 210, season: "winterLite", trend: 0, stock: 0.18, incoming: 0, safety: 0.12, pack: 8 },
  { id: "P-1011", name: "Bananas", category: "Produce", unit: "bunch", unitCost: 1.1, leadTime: 2, base: 480, season: "flat", trend: 0.003, stock: 0.55, incoming: 0.1, safety: 0.1, pack: 40 },
  { id: "P-1012", name: "Baby Spinach", category: "Produce", unit: "312 g clamshell", unitCost: 2.6, leadTime: 2, base: 160, season: "summerLite", trend: 0.005, stock: 1.25, incoming: 0, safety: 0.1, pack: 6 },
  { id: "P-1013", name: "Whole Wheat Bread", category: "Bakery", unit: "600 g loaf", unitCost: 2.1, leadTime: 1, base: 230, season: "flat", trend: 0.006, stock: 0.25, incoming: 0, safety: 0.1, pack: 12 },
  { id: "P-1014", name: "Salted Butter", category: "Dairy", unit: "454 g", unitCost: 3.9, leadTime: 4, base: 120, season: "holidayStrong", trend: 0.002, stock: 0.65, incoming: 0, safety: 0.12, pack: 12 },
  { id: "P-1015", name: "Sparkling Water", category: "Beverages", unit: "12 × 355 mL", unitCost: 4.4, leadTime: 5, base: 160, season: "summer", trend: 0.008, stock: 1.45, incoming: 0.1, safety: 0.12, pack: 6 },
  { id: "P-1016", name: "Ground Coffee, Medium Roast", category: "Beverages", unit: "925 g can", unitCost: 9.8, leadTime: 7, base: 90, season: "winter", trend: 0.002, stock: 2.6, incoming: 0, safety: 0.15, pack: 6 },
  { id: "P-1017", name: "Frozen Mixed Vegetables", category: "Frozen", unit: "750 g bag", unitCost: 2.2, leadTime: 5, base: 140, season: "winter", trend: 0.002, stock: 1.3, incoming: 0, safety: 0.15, pack: 12 },
  { id: "P-1018", name: "Pepperoni Frozen Pizza", category: "Frozen", unit: "780 g", unitCost: 4.6, leadTime: 5, base: 150, season: "school", trend: 0.004, stock: 0.8, incoming: 0, safety: 0.15, pack: 8 },
  { id: "P-1019", name: "Vanilla Ice Cream", category: "Frozen", unit: "1.5 L tub", unitCost: 3.7, leadTime: 5, base: 110, season: "summerStrong", trend: 0, stock: 2.8, incoming: 0, safety: 0.15, pack: 8 },
  { id: "P-1020", name: "Sea Salt Potato Chips", category: "Snacks", unit: "235 g bag", unitCost: 2.3, leadTime: 5, base: 280, season: "summerLite", trend: 0.005, stock: 0.3, incoming: 0.05, safety: 0.15, pack: 15 },
  { id: "P-1021", name: "Tortilla Chips", category: "Snacks", unit: "300 g bag", unitCost: 2.5, leadTime: 5, base: 170, season: "flat", trend: 0.003, stock: 1.35, incoming: 0, safety: 0.15, pack: 12 },
  { id: "P-1022", name: "Chewy Granola Bars", category: "Snacks", unit: "6-pack box", unitCost: 2.9, leadTime: 7, base: 150, season: "school", trend: 0.004, stock: 0.72, incoming: 0.08, safety: 0.15, pack: 12 },
  { id: "P-1023", name: "Tomatoes on the Vine", category: "Produce", unit: "680 g pack", unitCost: 2.8, leadTime: 2, base: 200, season: "summer", trend: 0.003, stock: 1.3, incoming: 0, safety: 0.1, pack: 10 },
  { id: "P-1024", name: "Tomato Soup", category: "Pantry", unit: "540 mL can", unitCost: 1.2, leadTime: 7, base: 160, season: "winterStrong", trend: 0.002, stock: 1.45, incoming: 0, safety: 0.15, pack: 24 },
];

/** Store-wide pre-holiday lift applied on top of each product profile (Jan..Dec). */
const STORE_LIFT = [0.96, 0.97, 1, 1, 1, 1, 1, 1, 0.98, 0.96, 1.07, 1.15];

const roundTo = (n: number, step: number) => Math.max(step, Math.round(n / step) * step);

function buildHistory(seed: ProductSeed): SalesRecord[] {
  return HISTORY_MONTH_KEYS.map((month, i) => {
    const monthIndex = (HISTORY_START.getMonth() + i) % 12;
    const sold = Math.max(
      0,
      Math.round(
        seed.base * SEASON[seed.season][monthIndex] * STORE_LIFT[monthIndex] * (1 + seed.trend) ** i * (1 + 0.06 * noise(`${seed.id}:sold:${month}`)),
      ),
    );
    const ordered = roundTo(sold * (1.03 + 0.07 * noise(`${seed.id}:ord:${month}`)), seed.pack);
    return { month, soldQuantity: sold, orderedQuantity: ordered };
  });
}

export function buildMockProducts(): Product[] {
  return SEEDS.map((seed) => {
    const history = buildHistory(seed);
    const nextMonth = simulateForecast(seed.id, history, 1, "chronos-2")[0]?.forecast ?? seed.base;
    return {
      id: seed.id,
      name: seed.name,
      category: seed.category,
      unit: seed.unit,
      unitCost: seed.unitCost,
      supplierLeadTimeDays: seed.leadTime,
      currentStock: Math.round(nextMonth * seed.stock),
      incomingStock: Math.round(nextMonth * seed.incoming),
      safetyStock: Math.round(nextMonth * seed.safety),
      lastOrderedQuantity: history.at(-1)?.orderedQuantity ?? 0,
      history,
    };
  });
}
