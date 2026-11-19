import { Link } from "react-router";
import { Film, MapPin, Pencil, Video } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { CoverageBadge, ProcessingStatusBadge } from "@/components/shared/StatusBadge";
import { CameraStatusBadge } from "./CameraStatusBadge";
import { useAppStore } from "@/store/useAppStore";
import { cameraLabel } from "@/services/analyticsService";
import { cameraStatus, SOURCE_TYPE_LABEL } from "@/utils/cameras";
import { formatBytes, formatDate, formatDateTime } from "@/utils/formatters";
import type { Camera } from "@/types";

export function CameraDetailsSheet({
  camera,
  open,
  onOpenChange,
  onEdit,
  onAssignVideo,
}: {
  camera: Camera | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onEdit: (camera: Camera) => void;
  onAssignVideo: (camera: Camera) => void;
}) {
  const videos = useAppStore((s) => s.videos);
  const aisles = useAppStore((s) => s.aisles);
  const dateFormat = useAppStore((s) => s.settings.dateFormat);
  if (!camera) return null;
  const status = cameraStatus(camera, videos);
  const covered = aisles.filter((a) => a.cameraId === camera.id);
  const footage = videos.filter((v) => v.cameraId === camera.id);

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent>
        <SheetHeader>
          <p className="text-xs font-semibold tracking-wide text-muted-foreground uppercase">{camera.id.toUpperCase()}</p>
          <SheetTitle>{camera.name}</SheetTitle>
          <SheetDescription>{camera.description || "No description provided."}</SheetDescription>
        </SheetHeader>
        <div className="flex-1 space-y-6 overflow-y-auto px-6 py-5">
          <dl className="grid grid-cols-[8rem_1fr] gap-x-4 gap-y-3 text-sm">
            <dt className="text-muted-foreground">Status</dt>
            <dd>
              <CameraStatusBadge status={status} />
            </dd>
            <dt className="text-muted-foreground">Store area</dt>
            <dd className="flex items-center gap-1.5">
              <MapPin className="size-3.5 text-muted-foreground" aria-hidden="true" />
              {camera.area}
            </dd>
            <dt className="text-muted-foreground">Source type</dt>
            <dd>{SOURCE_TYPE_LABEL[camera.sourceType]}</dd>
            <dt className="text-muted-foreground">Last updated</dt>
            <dd>{formatDateTime(camera.updatedAt, dateFormat)}</dd>
          </dl>

          <section aria-labelledby="camera-coverage-heading">
            <h3 id="camera-coverage-heading" className="text-card-title">
              Aisle coverage
            </h3>
            {covered.length === 0 ? (
              <p className="mt-2 text-sm text-muted-foreground">
                No aisle regions are assigned to this camera, so it does not contribute to aisle analytics.
              </p>
            ) : (
              <ul className="mt-2 divide-y divide-border rounded-lg border border-border">
                {covered.map((a) => (
                  <li key={a.id} className="flex items-center justify-between gap-3 px-3 py-2 text-sm">
                    <span className="font-medium">{a.name}</span>
                    <CoverageBadge coverage={a.coverage} />
                  </li>
                ))}
              </ul>
            )}
          </section>

          <section aria-labelledby="camera-footage-heading">
            <h3 id="camera-footage-heading" className="text-card-title">
              Footage
            </h3>
            {footage.length === 0 ? (
              <p className="mt-2 text-sm text-muted-foreground">No uploaded videos are assigned to this camera.</p>
            ) : (
              <ul className="mt-2 space-y-2">
                {footage.map((v) => (
                  <li key={v.id} className="flex items-start gap-3 rounded-lg border border-border px-3 py-2.5">
                    <Film className="mt-0.5 size-4 shrink-0 text-muted-foreground" aria-hidden="true" />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium">{v.fileName}</p>
                      <p className="text-xs text-muted-foreground">
                        Recorded {formatDate(v.recordingDate, dateFormat)} · {formatBytes(v.sizeBytes)}
                        {camera.videoId === v.id && " · Current source"}
                      </p>
                    </div>
                    <ProcessingStatusBadge status={v.status} />
                  </li>
                ))}
              </ul>
            )}
            <p className="mt-3 text-xs text-muted-foreground">
              Track IDs from this camera are temporary and camera-local; the same shopper is not matched across cameras.
            </p>
          </section>
        </div>
        <div className="flex flex-wrap gap-2 border-t border-border px-6 py-4">
          <Button variant="outline" onClick={() => onEdit(camera)}>
            <Pencil /> Edit camera
          </Button>
          <Button variant="outline" onClick={() => onAssignVideo(camera)}>
            <Video /> Assign video
          </Button>
          <Button variant="link" asChild className="ml-auto">
            <Link to="/data?tab=video" onClick={() => onOpenChange(false)}>
              Manage videos
            </Link>
          </Button>
        </div>
        <span className="sr-only">{cameraLabel(camera)}</span>
      </SheetContent>
    </Sheet>
  );
}
