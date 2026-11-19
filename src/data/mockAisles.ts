import type { Aisle } from "@/types";

/** Floor-plan coordinate space shared by the heatmap and the aisle configuration editor. */
export const FLOOR_PLAN = { width: 1000, height: 620 } as const;

/** Fixed fixtures drawn on the plan for orientation (not configurable regions). */
export const FLOOR_FIXTURES = [
  { id: "entrance", label: "Entrance", x: 30, y: 548, w: 150, h: 46 },
  { id: "checkout", label: "Checkout lanes", x: 300, y: 520, w: 420, h: 74 },
  { id: "office", label: "Staff / Storage", x: 760, y: 470, w: 210, h: 124 },
] as const;

const rect = (x: number, y: number, w: number, h: number): Aisle["polygon"] => [
  [x, y],
  [x + w, y],
  [x + w, y + h],
  [x, y + h],
];

/**
 * Store regions. Six aisles are covered by cameras and produce simulated analytics;
 * Household and Health & Beauty exist in the store but have no camera coverage.
 */
export const MOCK_AISLES: Aisle[] = [
  { id: "produce", name: "Produce", kind: "aisle", cameraId: "cam-01", coverage: "partial", polygon: rect(30, 30, 240, 330) },
  { id: "dairy", name: "Dairy", kind: "aisle", cameraId: "cam-03", coverage: "full", polygon: rect(300, 30, 420, 86) },
  { id: "snacks", name: "Snacks", kind: "aisle", cameraId: "cam-02", coverage: "full", polygon: rect(300, 150, 96, 330) },
  { id: "frozen", name: "Frozen Foods", kind: "aisle", cameraId: "cam-03", coverage: "full", polygon: rect(750, 30, 220, 200) },
  { id: "bakery", name: "Bakery", kind: "aisle", cameraId: "cam-01", coverage: "full", polygon: rect(30, 390, 240, 128) },
  { id: "beverages", name: "Beverages", kind: "aisle", cameraId: "cam-02", coverage: "full", polygon: rect(440, 150, 96, 330) },
  { id: "household", name: "Household & Cleaning", kind: "aisle", cameraId: null, coverage: "full", polygon: rect(580, 150, 140, 330) },
  { id: "health", name: "Health & Beauty", kind: "aisle", cameraId: null, coverage: "full", polygon: rect(750, 260, 220, 180) },
];

/**
 * Baseline single-day aisle visits and dwell times (the "Today" view equals these exactly).
 * Only aisles listed here have simulated footage; new or uncovered aisles have no data.
 */
export const AISLE_BASELINES: Record<string, { visits: number; dwellSeconds: number; aisleCode: string }> = {
  produce: { visits: 245, dwellSeconds: 48, aisleCode: "A1" },
  dairy: { visits: 182, dwellSeconds: 31, aisleCode: "A2" },
  snacks: { visits: 310, dwellSeconds: 62, aisleCode: "A3" },
  frozen: { visits: 126, dwellSeconds: 27, aisleCode: "A4" },
  bakery: { visits: 205, dwellSeconds: 44, aisleCode: "A5" },
  beverages: { visits: 180, dwellSeconds: 35, aisleCode: "A6" },
  household: { visits: 0, dwellSeconds: 0, aisleCode: "A7" },
  health: { visits: 0, dwellSeconds: 0, aisleCode: "A8" },
};

/** Store-wide hourly shape for hours 8..21 (peak 5–6 PM). */
const BASE_HOURLY = [3, 4.5, 6, 7, 8.5, 7.5, 6, 6.5, 8.5, 11, 10, 8, 5.5, 3];

/** Per-aisle multipliers on top of the store-wide shape (bakery skews morning, snacks/beverages evening). */
const AISLE_HOURLY_ADJUST: Record<string, Partial<Record<number, number>>> = {
  bakery: { 8: 2.6, 9: 2.5, 10: 2.0, 11: 1.4, 16: 0.85, 17: 0.85, 18: 0.8, 19: 0.7, 20: 0.6, 21: 0.5 },
  snacks: { 17: 1.15, 18: 1.2, 19: 1.25, 20: 1.2 },
  beverages: { 16: 1.1, 17: 1.15, 18: 1.2, 19: 1.2 },
  frozen: { 17: 1.1, 18: 1.12 },
  produce: { 10: 1.1, 11: 1.1, 12: 1.05 },
};

export function hourlyWeights(aisleId: string, hours: number[]): number[] {
  const adj = AISLE_HOURLY_ADJUST[aisleId] ?? {};
  return hours.map((h) => (BASE_HOURLY[h - 8] ?? 0) * (adj[h] ?? 1));
}

/** Day-of-week traffic multipliers (Sun..Sat), normalised so a Wednesday = 1. */
export const DAY_OF_WEEK_FACTOR = [1.15, 0.88, 0.85, 1.0, 0.98, 1.12, 1.3];
