import { format, isSameDay, subDays } from "date-fns";
import type {
  Aisle,
  AisleTrafficStat,
  Camera,
  DailyPoint,
  DateRangeKey,
  HourlyPoint,
  TimeWindowKey,
  TrafficQuery,
  TrafficSummary,
} from "@/types";
import { AISLE_BASELINES, DAY_OF_WEEK_FACTOR, hourlyWeights } from "@/data/mockAisles";
import { DEMO_TODAY, TRAFFIC_HOURS } from "@/data/mockStore";
import { distribute, noise } from "@/utils/random";
import { formatHour } from "@/utils/formatters";

export const DATE_RANGES: { value: DateRangeKey; label: string; days: number }[] = [
  { value: "today", label: "Today", days: 1 },
  { value: "7d", label: "Last 7 days", days: 7 },
  { value: "30d", label: "Last 30 days", days: 30 },
  { value: "90d", label: "Last 90 days", days: 90 },
];

export const TIME_WINDOWS: { value: TimeWindowKey; label: string; hours: number[] }[] = [
  { value: "all", label: "All day (8 AM – 10 PM)", hours: TRAFFIC_HOURS },
  { value: "morning", label: "Morning (8 AM – 12 PM)", hours: [8, 9, 10, 11] },
  { value: "afternoon", label: "Afternoon (12 – 5 PM)", hours: [12, 13, 14, 15, 16] },
  { value: "evening", label: "Evening (5 – 10 PM)", hours: [17, 18, 19, 20, 21] },
];

const WINDOW_DWELL_FACTOR: Record<TimeWindowKey, number> = { all: 1, morning: 0.94, afternoon: 1.0, evening: 1.06 };

export const rangeDays = (range: DateRangeKey) => DATE_RANGES.find((r) => r.value === range)?.days ?? 1;

/** Simulated visits for one aisle on one day. The demo "today" equals the baseline exactly. */
function aisleDayVisits(aisleId: string, date: Date): number {
  const base = AISLE_BASELINES[aisleId]?.visits ?? 0;
  if (base === 0) return 0;
  if (isSameDay(date, DEMO_TODAY)) return base;
  const key = format(date, "yyyy-MM-dd");
  const dow = DAY_OF_WEEK_FACTOR[date.getDay()] / DAY_OF_WEEK_FACTOR[DEMO_TODAY.getDay()];
  const daysAgo = Math.round((DEMO_TODAY.getTime() - date.getTime()) / 86_400_000);
  const growth = 1 - 0.0007 * daysAgo; // slow upward trend toward the holidays
  const storeNoise = 1 + 0.05 * noise(`store:${key}`);
  const aisleNoise = 1 + 0.05 * noise(`${aisleId}:${key}`);
  return Math.max(0, Math.round(base * dow * growth * storeNoise * aisleNoise));
}

function periodDates(range: DateRangeKey, offsetPeriods = 0): Date[] {
  const days = rangeDays(range);
  // "Today" compares against the same weekday last week; other ranges against the preceding period.
  const shift = range === "today" ? 7 * offsetPeriods : days * offsetPeriods;
  return Array.from({ length: days }, (_, i) => subDays(DEMO_TODAY, shift + days - 1 - i));
}

export function periodLabel(range: DateRangeKey): string {
  const dates = periodDates(range);
  if (range === "today") return `Today · ${format(DEMO_TODAY, "EEE, MMM d, yyyy")}`;
  return `${format(dates[0], "MMM d")} – ${format(dates[dates.length - 1], "MMM d, yyyy")}`;
}

export function cameraLabel(camera: Pick<Camera, "id" | "name">) {
  return `${camera.id.toUpperCase()} · ${camera.name}`;
}

/**
 * Computes the simulated traffic summary for a query. Every screen (Overview, Aisle Analytics,
 * heatmaps, exports) derives its numbers from this single function so values always agree.
 * In Milestone 4 this becomes GET /api/stores/{storeId}/traffic?range=…&window=…&aisle=…&camera=…
 */
export function computeTrafficSummary(query: TrafficQuery, aisles: Aisle[], cameras: Camera[]): TrafficSummary {
  const q: Required<TrafficQuery> = {
    range: query.range,
    timeWindow: query.timeWindow ?? "all",
    aisleId: query.aisleId ?? "all",
    cameraId: query.cameraId ?? "all",
  };
  const windowHours = TIME_WINDOWS.find((w) => w.value === q.timeWindow)?.hours ?? TRAFFIC_HOURS;
  const cameraIds = new Set(cameras.map((c) => c.id));
  const dates = periodDates(q.range);
  const prevDates = periodDates(q.range, 1);

  const candidates = aisles.filter(
    (a) =>
      a.kind === "aisle" &&
      (q.aisleId === "all" || a.id === q.aisleId) &&
      (q.cameraId === "all" || a.cameraId === q.cameraId),
  );

  const uncoveredAisles: TrafficSummary["uncoveredAisles"] = [];
  const stats: Omit<AisleTrafficStat, "rank">[] = [];
  let previousTotalVisits = 0;

  for (const aisle of candidates) {
    const covered = aisle.cameraId !== null && cameraIds.has(aisle.cameraId);
    if (!covered) {
      uncoveredAisles.push({ aisleId: aisle.id, aisleName: aisle.name, reason: "no_camera" });
      continue;
    }
    if (!AISLE_BASELINES[aisle.id]?.visits) {
      uncoveredAisles.push({ aisleId: aisle.id, aisleName: aisle.name, reason: "no_footage" });
      continue;
    }
    const weights = hourlyWeights(aisle.id, TRAFFIC_HOURS);
    const total = dates.reduce((acc, d) => acc + aisleDayVisits(aisle.id, d), 0);
    const prevTotal = prevDates.reduce((acc, d) => acc + aisleDayVisits(aisle.id, d), 0);
    const allHourly = distribute(total, weights);
    const prevHourly = distribute(prevTotal, weights);

    const hourly: HourlyPoint[] = TRAFFIC_HOURS.map((h, i) => ({ hour: h, label: formatHour(h), visits: allHourly[i] })).filter(
      (p) => windowHours.includes(p.hour),
    );
    const visits = hourly.reduce((a, p) => a + p.visits, 0);
    const prevVisits = TRAFFIC_HOURS.reduce((a, h, i) => a + (windowHours.includes(h) ? prevHourly[i] : 0), 0);
    previousTotalVisits += prevVisits;
    const peak = hourly.reduce((best, p) => (p.visits > best.visits ? p : best), hourly[0]);
    const baseDwell = AISLE_BASELINES[aisle.id].dwellSeconds;
    const dwell =
      baseDwell *
      (q.range === "today" ? 1 : 1 + 0.04 * noise(`${aisle.id}:${q.range}:dwell`)) *
      WINDOW_DWELL_FACTOR[q.timeWindow];

    stats.push({
      aisleId: aisle.id,
      aisleName: aisle.name,
      visits,
      avgDwellSeconds: Math.round(dwell * 10) / 10,
      peakHour: peak?.hour ?? 17,
      trendPct: prevVisits > 0 ? ((visits - prevVisits) / prevVisits) * 100 : 0,
      cameraIds: aisle.cameraId ? [aisle.cameraId] : [],
      coverage: aisle.coverage,
      hourly,
    });
  }

  const ranked = [...stats].sort((a, b) => b.visits - a.visits);
  const byAisle: AisleTrafficStat[] = stats.map((s) => ({ ...s, rank: ranked.findIndex((r) => r.aisleId === s.aisleId) + 1 }));

  const totalVisits = byAisle.reduce((a, s) => a + s.visits, 0);
  const avgDwellSeconds = totalVisits
    ? byAisle.reduce((a, s) => a + s.avgDwellSeconds * s.visits, 0) / totalVisits
    : 0;
  const hourly: HourlyPoint[] = windowHours.map((h) => ({
    hour: h,
    label: formatHour(h),
    visits: byAisle.reduce((a, s) => a + (s.hourly.find((p) => p.hour === h)?.visits ?? 0), 0),
  }));
  const peakHour = totalVisits ? hourly.reduce((best, p) => (p.visits > best.visits ? p : best), hourly[0]).hour : null;

  // Daily series: each tracked aisle's day visits × the share of its traffic inside the time window.
  const daily: DailyPoint[] = dates.map((d) => {
    let v = 0;
    for (const s of byAisle) {
      const w = hourlyWeights(s.aisleId, TRAFFIC_HOURS);
      const share = w.reduce((a, x, i) => a + (windowHours.includes(TRAFFIC_HOURS[i]) ? x : 0), 0) / w.reduce((a, x) => a + x, 0);
      v += aisleDayVisits(s.aisleId, d) * share;
    }
    return { date: format(d, "yyyy-MM-dd"), label: format(d, "MMM d"), visits: Math.round(v) };
  });

  return {
    query: q,
    periodLabel: periodLabel(q.range),
    totalVisits,
    previousTotalVisits,
    avgDwellSeconds,
    peakHour,
    mostVisited: ranked[0] ? byAisle.find((s) => s.aisleId === ranked[0].aisleId) ?? null : null,
    leastVisited: ranked.length ? byAisle.find((s) => s.aisleId === ranked[ranked.length - 1].aisleId) ?? null : null,
    hourly,
    daily,
    byAisle,
    uncoveredAisles,
    hours: windowHours,
    generatedAt: new Date().toISOString(),
  };
}

/** Traffic intensity bucket used by heatmaps — always shown with a text label, never color alone. */
export function intensityLevel(visits: number, max: number): { level: 0 | 1 | 2 | 3; label: "Low" | "Medium" | "High" | "None" } {
  if (!max || visits <= 0) return { level: 0, label: "None" };
  const r = visits / max;
  if (r >= 0.7) return { level: 3, label: "High" };
  if (r >= 0.45) return { level: 2, label: "Medium" };
  return { level: 1, label: "Low" };
}
