import { Navigate, Outlet, useLocation } from "react-router";
import { useAuthStore } from "@/store/useAuthStore";
import { useAppStore } from "@/store/useAppStore";

export function RequireAuth() {
  const user = useAuthStore((s) => s.user);
  const location = useLocation();
  if (!user) return <Navigate to="/login" replace state={{ from: location.pathname + location.search }} />;
  return <Outlet />;
}

/** Sends first-time users through store setup before the dashboard. */
export function RequireOnboarding() {
  const completed = useAppStore((s) => s.onboarding.completed);
  if (!completed) return <Navigate to="/onboarding" replace />;
  return <Outlet />;
}

export function RedirectIfAuthed() {
  const user = useAuthStore((s) => s.user);
  const completed = useAppStore((s) => s.onboarding.completed);
  if (user) return <Navigate to={completed ? "/overview" : "/onboarding"} replace />;
  return <Outlet />;
}
