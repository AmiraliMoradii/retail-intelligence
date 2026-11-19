import { RotateCcw } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useAppStore } from "@/store/useAppStore";

export function ResetDemoDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (open: boolean) => void }) {
  const resetDemoData = useAppStore((s) => s.resetDemoData);
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Reset demo data?</DialogTitle>
          <DialogDescription>
            This restores the original simulated store, cameras, aisle regions, inventory and forecasts. Imported CSV records and
            uploaded video entries in this browser are removed. Your display settings are kept.
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            variant="destructive"
            onClick={() => {
              resetDemoData();
              onOpenChange(false);
              toast.success("Demo data reset", { description: "All simulated data is back to its original state." });
            }}
          >
            <RotateCcw /> Reset demo data
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
