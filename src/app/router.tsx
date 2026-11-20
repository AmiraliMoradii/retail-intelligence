import { lazy } from "react";
import { createBrowserRouter, createHashRouter, Navigate } from "react-router";
import { PUBLIC_DEMO } from "@/config/demo";
import { AppLayout } from "@/components/layout/AppLayout";
import { RedirectIfAuthed, RequireAuth, RequireOnboarding } from "./guards";
const LoginPage = import.meta.env.VITE_PUBLIC_DEMO === "1"
  ? lazy(() => import("@/pages/PublicDemoPage"))
  : lazy(() => import("@/pages/LoginPage"));
import NotFoundPage from "@/pages/NotFoundPage";

const OnboardingPage = import.meta.env.VITE_PUBLIC_DEMO === "1"
  ? () => <Navigate to="/overview" replace />
  : lazy(() => import("@/pages/OnboardingPage"));
const DashboardPage = lazy(() => import("@/pages/DashboardPage"));
const AisleAnalyticsPage = lazy(() => import("@/pages/AisleAnalyticsPage"));
const InventoryPage = lazy(() => import("@/pages/InventoryPage"));
const ForecastingPage = lazy(() => import("@/pages/ForecastingPage"));
const DataManagementPage = lazy(() => import("@/pages/DataManagementPage"));
const CameraConfigurationPage = lazy(() => import("@/pages/CameraConfigurationPage"));
const SettingsPage = lazy(() => import("@/pages/SettingsPage"));

// Keep the store inventory screen out of the public build, even if both flags are set.
const StoreInventoryPage = import.meta.env.VITE_PUBLIC_DEMO !== "1" && import.meta.env.VITE_STORE_INVENTORY === "1"
  ? lazy(() => import("@/pages/StoreInventoryPage"))
  : null;

const createRouter = PUBLIC_DEMO ? createHashRouter : createBrowserRouter;

export const router = createRouter([
  ...(StoreInventoryPage
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
        element: PUBLIC_DEMO ? undefined : <RequireOnboarding />,
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
