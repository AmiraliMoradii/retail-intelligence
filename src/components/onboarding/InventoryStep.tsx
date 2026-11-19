import { toast } from "sonner";
import { ArrowLeft, ArrowRight, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { CSVUploader } from "@/components/uploads/CSVUploader";
import { REQUIRED_COLUMNS, OPTIONAL_COLUMNS } from "@/services/csvService";
import { useAppStore } from "@/store/useAppStore";

export function InventoryStep({ onBack, onDone }: { onBack: () => void; onDone: () => void }) {
  const importInventory = useAppStore((s) => s.importInventory);
  const setOnboarding = useAppStore((s) => s.setOnboarding);
  const pushNotification = useAppStore((s) => s.pushNotification);
  const imported = useAppStore((s) => s.onboarding.csvImported);
  const lastBatch = useAppStore((s) => s.importBatches[0]);
  const productCount = useAppStore((s) => s.products.length);

  return (
    <div className="space-y-5">
      <div className="grid gap-4 rounded-xl border border-border bg-muted/40 p-4 text-sm sm:grid-cols-2">
        <div>
          <p className="font-semibold">Required columns</p>
          <ul className="mt-1.5 flex flex-wrap gap-1.5">
            {REQUIRED_COLUMNS.map((c) => (
              <li key={c} className="rounded-md border border-border bg-card px-1.5 py-0.5 font-mono text-[11.5px]">
                {c}
              </li>
            ))}
          </ul>
        </div>
        <div>
          <p className="font-semibold">Optional columns</p>
          <ul className="mt-1.5 flex flex-wrap gap-1.5">
            {OPTIONAL_COLUMNS.map((c) => (
              <li key={c} className="rounded-md border border-dashed border-border bg-card px-1.5 py-0.5 font-mono text-[11.5px] text-muted-foreground">
                {c}
              </li>
            ))}
          </ul>
        </div>
        <p className="text-xs text-muted-foreground sm:col-span-2">
          One row per product per period (daily, weekly or monthly). Records are aggregated by month. Files are parsed in your browser and
          stored only in this browser's local storage.
        </p>
      </div>

      <CSVUploader
        confirmLabel="Confirm import"
        onImport={(result) => {
          const batch = importInventory(result.fileName, result.records);
          setOnboarding({ csvImported: true, csvSkipped: false });
          toast.success("Inventory data imported successfully.", {
            description: `${batch.rowCount} records · ${batch.productIds.length} products updated or added.`,
          });
          pushNotification({
            kind: "inventory",
            title: "Inventory data imported",
            body: `${result.fileName}: ${batch.rowCount} records for ${batch.productIds.length} products.`,
            href: "/inventory?imported=1",
          });
        }}
        successActions={
          <Button size="sm" onClick={onDone}>
            Continue <ArrowRight />
          </Button>
        }
      />

      {imported && lastBatch && (
        <p className="flex items-center gap-2 text-sm text-success-text">
          <CheckCircle2 className="size-4" aria-hidden="true" /> Last import: {lastBatch.fileName} ({lastBatch.rowCount} records). Inventory now
          has {productCount} products.
        </p>
      )}

      <div className="flex flex-col-reverse gap-2 border-t border-border pt-5 sm:flex-row sm:justify-between">
        <Button variant="outline" onClick={onBack}>
          <ArrowLeft /> Back
        </Button>
        <div className="flex flex-col gap-2 sm:flex-row">
          {!imported && (
            <Button
              variant="ghost"
              onClick={() => {
                setOnboarding({ csvSkipped: true });
                onDone();
              }}
            >
              Skip — use demo inventory
            </Button>
          )}
          <Button onClick={onDone} disabled={!imported}>
            Continue <ArrowRight />
          </Button>
        </div>
      </div>
    </div>
  );
}
