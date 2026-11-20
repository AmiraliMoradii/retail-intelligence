import { useEffect, useRef } from "react";
import { useLocation, useNavigate } from "react-router";
import { BrandMark } from "@/components/layout/BrandMark";
import { Button } from "@/components/ui/button";
import { BRAND } from "@/config/brand";
import { DEMO_USER } from "@/data/mockStore";
import { useAppStore } from "@/store/useAppStore";
import { useAuthStore } from "@/store/useAuthStore";

export default function PublicDemoPage() {
  const location = useLocation();
  const navigate = useNavigate();
  const openButton = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    document.title = `Sample store · ${BRAND.name}`;
    openButton.current?.focus();
  }, []);

  function openSampleStore() {
    useAppStore.getState().skipOnboarding();
    useAuthStore.getState().signIn(DEMO_USER, true);
    const from = (location.state as { from?: string } | null)?.from;
    navigate(from ?? "/overview", { replace: true });
  }

  return (
    <main className="grid min-h-dvh place-items-center bg-background px-5 py-10">
      <div className="w-full max-w-lg rounded-xl border border-border bg-card p-6 shadow-sm sm:p-8">
        <BrandMark />
        <h1 className="mt-6 text-page-title">Explore the sample store</h1>
        <p className="mt-2 text-base text-muted-foreground">
          Try grocery inventory imports, sales history, and reorder calculations with sample data.
        </p>
        <Button ref={openButton} className="mt-5" size="lg" onClick={openSampleStore}>
          Open sample store
        </Button>
        <p className="mt-4 text-sm text-muted-foreground">
          No account is required. Changes are saved in this browser. Use the bundled samples.
        </p>
      </div>
    </main>
  );
}
