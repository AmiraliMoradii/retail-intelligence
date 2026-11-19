import { useState } from "react";
import { toast } from "sonner";
import { Ban, Eye, Film, Play, RotateCcw, Trash2, VideoOff } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Alert } from "@/components/ui/alert";
import { EmptyState } from "@/components/shared/EmptyState";
import { ProcessingStatusBadge } from "@/components/shared/StatusBadge";
import { ConfirmDialog } from "./ConfirmDialog";
import { useAppStore } from "@/store/useAppStore";
import { cancelVideoProcessing, startVideoProcessing } from "@/services/mockApi";
import { videoRegistry } from "@/services/videoRegistry";
import { cameraLabel } from "@/services/analyticsService";
import { formatBytes, formatDate, formatDateTime } from "@/utils/formatters";
import type { VideoAsset } from "@/types";
import { cn } from "@/lib/utils";

export function VideoLibrary({ highlightId }: { highlightId?: string | null }) {
  const videos = useAppStore((s) => s.videos);
  const cameras = useAppStore((s) => s.cameras);
  const dateFormat = useAppStore((s) => s.settings.dateFormat);
  const updateVideo = useAppStore((s) => s.updateVideo);
  const removeVideo = useAppStore((s) => s.removeVideo);
  const assign = useAppStore((s) => s.assignVideoToCamera);
  const [preview, setPreview] = useState<VideoAsset | null>(null);
  const [toRemove, setToRemove] = useState<VideoAsset | null>(null);

  if (videos.length === 0) {
    return (
      <EmptyState
        icon={VideoOff}
        title="No uploaded videos"
        description="Upload recorded CCTV footage above, assign it to a camera, and start simulated processing."
      />
    );
  }

  const previewUrl = preview ? videoRegistry.get(preview.id) : null;

  return (
    <>
      <ul className="divide-y divide-border" aria-label="Uploaded videos">
        {videos.map((v) => {
          const camera = cameras.find((c) => c.id === v.cameraId);
          return (
            <li key={v.id} className={cn("flex flex-col gap-3 px-5 py-4 lg:flex-row lg:items-center", highlightId === v.id && "bg-primary-soft/50")}>
              <div className="flex min-w-0 flex-1 items-start gap-3">
                <span className="mt-0.5 flex size-9 shrink-0 items-center justify-center rounded-lg bg-muted text-muted-foreground">
                  <Film className="size-4" aria-hidden="true" />
                </span>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="truncate text-sm font-medium" title={v.fileName}>
                      {v.fileName}
                    </p>
                    <ProcessingStatusBadge status={v.status} />
                  </div>
                  <p className="mt-0.5 text-xs text-muted-foreground">
                    {formatBytes(v.sizeBytes)} · {v.durationLabel} · Recorded {formatDate(v.recordingDate, dateFormat)} · Uploaded{" "}
                    {formatDateTime(v.uploadedAt, dateFormat)}
                  </p>
                  {v.status === "processing" ? (
                    <div className="mt-2 flex max-w-md items-center gap-3">
                      <Progress value={v.progress} aria-label={`Processing ${v.fileName}`} className="flex-1" />
                      <span className="w-10 text-right text-xs font-medium tabular">{v.progress}%</span>
                    </div>
                  ) : (
                    v.message && (
                      <p className={cn("mt-1 text-xs", v.status === "failed" ? "text-destructive-text" : "text-muted-foreground")}>{v.message}</p>
                    )
                  )}
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-2 lg:justify-end">
                <Select
                  value={v.cameraId && camera ? v.cameraId : "unassigned"}
                  onValueChange={(val) => {
                    const next = val === "unassigned" ? null : val;
                    assign(v.id, next);
                    const c = cameras.find((x) => x.id === next);
                    toast.success(c ? "Video assigned" : "Video unassigned", {
                      description: c ? `${v.fileName} → ${cameraLabel(c)}` : `${v.fileName} is no longer assigned to a camera.`,
                    });
                  }}
                >
                  <SelectTrigger size="sm" className="w-[13.5rem]" aria-label={`Camera for ${v.fileName}`}>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="unassigned">Unassigned</SelectItem>
                    {cameras.map((c) => (
                      <SelectItem key={c.id} value={c.id}>
                        {cameraLabel(c)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {v.status === "ready" && (
                  <Button size="sm" onClick={() => startVideoProcessing(v.id)}>
                    <Play /> Start processing
                  </Button>
                )}
                {v.status === "failed" && (
                  <Button size="sm" variant="outline" onClick={() => startVideoProcessing(v.id)}>
                    <RotateCcw /> Retry
                  </Button>
                )}
                {v.status === "processing" && (
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => {
                      cancelVideoProcessing(v.id);
                      updateVideo(v.id, { status: "ready", progress: 0, message: "Processing cancelled. Start again when ready." });
                    }}
                  >
                    <Ban /> Cancel
                  </Button>
                )}
                <Button size="icon-sm" variant="ghost" aria-label={`Preview ${v.fileName}`} onClick={() => setPreview(v)}>
                  <Eye />
                </Button>
                <Button size="icon-sm" variant="ghost" aria-label={`Remove ${v.fileName}`} onClick={() => setToRemove(v)}>
                  <Trash2 />
                </Button>
              </div>
            </li>
          );
        })}
      </ul>

      <Dialog open={Boolean(preview)} onOpenChange={(o) => !o && setPreview(null)}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle className="truncate pr-4">{preview?.fileName}</DialogTitle>
            <DialogDescription>
              {preview && (
                <>
                  Recorded {formatDate(preview.recordingDate, dateFormat)} ·{" "}
                  {preview.cameraId ? cameraLabel(cameras.find((c) => c.id === preview.cameraId) ?? { id: preview.cameraId, name: "Removed camera" }) : "Unassigned"}
                </>
              )}
            </DialogDescription>
          </DialogHeader>
          {previewUrl ? (
            <video src={previewUrl} controls className="aspect-video w-full rounded-lg bg-slate-950 object-contain" aria-label={`Preview of ${preview?.fileName}`} />
          ) : (
            <Alert variant="info" title="Preview unavailable">
              Preview unavailable — demo fixture or page was refreshed; files are never stored by the prototype. Re-upload the file to preview it.
            </Alert>
          )}
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        open={Boolean(toRemove)}
        onOpenChange={(o) => !o && setToRemove(null)}
        title="Remove this video?"
        description={
          toRemove
            ? `${toRemove.fileName} will be removed from the video list${toRemove.cameraId ? " and unassigned from its camera" : ""}. This only affects the local demo data.`
            : undefined
        }
        confirmLabel={
          <>
            <Trash2 /> Remove video
          </>
        }
        destructive
        onConfirm={() => {
          if (!toRemove) return;
          cancelVideoProcessing(toRemove.id);
          videoRegistry.remove(toRemove.id);
          removeVideo(toRemove.id);
          toast.success("Video removed", { description: toRemove.fileName });
        }}
      />
    </>
  );
}
