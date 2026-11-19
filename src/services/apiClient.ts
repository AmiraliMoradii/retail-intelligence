/**
 * Placeholder for the Milestone 4 HTTP client.
 *
 * Planned FastAPI endpoints (all JSON, authenticated with a bearer token):
 *   POST /api/auth/login                       → User
 *   GET  /api/stores/{storeId}                 → Store
 *   GET  /api/stores/{storeId}/traffic         → TrafficSummary   (?range=&window=&aisle=&camera=)
 *   GET  /api/stores/{storeId}/aisles          → Aisle[]          PUT to save polygons
 *   GET  /api/stores/{storeId}/cameras         → Camera[]         POST / PATCH / DELETE
 *   POST /api/videos                           → VideoAsset       (multipart upload)
 *   POST /api/videos/{id}/process              → ProcessingJob    (OpenCV → YOLO26 → ByteTrack → zones)
 *   GET  /api/jobs/{id}                        → ProcessingJob
 *   POST /api/inventory/imports                → ImportBatch      (CSV upload, server-side validation)
 *   GET  /api/products                         → Product[]
 *   POST /api/forecasts                        → DemandForecast[] (Chronos-2 / TimesFM 2.5)
 *   GET  /api/products/{id}/recommendation     → OrderRecommendation
 *
 * Swap the functions exported from services/mockApi.ts for implementations that call `request()`.
 */
export const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? "http://localhost:8000";

export async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${API_BASE_URL}${path}`, {
    ...init,
    headers: { "Content-Type": "application/json", ...(init?.headers ?? {}) },
  });
  if (!res.ok) throw new Error(`Request failed (${res.status})`);
  return (await res.json()) as T;
}
