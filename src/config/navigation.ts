import {
  Boxes,
  Camera,
  Database,
  LayoutDashboard,
  Settings,
  TrendingUp,
  Footprints,
  type LucideIcon,
} from "lucide-react";

export interface NavItem {
  to: string;
  label: string;
  icon: LucideIcon;
  description: string;
  /** Show the global date-range selector in the header on this page. */
  dateRange?: boolean;
}

export const NAV_ITEMS: NavItem[] = [
  { to: "/overview", label: "Overview", icon: LayoutDashboard, description: "Store Overview", dateRange: true },
  { to: "/aisles", label: "Aisle Analytics", icon: Footprints, description: "Aisle Analytics", dateRange: true },
  { to: "/inventory", label: "Inventory", icon: Boxes, description: "Inventory Management" },
  { to: "/forecasting", label: "Demand Forecasting", icon: TrendingUp, description: "Demand Forecasting" },
  { to: "/data", label: "Data Management", icon: Database, description: "Data Management" },
  { to: "/cameras", label: "Cameras & Aisles", icon: Camera, description: "Cameras & Aisles" },
  { to: "/settings", label: "Settings", icon: Settings, description: "Settings" },
];
