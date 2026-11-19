import type { Store, User } from "@/types";

/**
 * The fixed "today" for the demo dataset. All simulated traffic and sales data is generated
 * relative to this date so the prototype shows identical numbers on every run.
 */
export const DEMO_TODAY = new Date(2026, 10, 18, 12, 0, 0); // Wed, Nov 18 2026

/** Clearly-fake demo login (".example" is a reserved domain). */
export const DEMO_CREDENTIALS = {
  email: "manager@demo-grocer.example",
  password: "Demo2026!",
} as const;

export const DEMO_USER: User = {
  id: "user_demo",
  name: "Alex Morgan",
  email: DEMO_CREDENTIALS.email,
  role: "Store Manager (demo persona)",
  initials: "AM",
};

export const DEMO_STORE: Store = {
  id: "store_maple",
  name: "Maple Street Grocer",
  type: "Grocery Store",
  location: "Calgary, AB",
  aisleCount: 8,
  cameraCount: 3,
  operatingHours: { open: "08:00", close: "22:00" },
  timezone: "America/Edmonton",
};

/** Hours of operation used by the traffic dataset (8 AM – 10 PM → hour buckets 8..21). */
export const TRAFFIC_HOURS = Array.from({ length: 14 }, (_, i) => 8 + i);
