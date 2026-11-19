/**
 * Mock API layer.
 *
 * Every function here mirrors a planned FastAPI endpoint (noted above each function) and returns a
 * Promise, so screens already handle loading and error states. In Milestone 4 replace the bodies with
 * `fetch` calls (see services/apiClient.ts) — component code does not need to change.
 */
import type {
  Aisle,
  Camera,
  DemandForecast,
  ForecastModel,
  ForecastModelOption,
  ForecastPeriod,
  Product,
  TrafficQuery,
  TrafficSummary,
  User,
} from "@/types";
import { DEMO_CREDENTIALS, DEMO_USER } from "@/data/mockStore";
import { computeTrafficSummary } from "./analyticsService";
import { forecastTotal, simulateForecast } from "@/utils/calculations";
import { useAppStore } from "@/store/useAppStore";
import { uid } from "@/utils/random";

const reducedLatency = () => (typeof window !== "undefined" && window.matchMedia?.("(prefers-reduced-motion: reduce)").matches ? 0.5 : 1);
export const latency = (ms: number) => new Promise<void>((r) => setTimeout(r, ms * reducedLatency()));

export class ApiError extends Error {
  constructor(
    message: string,
    public code: string,
  ) {
    super(message);
  }
}

/** POST /api/auth/login — simulated; no credentials leave the browser. */
export async function login(email: string, password: string): Promise<User> {
  await latency(650);
  if (email.trim().toLowerCase() === DEMO_CREDENTIALS.email && password === DEMO_CREDENTIALS.password) {
    return DEMO_USER;
  }
  throw new ApiError("Invalid email or password.", "invalid_credentials");
}

/** GET /api/stores/{storeId}/traffic */
export async function getTrafficSummary(query: TrafficQuery, aisles: Aisle[], cameras: Camera[]): Promise<TrafficSummary> {
  await latency(320);
  return computeTrafficSummary(query, aisles, cameras);
}

/** POST /api/forecasts — returns SIMULATED forecasts (no Chronos-2 / TimesFM inference in Milestone 2). */
export async function generateForecast(params: {
  product: Product;
  periodMonths: ForecastPeriod;
  model: ForecastModelOption;
}): Promise<DemandForecast[]> {
  await latency(1100);
  const { product, periodMonths, model } = params;
  if (product.history.length < 3) {
    throw new ApiError("At least 3 months of sales history are needed to generate a forecast.", "insufficient_history");
  }
  const models: ForecastModel[] = model === "compare" ? ["chronos-2", "timesfm-2.5"] : [model];
  const generatedAt = new Date().toISOString();
  return models.map((m) => {
    const points = simulateForecast(product.id, product.history, periodMonths, m);
    return {
      id: uid("fc"),
      productId: product.id,
      model: m,
      periodMonths,
      generatedAt,
      points,
      totalDemand: forecastTotal(points),
      simulated: true as const,
    };
  });
}

/* ------------------------------------------------------------------ */
/* Simulated video processing (POST /api/videos/{id}/process)          */
/* ------------------------------------------------------------------ */
const timers = new Map<string, ReturnType<typeof setInterval>>();

/**
 * Simulates the planned OpenCV → YOLO26 → ByteTrack → zone-analysis job with a progress timer.
 * Files whose name contains "corrupt" fail deterministically so the Failed state can be demonstrated.
 */
export function startVideoProcessing(videoId: string, opts: { slow?: boolean } = {}) {
  if (timers.has(videoId)) return;
  const { updateVideo, pushNotification } = useAppStore.getState();
  const video = useAppStore.getState().videos.find((v) => v.id === videoId);
  if (!video) return;
  const willFail = /corrupt/i.test(video.fileName);
  const step = opts.slow ? 1 : 6;
  const tickMs = opts.slow ? 1500 : 450;
  updateVideo(videoId, { status: "processing", message: "Simulated processing in progress.", progress: video.status === "processing" ? video.progress : 0 });

  const t = setInterval(() => {
    const current = useAppStore.getState().videos.find((v) => v.id === videoId);
    if (!current || current.status !== "processing") {
      clearInterval(t);
      timers.delete(videoId);
      return;
    }
    const progress = Math.min(100, current.progress + step);
    if (willFail && progress >= 34) {
      clearInterval(t);
      timers.delete(videoId);
      updateVideo(videoId, { status: "failed", progress, message: "Simulated failure: the video could not be decoded." });
      pushNotification({
        kind: "processing",
        title: "Video processing failed",
        body: `${current.fileName} could not be processed (simulated).`,
        href: "/data?tab=video",
      });
      return;
    }
    if (progress >= 100) {
      clearInterval(t);
      timers.delete(videoId);
      updateVideo(videoId, { status: "completed", progress: 100, message: "Simulated aisle metrics generated." });
      pushNotification({
        kind: "processing",
        title: "Simulated processing completed",
        body: `${current.fileName} finished processing (simulated — no computer-vision inference was run).`,
        href: "/data?tab=video",
      });
      return;
    }
    updateVideo(videoId, { progress });
  }, tickMs);
  timers.set(videoId, t);
}

export function cancelVideoProcessing(videoId: string) {
  const t = timers.get(videoId);
  if (t) clearInterval(t);
  timers.delete(videoId);
}

/** Resume any jobs left in "processing" (e.g. after a page refresh). */
export function resumeProcessingJobs() {
  for (const v of useAppStore.getState().videos) {
    if (v.status === "processing") startVideoProcessing(v.id, { slow: v.isFixture });
  }
}
