import { ArrowLeft, ArrowRight, BarChart3, Boxes, Building2, CheckCircle2, Video } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAppStore } from "@/store/useAppStore";

export function CompleteStep({ onBack, onFinish }: { onBack: () => void; onFinish: () => void }) {
  const store = useAppStore((s) => s.store);
  const cameras = useAppStore((s) => s.cameras);
  const videos = useAppStore((s) => s.videos);
  const onboarding = useAppStore((s) => s.onboarding);
  const lastBatch = useAppStore((s) => s.importBatches[0]);
  const productCount = useAppStore((s) => s.products.length);
  const covered = useAppStore((s) => s.aisles.filter((a) => a.kind === "aisle" && a.cameraId && s.cameras.some((c) => c.id === a.cameraId)).length);
  const totalAisles = useAppStore((s) => s.aisles.filter((a) => a.kind === "aisle").length);

  const items = [
    {
      icon: Building2,
      title: "Store configured",
      body: `${store.name} · ${store.type} · ${store.location}`,
    },
    {
      icon: Video,
      title: "Camera sources added",
      body: `${cameras.length} camera${cameras.length === 1 ? "" : "s"} · ${videos.filter((v) => cameras.some((c) => c.id === v.cameraId)).length} video source(s) · ${covered} of ${totalAisles} aisles covered`,
    },
    {
      icon: Boxes,
      title: onboarding.csvImported ? "Inventory data imported" : "Demo inventory loaded",
      body: onboarding.csvImported && lastBatch ? `${lastBatch.fileName} · ${productCount} products in inventory` : `${productCount} demo products with 12 months of simulated sales history`,
    },
    {
      icon: BarChart3,
      title: "Analytics dashboard ready",
      body: "Aisle traffic, inventory alerts and simulated demand forecasts are available.",
    },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4 rounded-xl border border-success/25 bg-success-soft p-5">
        <span className="flex size-12 shrink-0 items-center justify-center rounded-full bg-success text-white">
          <CheckCircle2 className="size-6" aria-hidden="true" />
        </span>
        <div>
          <p className="text-base font-semibold">Your store is set up</p>
          <p className="text-sm text-muted-foreground">Everything below is saved in this browser. You can change it any time from Settings or Cameras & Aisles.</p>
        </div>
      </div>
      <ul className="grid gap-3 sm:grid-cols-2" aria-label="Setup summary">
        {items.map((it) => (
          <li key={it.title} className="flex gap-3 rounded-xl border border-border bg-card p-4">
            <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-primary-soft text-primary-soft-foreground">
              <it.icon className="size-4" aria-hidden="true" />
            </span>
            <div className="min-w-0">
              <p className="flex items-center gap-1.5 text-sm font-semibold">
                <CheckCircle2 className="size-3.5 text-success-text" aria-hidden="true" />
                {it.title}
              </p>
              <p className="mt-0.5 text-[13px] text-muted-foreground">{it.body}</p>
            </div>
          </li>
        ))}
      </ul>
      <p className="text-xs text-muted-foreground">
        Analytics shown in the dashboard are simulated demo data. Video analysis (YOLO26 + ByteTrack) and forecasting models (Chronos-2, TimesFM
        2.5) will be connected in Milestone 4.
      </p>
      <div className="flex flex-col-reverse gap-2 border-t border-border pt-5 sm:flex-row sm:justify-between">
        <Button variant="outline" onClick={onBack}>
          <ArrowLeft /> Back
        </Button>
        <Button size="lg" onClick={onFinish}>
          Go to Dashboard <ArrowRight />
        </Button>
      </div>
    </div>
  );
}
