import type { ForecastModelOption, ForecastPeriod, InventoryStatus } from "@/types";

export const PERIOD_OPTIONS: { value: ForecastPeriod; label: string }[] = [
  { value: 1, label: "Next Month" },
  { value: 3, label: "Next 3 Months" },
  { value: 6, label: "Next 6 Months" },
];

export const MODEL_OPTIONS: { value: ForecastModelOption; label: string; hint: string }[] = [
  { value: "chronos-2", label: "Chronos-2", hint: "Primary candidate · integration planned" },
  { value: "timesfm-2.5", label: "TimesFM 2.5", hint: "Comparison candidate · integration planned" },
  { value: "compare", label: "Compare Both", hint: "Show both simulated placeholders" },
];

export const periodLabel = (p: ForecastPeriod) => PERIOD_OPTIONS.find((o) => o.value === p)?.label ?? `${p} months`;
export const modelLabel = (m: ForecastModelOption) => MODEL_OPTIONS.find((o) => o.value === m)?.label ?? m;

export type StatusFilter = "all" | "needs" | InventoryStatus;

export const STATUS_FILTERS: { value: StatusFilter; label: string }[] = [
  { value: "all", label: "All statuses" },
  { value: "needs", label: "Needs replenishment (all)" },
  { value: "stockout_risk", label: "Potential stockout" },
  { value: "replenish", label: "Replenish" },
  { value: "overstock", label: "Potential excess" },
  { value: "healthy", label: "Healthy" },
];

/** Severity order used for default sorting and the status column sort. */
export const STATUS_RANK: Record<InventoryStatus, number> = { stockout_risk: 0, replenish: 1, overstock: 2, healthy: 3 };
