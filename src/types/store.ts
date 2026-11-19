export type StoreType = "Grocery Store" | "Supermarket" | "Convenience Store" | "Other Retail";

export const STORE_TYPES: StoreType[] = ["Grocery Store", "Supermarket", "Convenience Store", "Other Retail"];

export interface OperatingHours {
  /** 24h "HH:mm" */
  open: string;
  close: string;
}

export interface Store {
  id: string;
  name: string;
  type: StoreType;
  location: string;
  aisleCount: number;
  cameraCount: number;
  operatingHours: OperatingHours;
  timezone: string;
}

export interface User {
  id: string;
  name: string;
  email: string;
  role: string;
  initials: string;
}
