import { useEffect, useRef } from "react";
import { useNavigate } from "react-router";
import { toast } from "sonner";
import { FlaskConical, LogOut } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { BrandMark } from "@/components/layout/BrandMark";
import { Stepper } from "@/components/onboarding/Stepper";
import { StoreInfoStep } from "@/components/onboarding/StoreInfoStep";
import { CameraSetupStep } from "@/components/onboarding/CameraSetupStep";
import { InventoryStep } from "@/components/onboarding/InventoryStep";
import { CompleteStep } from "@/components/onboarding/CompleteStep";
import { BRAND } from "@/config/brand";
import { useAppStore } from "@/store/useAppStore";
import { useAuthStore } from "@/store/useAuthStore";

const STEPS = [
  { title: "Store information", hint: "Name, type, size", description: "Tell us about the store you want to analyse." },
  { title: "Camera setup", hint: "Cameras and sample footage", description: "Add the cameras whose footage will power aisle analytics." },
  { title: "Inventory data", hint: "Import a sales CSV", description: "Import historical sales and ordering records to enable forecasting." },
  { title: "Complete setup", hint: "Review and finish", description: "Review your configuration before opening the dashboard." },
];

export default function OnboardingPage() {
  const navigate = useNavigate();
  const onboarding = useAppStore((s) => s.onboarding);
  const setOnboarding = useAppStore((s) => s.setOnboarding);
  const completeOnboarding = useAppStore((s) => s.completeOnboarding);
  const skipOnboarding = useAppStore((s) => s.skipOnboarding);
  const signOut = useAuthStore((s) => s.signOut);
  const headingRef = useRef<HTMLHeadingElement>(null);
  const prevStep = useRef<number | null>(null);

  const step = Math.min(onboarding.step, STEPS.length - 1);
  // Highest step the user may jump to (progress is persisted, so refresh resumes here).
  const maxReached = Math.min(STEPS.length - 1, Math.max(step, onboarding.maxStep ?? 0));

  useEffect(() => {
    document.title = `Store setup · Step ${step + 1} of ${STEPS.length} · ${BRAND.name}`;
    if (prevStep.current === null || prevStep.current === step) {
      prevStep.current = step;
      return;
    }
    prevStep.current = step;
    headingRef.current?.focus();
  }, [step]);

  const go = (i: number) => setOnboarding({ step: i });

  const finish = () => {
    completeOnboarding();
    try {
      localStorage.removeItem("ri-onboarding-store-draft");
    } catch {
      /* ignore */
    }
    toast.success("Setup complete", { description: "Welcome to your store overview." });
    navigate("/overview", { replace: true });
  };

  return (
    <div className="min-h-dvh bg-background">
      <header className="border-b border-border bg-card">
        <div className="mx-auto flex h-16 max-w-6xl items-center gap-3 px-4 sm:px-6">
          <BrandMark />
          <span className="ml-auto hidden items-center gap-1.5 rounded-full border border-warning/30 bg-warning-soft px-2.5 py-1 text-[11px] font-semibold text-warning-text uppercase sm:inline-flex">
            <FlaskConical className="size-3.5" aria-hidden="true" /> Demo Mode — Simulated Data
          </span>
          <Button
            variant="ghost"
            size="sm"
            className="ml-auto sm:ml-0"
            onClick={() => {
              skipOnboarding();
              toast("Setup skipped", { description: "The demo store configuration is loaded." });
              navigate("/overview", { replace: true });
            }}
          >
            Skip setup
          </Button>
          <Button
            variant="ghost"
            size="icon-sm"
            aria-label="Sign out"
            onClick={() => {
              signOut();
              navigate("/login", { replace: true });
            }}
          >
            <LogOut />
          </Button>
        </div>
      </header>

      <main className="mx-auto grid max-w-6xl gap-6 px-4 py-6 sm:px-6 lg:grid-cols-[260px_minmax(0,1fr)] lg:py-10">
        <div className="space-y-4">
          <div className="hidden lg:block">
            <p className="text-xs font-semibold tracking-wider text-subtle uppercase">Store setup</p>
            <p className="mt-1 text-sm text-muted-foreground">About 3 minutes. Progress is saved automatically.</p>
          </div>
          <Stepper steps={STEPS} current={step} maxReached={maxReached} onSelect={go} />
        </div>

        <Card className="p-5 sm:p-8">
          <p className="text-xs font-semibold tracking-wide text-primary uppercase">
            Step {step + 1} of {STEPS.length}
          </p>
          <h1 ref={headingRef} tabIndex={-1} className="mt-1 text-page-title outline-none">
            {STEPS[step].title}
          </h1>
          <p className="mt-1 mb-6 text-sm text-muted-foreground">{STEPS[step].description}</p>

          {step === 0 && (
            <StoreInfoStep
              onDone={() => {
                toast.success("Store created", { description: "Store information saved." });
                go(1);
              }}
            />
          )}
          {step === 1 && <CameraSetupStep onBack={() => go(0)} onDone={() => go(2)} />}
          {step === 2 && <InventoryStep onBack={() => go(1)} onDone={() => go(3)} />}
          {step === 3 && <CompleteStep onBack={() => go(2)} onFinish={finish} />}
        </Card>
      </main>
    </div>
  );
}
