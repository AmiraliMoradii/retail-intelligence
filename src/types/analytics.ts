/** Point in the 1000 x 620 store floor-plan coordinate space. */
export type Point = [number, number];

export type ZoneKind = "aisle" | "service";

/**
 * A configured store region. `aisle` zones are tracked for analytics when a camera is assigned;
 * `service` zones (checkout, household, etc.) are shown on the layout for context only.
 */
export interface Aisle {
  id: string;
  name: string;
  kind: ZoneKind;
  /** Camera whose footage covers this region. `null` = no camera coverage → not measured. */
  cameraId: string | null;
  /** "full" when the configured region is fully in frame, "partial" when only part is visible. */
  coverage: "full" | "partial";
  polygon: Point[];
}

/** A single aisle visit produced by the (future) tracking pipeline. Track IDs are temporary and camera-local. */
export interface AisleVisit {
  id: string;
  aisleId: string;
  cameraId: string;
  trackId: number;
  enteredAt: string;
  exitedAt: string;
  dwellSeconds: number;
}

export type DateRangeKey = "today" | "7d" | "30d" | "90d";
export type TimeWindowKey = "all" | "morning" | "afternoon" | "evening";

export interface TrafficQuery {
  range: DateRangeKey;
  timeWindow?: TimeWindowKey;
  aisleId?: string | "all";
  cameraId?: string | "all";
}

export interface HourlyPoint {
  hour: number;
  label: string;
  visits: number;
}

export interface DailyPoint {
  date: string;
  label: string;
  visits: number;
}

export interface AisleTrafficStat {
  aisleId: string;
  aisleName: string;
  visits: number;
  avgDwellSeconds: number;
  peakHour: number;
  /** % change vs previous equal-length period */
  trendPct: number;
  rank: number;
  cameraIds: string[];
  coverage: "full" | "partial" | "none";
  hourly: HourlyPoint[];
}

export interface TrafficSummary {
  query: Required<TrafficQuery>;
  periodLabel: string;
  totalVisits: number;
  previousTotalVisits: number;
  avgDwellSeconds: number;
  peakHour: number | null;
  mostVisited: AisleTrafficStat | null;
  leastVisited: AisleTrafficStat | null;
  hourly: HourlyPoint[];
  daily: DailyPoint[];
  byAisle: AisleTrafficStat[];
  /** Aisle zones that exist but have no camera coverage (not measured). */
  uncoveredAisles: { aisleId: string; aisleName: string; reason: "no_camera" | "no_footage" }[];
  hours: number[];
  generatedAt: string;
}
