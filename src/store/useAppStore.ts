import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import type {
  Aisle,
  AppNotification,
  AppSettings,
  Camera,
  DateRangeKey,
  ForecastHistoryEntry,
  ImportBatch,
  InventoryRecord,
  Product,
  ProductCategory,
  SalesRecord,
  Store,
  VideoAsset,
} from "@/types";
import { DEMO_STORE } from "@/data/mockStore";
import { MOCK_AISLES } from "@/data/mockAisles";
import { MOCK_CAMERAS, MOCK_VIDEOS } from "@/data/mockCameras";
import { buildMockProducts, PRODUCT_CATEGORIES } from "@/data/mockInventory";
import { buildSeedForecastHistory } from "@/data/mockForecasts";
import { toInventoryRow } from "@/utils/calculations";
import { uid } from "@/utils/random";

export const DEFAULT_SETTINGS: AppSettings = {
  theme: "light",
  dateFormat: "MMM d, yyyy",
  reduceMotion: false,
  notifications: { inventoryAlerts: true, processingUpdates: true, forecastUpdates: true, weeklySummary: false },
  defaultRange: "today",
  showAisleCodes: false,
  refresh: "manual",
  videoRetentionDays: 30,
};

export interface OnboardingState {
  completed: boolean;
  step: number;
  /** Furthest step reached, so the stepper can jump back and forth. */
  maxStep: number;
  storeSaved: boolean;
  csvImported: boolean;
  csvSkipped: boolean;
}

const INITIAL_ONBOARDING: OnboardingState = {
  completed: false,
  step: 0,
  maxStep: 0,
  storeSaved: false,
  csvImported: false,
  csvSkipped: false,
};

function seedNotifications(products: Product[]): AppNotification[] {
  const needs = products.map(toInventoryRow).filter((r) => r.recommendedOrder > 0).length;
  return [
    {
      id: "n-inventory",
      title: `${needs} products need replenishment`,
      body: "Forecast demand plus safety stock exceeds available stock. Review recommended orders.",
      createdAt: "2026-11-18T08:00:00",
      read: false,
      kind: "inventory",
      href: "/inventory?status=needs",
    },
    {
      id: "n-video-done",
      title: "Simulated processing completed",
      body: "CAM-02 · Center Aisles footage from Nov 17 is ready in Aisle Analytics.",
      createdAt: "2026-11-18T07:52:00",
      read: false,
      kind: "processing",
      href: "/data?tab=video",
    },
    {
      id: "n-video-failed",
      title: "Video processing failed",
      body: "cam03_dairy-frozen_2026-11-16.mp4 could not be processed (simulated). Retry from Data Management.",
      createdAt: "2026-11-16T18:41:00",
      read: true,
      kind: "processing",
      href: "/data?tab=video",
    },
  ];
}

export interface CameraInput {
  name: string;
  area: string;
  description: string;
  sourceType: Camera["sourceType"];
}

export interface AppState {
  store: Store;
  onboarding: OnboardingState;
  cameras: Camera[];
  aisles: Aisle[];
  products: Product[];
  importBatches: ImportBatch[];
  importedRecords: InventoryRecord[];
  videos: VideoAsset[];
  forecastHistory: ForecastHistoryEntry[];
  notifications: AppNotification[];
  settings: AppSettings;
  filters: { range: DateRangeKey; aisleId: string };
  lastRefreshedAt: string;

  updateStore: (patch: Partial<Store>) => void;
  setOnboarding: (patch: Partial<OnboardingState>) => void;
  completeOnboarding: () => void;
  skipOnboarding: () => void;

  addCamera: (input: CameraInput) => Camera;
  updateCamera: (id: string, patch: Partial<Camera>) => void;
  removeCamera: (id: string) => void;

  saveAisles: (aisles: Aisle[]) => void;

  importInventory: (fileName: string, records: InventoryRecord[]) => ImportBatch;
  clearImportedInventory: () => void;

  addVideo: (video: VideoAsset) => void;
  updateVideo: (id: string, patch: Partial<VideoAsset>) => void;
  removeVideo: (id: string) => void;
  assignVideoToCamera: (videoId: string, cameraId: string | null) => void;
  clearVideos: () => void;

  addForecastHistory: (entry: ForecastHistoryEntry) => void;
  clearForecastHistory: () => void;

  pushNotification: (n: Omit<AppNotification, "id" | "createdAt" | "read">) => void;
  markNotificationRead: (id: string) => void;
  markAllNotificationsRead: () => void;
  clearNotifications: () => void;

  updateSettings: (patch: Partial<AppSettings>) => void;
  setFilters: (patch: Partial<AppState["filters"]>) => void;
  refresh: () => void;
  resetDemoData: () => void;
}

function initialData() {
  const products = buildMockProducts();
  return {
    store: { ...DEMO_STORE },
    onboarding: { ...INITIAL_ONBOARDING },
    cameras: MOCK_CAMERAS.map((c) => ({ ...c })),
    aisles: MOCK_AISLES.map((a) => ({ ...a, polygon: a.polygon.map((p) => [...p] as [number, number]) })),
    products,
    importBatches: [] as ImportBatch[],
    importedRecords: [] as InventoryRecord[],
    videos: MOCK_VIDEOS.map((v) => ({ ...v })),
    forecastHistory: buildSeedForecastHistory(products),
    notifications: seedNotifications(products),
    settings: { ...DEFAULT_SETTINGS, notifications: { ...DEFAULT_SETTINGS.notifications } },
    filters: { range: DEFAULT_SETTINGS.defaultRange, aisleId: "all" },
    lastRefreshedAt: new Date().toISOString(),
  };
}

const toCategory = (raw?: string): ProductCategory => {
  if (!raw) return "Uncategorized";
  const match = PRODUCT_CATEGORIES.find((c) => c.toLowerCase() === raw.trim().toLowerCase());
  return match ?? "Uncategorized";
};

/** Merge parsed CSV records into the product list (monthly aggregation, newest values win). */
function mergeRecords(products: Product[], records: InventoryRecord[], importedAt: string) {
  const groups = new Map<string, InventoryRecord[]>();
  for (const record of records) {
    const group = groups.get(record.product_id);
    if (group) group.push(record);
    else groups.set(record.product_id, [record]);
  }

  const next = products.map((p) => ({ ...p, history: [...p.history] }));
  const productIds: string[] = [];
  const newProductIds: string[] = [];

  for (const [productId, rows] of groups) {
    const sorted = [...rows].sort((a, b) => a.date.localeCompare(b.date));
    const months = new Map<string, SalesRecord>();
    for (const r of sorted) {
      const month = r.date.slice(0, 7);
      const m = months.get(month) ?? { month, soldQuantity: 0, orderedQuantity: 0 };
      m.soldQuantity += r.sold_quantity;
      m.orderedQuantity += r.ordered_quantity;
      months.set(month, m);
    }
    const latest = sorted[sorted.length - 1];
    const latestStock = [...sorted].reverse().find((r) => r.current_stock !== undefined)?.current_stock;
    const existing = next.find((p) => p.id === productId);
    productIds.push(productId);

    if (existing) {
      const byMonth = new Map(existing.history.map((h) => [h.month, h]));
      for (const [k, v] of months) byMonth.set(k, v);
      existing.history = [...byMonth.values()].sort((a, b) => a.month.localeCompare(b.month)).slice(-24);
      existing.name = latest.product_name || existing.name;
      if (latest.category) existing.category = toCategory(latest.category);
      if (latestStock !== undefined) existing.currentStock = latestStock;
      if (latest.supplier_lead_time !== undefined) existing.supplierLeadTimeDays = latest.supplier_lead_time;
      if (latest.unit_cost !== undefined) existing.unitCost = latest.unit_cost;
      existing.lastOrderedQuantity = existing.history.at(-1)?.orderedQuantity ?? existing.lastOrderedQuantity;
      existing.importedAt = importedAt;
    } else {
      const history = [...months.values()].sort((a, b) => a.month.localeCompare(b.month)).slice(-24);
      const recent = history.slice(-3);
      const avgSold = recent.reduce((a, h) => a + h.soldQuantity, 0) / (recent.length || 1);
      next.push({
        id: productId,
        name: latest.product_name,
        category: toCategory(latest.category),
        unit: "unit",
        unitCost: latest.unit_cost ?? 0,
        supplierLeadTimeDays: latest.supplier_lead_time ?? 7,
        currentStock: latestStock ?? Math.round(avgSold * 0.5),
        incomingStock: 0,
        safetyStock: Math.round(avgSold * 0.12),
        lastOrderedQuantity: history.at(-1)?.orderedQuantity ?? 0,
        history,
        importedAt,
      });
      newProductIds.push(productId);
    }
  }
  return { products: next, productIds, newProductIds };
}

export const useAppStore = create<AppState>()(
  persist(
    (set, get) => ({
      ...initialData(),

      updateStore: (patch) => set((s) => ({ store: { ...s.store, ...patch } })),
      setOnboarding: (patch) =>
        set((s) => {
          const next = { ...s.onboarding, ...patch };
          return { onboarding: { ...next, maxStep: patch.maxStep ?? Math.max(next.maxStep ?? 0, next.step) } };
        }),
      completeOnboarding: () =>
        set((s) => ({
          onboarding: { ...s.onboarding, completed: true, step: 3 },
          store: { ...s.store, cameraCount: s.cameras.length },
        })),
      skipOnboarding: () => set((s) => ({ onboarding: { ...s.onboarding, completed: true, storeSaved: true, csvSkipped: true } })),

      addCamera: (input) => {
        const nums = get().cameras.map((c) => Number(c.id.replace(/\D/g, "")) || 0);
        const id = `cam-${String(Math.max(0, ...nums) + 1).padStart(2, "0")}`;
        const camera: Camera = { id, ...input, videoId: null, updatedAt: new Date().toISOString() };
        set((s) => ({ cameras: [...s.cameras, camera], store: { ...s.store, cameraCount: s.cameras.length + 1 } }));
        return camera;
      },
      updateCamera: (id, patch) =>
        set((s) => ({
          cameras: s.cameras.map((c) => (c.id === id ? { ...c, ...patch, updatedAt: new Date().toISOString() } : c)),
        })),
      removeCamera: (id) =>
        set((s) => ({
          cameras: s.cameras.filter((c) => c.id !== id),
          aisles: s.aisles.map((a) => (a.cameraId === id ? { ...a, cameraId: null } : a)),
          videos: s.videos.map((v) => (v.cameraId === id ? { ...v, cameraId: null } : v)),
          store: { ...s.store, cameraCount: Math.max(0, s.cameras.length - 1) },
        })),

      saveAisles: (aisles) =>
        set((s) => ({ aisles, store: { ...s.store, aisleCount: aisles.filter((a) => a.kind === "aisle").length } })),

      importInventory: (fileName, records) => {
        const importedAt = new Date().toISOString();
        const { products, productIds, newProductIds } = mergeRecords(get().products, records, importedAt);
        const batch: ImportBatch = {
          id: uid("import"),
          fileName,
          importedAt,
          rowCount: records.length,
          productIds,
          newProductIds,
        };
        set((s) => ({
          products,
          importBatches: [batch, ...s.importBatches].slice(0, 20),
          importedRecords: [...records, ...s.importedRecords].slice(0, 5000),
        }));
        return batch;
      },
      clearImportedInventory: () =>
        set(() => ({ products: buildMockProducts(), importBatches: [], importedRecords: [] })),

      addVideo: (video) => set((s) => ({ videos: [video, ...s.videos] })),
      updateVideo: (id, patch) => set((s) => ({ videos: s.videos.map((v) => (v.id === id ? { ...v, ...patch } : v)) })),
      removeVideo: (id) =>
        set((s) => ({
          videos: s.videos.filter((v) => v.id !== id),
          cameras: s.cameras.map((c) => (c.videoId === id ? { ...c, videoId: null } : c)),
        })),
      assignVideoToCamera: (videoId, cameraId) =>
        set((s) => ({
          videos: s.videos.map((v) => (v.id === videoId ? { ...v, cameraId } : v)),
          cameras: s.cameras.map((c) => {
            if (c.id === cameraId) return { ...c, videoId, updatedAt: new Date().toISOString() };
            if (c.videoId === videoId) return { ...c, videoId: null };
            return c;
          }),
        })),
      clearVideos: () =>
        set((s) => ({ videos: [], cameras: s.cameras.map((c) => ({ ...c, videoId: null })) })),

      addForecastHistory: (entry) => set((s) => ({ forecastHistory: [entry, ...s.forecastHistory].slice(0, 50) })),
      clearForecastHistory: () => set({ forecastHistory: [] }),

      pushNotification: (n) => {
        const prefs = get().settings.notifications;
        if (n.kind === "inventory" && !prefs.inventoryAlerts) return;
        if (n.kind === "processing" && !prefs.processingUpdates) return;
        if (n.kind === "forecast" && !prefs.forecastUpdates) return;
        set((s) => ({
          notifications: [{ ...n, id: uid("n"), createdAt: new Date().toISOString(), read: false }, ...s.notifications].slice(0, 30),
        }));
      },
      markNotificationRead: (id) =>
        set((s) => ({ notifications: s.notifications.map((n) => (n.id === id ? { ...n, read: true } : n)) })),
      markAllNotificationsRead: () => set((s) => ({ notifications: s.notifications.map((n) => ({ ...n, read: true })) })),
      clearNotifications: () => set({ notifications: [] }),

      updateSettings: (patch) =>
        set((s) => ({
          settings: {
            ...s.settings,
            ...patch,
            notifications: { ...s.settings.notifications, ...(patch.notifications ?? {}) },
          },
        })),
      setFilters: (patch) => set((s) => ({ filters: { ...s.filters, ...patch } })),
      refresh: () => set({ lastRefreshedAt: new Date().toISOString() }),
      resetDemoData: () => {
        const settings = get().settings;
        set({ ...initialData(), settings, onboarding: { ...INITIAL_ONBOARDING, completed: true, storeSaved: true } });
      },
    }),
    {
      name: "ri-demo-state",
      version: 2,
      storage: createJSONStorage(() => localStorage),
      migrate: () => initialData() as unknown as AppState,
    },
  ),
);
