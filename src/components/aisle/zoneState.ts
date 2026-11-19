import type { Aisle, AisleTrafficStat, Camera, TrafficSummary } from "@/types";
import { intensityLevel } from "@/services/analyticsService";
import { AISLE_BASELINES } from "@/data/mockAisles";

export type ZoneState =
  | { kind: "measured"; stat: AisleTrafficStat; level: 1 | 2 | 3; levelLabel: "Low" | "Medium" | "High"; rank: number; of: number }
  | { kind: "no_camera" }
  | { kind: "no_footage" }
  | { kind: "filtered" };

/** Classify each store aisle for the heatmap / detail panel given the current (unfiltered-by-aisle) summary. */
export function zoneState(aisle: Aisle, summary: TrafficSummary | null, cameras: Camera[]): ZoneState {
  const covered = aisle.cameraId !== null && cameras.some((c) => c.id === aisle.cameraId);
  if (!covered) return { kind: "no_camera" };
  if (!AISLE_BASELINES[aisle.id]?.visits) return { kind: "no_footage" };
  const stat = summary?.byAisle.find((s) => s.aisleId === aisle.id);
  if (!stat) return { kind: "filtered" };
  const max = Math.max(0, ...(summary?.byAisle.map((s) => s.visits) ?? [0]));
  const { level, label } = intensityLevel(stat.visits, max);
  return {
    kind: "measured",
    stat,
    level: (level || 1) as 1 | 2 | 3,
    levelLabel: (label === "None" ? "Low" : label) as "Low" | "Medium" | "High",
    rank: stat.rank,
    of: summary?.byAisle.length ?? 0,
  };
}

export const LEVEL_FILL: Record<1 | 2 | 3, string> = { 1: "var(--seq-2)", 2: "var(--seq-4)", 3: "var(--seq-6)" };
