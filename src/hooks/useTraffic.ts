import { useAppStore } from "@/store/useAppStore";
import { getTrafficSummary } from "@/services/mockApi";
import { useMockQuery } from "./useMockQuery";
import type { TrafficQuery } from "@/types";

/** Traffic summary for a query, recomputed whenever aisles/cameras change or the user refreshes. */
export function useTrafficSummary(query: TrafficQuery) {
  const aisles = useAppStore((s) => s.aisles);
  const cameras = useAppStore((s) => s.cameras);
  const lastRefreshedAt = useAppStore((s) => s.lastRefreshedAt);
  return useMockQuery(
    () => getTrafficSummary(query, aisles, cameras),
    [query.range, query.timeWindow, query.aisleId, query.cameraId, aisles, cameras, lastRefreshedAt],
  );
}
