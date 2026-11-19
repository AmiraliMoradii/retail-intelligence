import { useState } from "react";
import { toast } from "sonner";
import { Bell, FileSpreadsheet, RotateCcw, TrendingUp, Trash2, Video } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/cameras/ConfirmDialog";
import { ResetDemoDialog } from "@/components/shared/ResetDemoDialog";
import { useAppStore } from "@/store/useAppStore";
import { cancelVideoProcessing } from "@/services/mockApi";
import { videoRegistry } from "@/services/videoRegistry";

interface Control {
  id: string;
  icon: LucideIcon;
  title: string;
  description: string;
  confirmTitle: string;
  confirmBody: string;
  count: number;
  run: () => void;
  success: string;
}

export function DataDeletionControls() {
  const importBatches = useAppStore((s) => s.importBatches);
  const videos = useAppStore((s) => s.videos);
  const forecastHistory = useAppStore((s) => s.forecastHistory);
  const notifications = useAppStore((s) => s.notifications);
  const clearImportedInventory = useAppStore((s) => s.clearImportedInventory);
  const clearVideos = useAppStore((s) => s.clearVideos);
  const clearForecastHistory = useAppStore((s) => s.clearForecastHistory);
  const clearNotifications = useAppStore((s) => s.clearNotifications);
  const [pending, setPending] = useState<Control | null>(null);
  const [resetOpen, setResetOpen] = useState(false);

  const controls: Control[] = [
    {
      id: "imports",
      icon: FileSpreadsheet,
      title: "Clear imported inventory data",
      description: "Removes CSV records imported in this browser and restores the demo inventory.",
      confirmTitle: "Clear imported inventory data?",
      confirmBody: "Imported CSV records and import history are deleted from this browser. Products return to the original demo dataset.",
      count: importBatches.length,
      run: clearImportedInventory,
      success: "Imported inventory data cleared",
    },
    {
      id: "videos",
      icon: Video,
      title: "Clear uploaded video records",
      description: "Removes all video entries and camera assignments. Cameras will show “No footage”.",
      confirmTitle: "Clear uploaded video records?",
      confirmBody: "All video records (including demo fixtures) are removed and cameras are unassigned. Video files were never stored by the prototype.",
      count: videos.length,
      run: () => {
        for (const v of videos) {
          cancelVideoProcessing(v.id);
          videoRegistry.remove(v.id);
        }
        clearVideos();
      },
      success: "Uploaded video records cleared",
    },
    {
      id: "forecasts",
      icon: TrendingUp,
      title: "Clear forecast history",
      description: "Deletes the list of previously generated simulated forecasts.",
      confirmTitle: "Clear forecast history?",
      confirmBody: "The forecast history table will be emptied. Products and inventory are not affected.",
      count: forecastHistory.length,
      run: clearForecastHistory,
      success: "Forecast history cleared",
    },
    {
      id: "notifications",
      icon: Bell,
      title: "Clear notifications",
      description: "Removes all notifications from the bell menu.",
      confirmTitle: "Clear all notifications?",
      confirmBody: "All notifications are deleted from this browser.",
      count: notifications.length,
      run: clearNotifications,
      success: "Notifications cleared",
    },
  ];

  return (
    <>
      <ul className="divide-y divide-border rounded-lg border border-border">
        {controls.map((c) => (
          <li key={c.id} className="flex flex-col gap-3 px-4 py-3 sm:flex-row sm:items-center">
            <c.icon className="hidden size-4 shrink-0 text-muted-foreground sm:block" aria-hidden="true" />
            <div className="min-w-0 flex-1">
              <p className="text-sm font-medium">{c.title}</p>
              <p className="text-xs text-muted-foreground">
                {c.description} <span className="tabular">({c.count} stored)</span>
              </p>
            </div>
            <Button variant="outline" size="sm" disabled={c.count === 0} onClick={() => setPending(c)} aria-label={`${c.title} (${c.count} stored)`}>
              <Trash2 /> Clear
            </Button>
          </li>
        ))}
        <li className="flex flex-col gap-3 px-4 py-3 sm:flex-row sm:items-center">
          <RotateCcw className="hidden size-4 shrink-0 text-destructive-text sm:block" aria-hidden="true" />
          <div className="min-w-0 flex-1">
            <p className="text-sm font-medium">Reset all demo data</p>
            <p className="text-xs text-muted-foreground">Restores the original simulated store, cameras, regions, inventory and forecasts.</p>
          </div>
          <Button variant="destructive" size="sm" onClick={() => setResetOpen(true)}>
            <RotateCcw /> Reset demo data
          </Button>
        </li>
      </ul>

      <ConfirmDialog
        open={Boolean(pending)}
        onOpenChange={(o) => !o && setPending(null)}
        title={pending?.confirmTitle ?? ""}
        description={pending?.confirmBody}
        confirmLabel={
          <>
            <Trash2 /> Clear
          </>
        }
        destructive
        onConfirm={() => {
          if (!pending) return;
          pending.run();
          toast.success(pending.success, { description: "Only local demo data in this browser was affected." });
        }}
      />
      <ResetDemoDialog open={resetOpen} onOpenChange={setResetOpen} />
    </>
  );
}
