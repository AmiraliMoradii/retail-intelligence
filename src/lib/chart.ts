/** Chart colour roles (CSS variables defined in index.css; both themes are selected, not flipped). */
export const CHART = {
  series1: "var(--series-1)",
  series2: "var(--series-2)",
  series3: "var(--series-3)",
  grid: "var(--chart-grid)",
  axis: "var(--chart-axis)",
  muted: "var(--subtle)",
  surface: "var(--card)",
  seq: ["var(--seq-0)", "var(--seq-1)", "var(--seq-2)", "var(--seq-3)", "var(--seq-4)", "var(--seq-5)", "var(--seq-6)", "var(--seq-7)"],
} as const;

export const AXIS_PROPS = {
  stroke: "var(--chart-grid)",
  tickLine: false,
  axisLine: false,
  tick: { fill: "var(--chart-axis)", fontSize: 12 },
} as const;

/** Sequential step (0–7) for a value relative to a max; 0 means none. */
export function seqStep(value: number, max: number) {
  if (!max || value <= 0) return 0;
  return Math.max(1, Math.min(7, Math.ceil((value / max) * 7)));
}

/** Text colour that stays readable on a given sequential step. */
export function seqTextClass(step: number) {
  return step >= 4 ? "text-white" : "text-foreground";
}
