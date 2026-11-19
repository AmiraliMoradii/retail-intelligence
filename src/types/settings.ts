export type ThemePreference = "light" | "dark" | "system";
export type DateFormatPreference = "MMM d, yyyy" | "dd/MM/yyyy" | "yyyy-MM-dd";
export type RefreshPreference = "manual" | "15min" | "hourly";

export interface AppSettings {
  theme: ThemePreference;
  dateFormat: DateFormatPreference;
  reduceMotion: boolean;
  notifications: {
    inventoryAlerts: boolean;
    processingUpdates: boolean;
    forecastUpdates: boolean;
    weeklySummary: boolean;
  };
  defaultRange: import("./analytics").DateRangeKey;
  showAisleCodes: boolean;
  refresh: RefreshPreference;
  videoRetentionDays: 7 | 14 | 30 | 90;
}

export interface AppNotification {
  id: string;
  title: string;
  body: string;
  createdAt: string;
  read: boolean;
  kind: "inventory" | "processing" | "forecast" | "system";
  href?: string;
}
