import { lazy } from "react";
import { createBrowserRouter, Navigate } from "react-router";
import { AppLayout } from "@/components/layout/AppLayout";
import { RedirectIfAuthed, RequireAuth, RequireOnboarding } from "./guards";
import LoginPage from "@/pages/LoginPage";
import NotFoundPage from "@/pages/NotFoundPage";

const OnboardingPage = lazy(() => import("@/pages/OnboardingPage"));
const DashboardPage = lazy(() => import("@/pages/DashboardPage"));
const AisleAnalyticsPage = lazy(() => import("@/pages/AisleAnalyticsPage"));
const InventoryPage = lazy(() => import("@/pages/InventoryPage"));
const ForecastingPage = lazy(() => import("@/pages/ForecastingPage"));
const DataManagementPage = lazy(() => import("@/pages/DataManagementPage"));
const CameraConfigurationPage = lazy(() => import("@/pages/CameraConfigurationPage"));
const SettingsPage = lazy(() => import("@/pages/SettingsPage"));

const StoreInventoryPage = lazy(() => import("@/pages/StoreInventoryPage"));

export const router = createBrowserRouter([
  ...(import.meta.env.VITE_STORE_INVENTORY === "1"
    ? [{ path: "/store-inventory", element: <StoreInventoryPage /> }]
    : []),
  {
    element: <RedirectIfAuthed />,
    children: [{ path: "/login", element: <LoginPage /> }],
  },
  {
    element: <RequireAuth />,
    children: [
      { path: "/onboarding", element: <OnboardingPage /> },
      {
        element: <RequireOnboarding />,
        children: [
          {
            element: <AppLayout />,
            children: [
              { index: true, element: <Navigate to="/overview" replace /> },
              { path: "/overview", element: <DashboardPage /> },
              { path: "/aisles", element: <AisleAnalyticsPage /> },
              { path: "/inventory", element: <InventoryPage /> },
              { path: "/forecasting", element: <ForecastingPage /> },
              { path: "/data", element: <DataManagementPage /> },
              { path: "/cameras", element: <CameraConfigurationPage /> },
              { path: "/settings", element: <SettingsPage /> },
            ],
          },
        ],
      },
    ],
  },
  { path: "*", element: <NotFoundPage /> },
]);
