import { Suspense, useEffect, useRef, useState } from "react";
import { Outlet, useLocation } from "react-router";
import { FlaskConical } from "lucide-react";
import { Sidebar } from "./Sidebar";
import { Header } from "./Header";
import { PageLoading } from "@/components/shared/LoadingState";
import { NAV_ITEMS } from "@/config/navigation";
import { BRAND } from "@/config/brand";
import { PUBLIC_DEMO } from "@/config/demo";
import { resumeProcessingJobs } from "@/services/mockApi";

const COLLAPSE_KEY = "ri-sidebar-collapsed";

export function AppLayout() {
  const location = useLocation();
  const mainRef = useRef<HTMLElement>(null);
  const [collapsed, setCollapsed] = useState(() => {
    try {
      return localStorage.getItem(COLLAPSE_KEY) === "1";
    } catch {
      return false;
    }
  });
  const prevPath = useRef(location.pathname);

  useEffect(() => {
    resumeProcessingJobs();
  }, []);

  // Route change: update the document title and move focus to the main region for screen-reader users.
  useEffect(() => {
    const item = NAV_ITEMS.find((n) => location.pathname.startsWith(n.to));
    document.title = `${item?.description ?? "Page"} · ${BRAND.name}`;
    if (prevPath.current === location.pathname) return; // initial load (and StrictMode re-run): leave focus alone
    prevPath.current = location.pathname;
    mainRef.current?.focus({ preventScroll: true });
    window.scrollTo({ top: 0 });
  }, [location.pathname]);

  const toggle = () =>
    setCollapsed((c) => {
      try {
        localStorage.setItem(COLLAPSE_KEY, c ? "0" : "1");
      } catch {
        /* ignore */
      }
      return !c;
    });

  return (
    <div className="flex min-h-dvh bg-background">
      <a
        href={PUBLIC_DEMO ? `#${location.pathname}${location.search}#main-content` : "#main-content"}
        onClick={(event) => {
          if (!PUBLIC_DEMO || event.altKey || event.ctrlKey || event.metaKey || event.shiftKey) return;
          event.preventDefault();
          // Changing the fragment directly would replace the route on static hosting.
          mainRef.current?.focus({ preventScroll: true });
          mainRef.current?.scrollIntoView();
        }}
        className="sr-only z-50 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground focus:not-sr-only focus:fixed focus:top-3 focus:left-3"
      >
        Skip to main content
      </a>
      <Sidebar collapsed={collapsed} onToggle={toggle} />
      <div className="flex min-w-0 flex-1 flex-col">
        <Header />
        <div className="flex items-center justify-center gap-1.5 border-b border-warning/30 bg-warning-soft px-4 py-1.5 text-[11.5px] font-medium text-warning-text sm:hidden">
          <FlaskConical className="size-3.5" aria-hidden="true" /> Demo Mode — Simulated Data
        </div>
        <main
          id="main-content"
          ref={mainRef}
          tabIndex={-1}
          className="mx-auto w-full max-w-[1600px] min-w-0 flex-1 scroll-mt-32 overflow-x-clip px-4 py-6 outline-none sm:px-6 lg:px-8 lg:py-8"
        >
          <Suspense fallback={<PageLoading />}>
            <div key={location.pathname} className="page-enter">
              <Outlet />
            </div>
          </Suspense>
        </main>
        <footer className="border-t border-border px-4 py-4 text-center text-xs text-muted-foreground sm:px-8">
          {BRAND.name} · {BRAND.course} · All figures are simulated demo data. No AI inference or camera connection is performed.
        </footer>
      </div>
    </div>
  );
}
