import { useEffect, useState } from "react";
import { Link } from "react-router";
import { toast } from "sonner";
import { UploadCloud } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { EmptyState } from "@/components/shared/EmptyState";
import { ProcessingStatusBadge } from "@/components/shared/StatusBadge";
import { useAppStore } from "@/store/useAppStore";
import { cameraLabel } from "@/services/analyticsService";
import type { Camera } from "@/types";
import { formatDate } from "@/utils/formatters";

export function AssignVideoDialog({
  camera,
  open,
  onOpenChange,
}: {
  camera: Camera | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const videos = useAppStore((s) => s.videos);
  const cameras = useAppStore((s) => s.cameras);
  const dateFormat = useAppStore((s) => s.settings.dateFormat);
  const assign = useAppStore((s) => s.assignVideoToCamera);
  const [videoId, setVideoId] = useState<string>("");

  useEffect(() => {
    if (open) setVideoId(camera?.videoId ?? "");
  }, [open, camera]);

  if (!camera) return null;
  const selected = videos.find((v) => v.id === videoId);
  const owner = selected?.cameraId && selected.cameraId !== camera.id ? cameras.find((c) => c.id === selected.cameraId) : null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Assign video to {cameraLabel(camera)}</DialogTitle>
          <DialogDescription>Choose the uploaded footage this camera's aisle regions should be analysed from (simulated).</DialogDescription>
        </DialogHeader>
        {videos.length === 0 ? (
          <EmptyState
            icon={UploadCloud}
            title="No uploaded videos"
            description="Upload an MP4 recording in Data Management, then assign it here."
            action={
              <Button asChild size="sm">
                <Link to="/data?tab=video" onClick={() => onOpenChange(false)}>
                  Go to Video Data
                </Link>
              </Button>
            }
          />
        ) : (
          <div className="grid gap-3">
            <div className="grid gap-1.5">
              <Label htmlFor="assign-video-select">Video</Label>
              <Select value={videoId || undefined} onValueChange={setVideoId}>
                <SelectTrigger id="assign-video-select">
                  <SelectValue placeholder="Select a video" />
                </SelectTrigger>
                <SelectContent>
                  {videos.map((v) => (
                    <SelectItem key={v.id} value={v.id}>
                      {v.fileName}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            {selected && (
              <div className="rounded-lg border border-border bg-muted/40 p-3 text-sm">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <span className="text-muted-foreground">Recorded {formatDate(selected.recordingDate, dateFormat)}</span>
                  <ProcessingStatusBadge status={selected.status} />
                </div>
                {owner && (
                  <p className="mt-2 text-xs text-warning-text">
                    This video is currently assigned to {cameraLabel(owner)}. Assigning it here moves it to this camera.
                  </p>
                )}
              </div>
            )}
          </div>
        )}
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          {videos.length > 0 && (
            <Button
              disabled={!videoId}
              onClick={() => {
                assign(videoId, camera.id);
                toast.success("Video assigned", { description: `${selected?.fileName} is now the footage source for ${cameraLabel(camera)}.` });
                onOpenChange(false);
              }}
            >
              Assign video
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
