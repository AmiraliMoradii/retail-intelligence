import { useRef, useState } from "react";
import { Controller, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import { ArrowLeft, ArrowRight, Camera as CameraIcon, Film, Play, Plus, Trash2, UploadCloud, Video } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { STORE_AREAS } from "@/data/mockCameras";
import { DEMO_TODAY } from "@/data/mockStore";
import { useAppStore } from "@/store/useAppStore";
import { videoRegistry } from "@/services/videoRegistry";
import { formatBytes } from "@/utils/formatters";
import { uid } from "@/utils/random";
import { format } from "date-fns";
import type { Camera } from "@/types";

const MAX_VIDEO_BYTES = 2 * 1024 ** 3;

const schema = z.object({
  name: z.string().trim().min(1, "Camera name is required.").max(60, "Use 60 characters or fewer."),
  area: z.string().min(1, "Select a store area."),
});
type Values = z.infer<typeof schema>;

export function CameraSetupStep({ onBack, onDone }: { onBack: () => void; onDone: () => void }) {
  const cameras = useAppStore((s) => s.cameras);
  const videos = useAppStore((s) => s.videos);
  const plannedCount = useAppStore((s) => s.store.cameraCount);
  const addCamera = useAppStore((s) => s.addCamera);
  const removeCamera = useAppStore((s) => s.removeCamera);
  const addVideo = useAppStore((s) => s.addVideo);
  const assignVideoToCamera = useAppStore((s) => s.assignVideoToCamera);
  const [showForm, setShowForm] = useState(false);
  const [stepError, setStepError] = useState<string | null>(null);
  const [videoError, setVideoError] = useState<{ cameraId: string; message: string } | null>(null);
  const [preview, setPreview] = useState<{ url: string | null; name: string } | null>(null);
  const fileInputs = useRef<Record<string, HTMLInputElement | null>>({});

  const {
    register,
    control,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<Values>({ resolver: zodResolver(schema), defaultValues: { name: "", area: "" } });

  const onAdd = (v: Values) => {
    const cam = addCamera({ name: v.name, area: v.area, description: "", sourceType: "uploaded_video" });
    toast.success("Camera added", { description: `${cam.id.toUpperCase()} · ${cam.name} (simulated source)` });
    reset();
    setShowForm(false);
    setStepError(null);
  };

  const onVideo = (camera: Camera, file: File | undefined) => {
    if (!file) return;
    if (!/\.mp4$/i.test(file.name) && file.type !== "video/mp4") {
      setVideoError({ cameraId: camera.id, message: "Unsupported video format. Please upload an MP4 file." });
      return;
    }
    if (file.size > MAX_VIDEO_BYTES) {
      setVideoError({ cameraId: camera.id, message: "This video is larger than 2 GB. Please trim it and try again." });
      return;
    }
    setVideoError(null);
    const id = uid("vid");
    videoRegistry.set(id, file);
    addVideo({
      id,
      fileName: file.name,
      sizeBytes: file.size,
      durationLabel: "—",
      cameraId: camera.id,
      recordingDate: format(DEMO_TODAY, "yyyy-MM-dd"),
      uploadedAt: new Date().toISOString(),
      status: "ready",
      progress: 0,
      message: "Ready for simulated processing.",
    });
    assignVideoToCamera(id, camera.id);
    toast.success("Sample video added", { description: `${file.name} assigned to ${camera.name}.` });
  };

  const next = () => {
    if (cameras.length === 0) {
      setStepError("Add at least one camera to continue.");
      return;
    }
    onDone();
  };

  return (
    <div className="space-y-5">
      <Alert variant="info" title="Camera connections are simulated in this prototype">
        No CCTV hardware is contacted. Add the cameras you plan to use and, optionally, a short sample video to preview what the platform
        will analyse in Milestone 4.
      </Alert>

      <div className="flex items-center justify-between gap-3">
        <p className="text-sm text-muted-foreground">
          <strong className="text-foreground">{cameras.length}</strong> of {plannedCount} planned camera{plannedCount === 1 ? "" : "s"} added
        </p>
        {!showForm && (
          <Button variant="outline" size="sm" onClick={() => setShowForm(true)}>
            <Plus /> Add camera
          </Button>
        )}
      </div>

      {showForm && (
        <form
          onSubmit={handleSubmit(onAdd)}
          noValidate
          className="grid gap-4 rounded-xl border border-primary/25 bg-primary-soft/40 p-4 sm:grid-cols-[1fr_1fr_auto] sm:items-start"
          aria-label="Add camera"
        >
          <div className="space-y-1.5">
            <Label htmlFor="cam-name">Camera name</Label>
            <Input
              id="cam-name"
              placeholder="e.g. Produce Section"
              autoFocus
              aria-invalid={!!errors.name}
              aria-describedby={errors.name ? "cam-name-error" : undefined}
              {...register("name")}
            />
            {errors.name && (
              <p id="cam-name-error" role="alert" className="text-[13px] text-destructive-text">
                {errors.name.message}
              </p>
            )}
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="cam-area">Store area</Label>
            <Controller
              control={control}
              name="area"
              render={({ field }) => (
                <Select value={field.value} onValueChange={field.onChange}>
                  <SelectTrigger id="cam-area" aria-invalid={!!errors.area} aria-describedby={errors.area ? "cam-area-error" : undefined}>
                    <SelectValue placeholder="Select an area" />
                  </SelectTrigger>
                  <SelectContent>
                    {STORE_AREAS.map((a) => (
                      <SelectItem key={a} value={a}>
                        {a}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            />
            {errors.area && (
              <p id="cam-area-error" role="alert" className="text-[13px] text-destructive-text">
                {errors.area.message}
              </p>
            )}
          </div>
          <div className="flex gap-2 sm:pt-[22px]">
            <Button type="submit">Add</Button>
            <Button
              type="button"
              variant="ghost"
              onClick={() => {
                reset();
                setShowForm(false);
              }}
            >
              Cancel
            </Button>
          </div>
        </form>
      )}

      {cameras.length === 0 ? (
        <div className="flex flex-col items-center rounded-xl border border-dashed border-border px-6 py-10 text-center">
          <CameraIcon className="mb-2 size-6 text-muted-foreground" aria-hidden="true" />
          <p className="text-sm font-semibold">No camera configured</p>
          <p className="mt-1 text-sm text-muted-foreground">Add at least one camera to enable aisle analytics.</p>
          <Button className="mt-4" size="sm" onClick={() => setShowForm(true)}>
            <Plus /> Add camera
          </Button>
        </div>
      ) : (
        <ul className="divide-y divide-border overflow-hidden rounded-xl border border-border bg-card" aria-label="Configured cameras">
          {cameras.map((cam, i) => {
            const camVideos = videos.filter((v) => v.cameraId === cam.id);
            const latest = camVideos[0];
            const url = latest ? videoRegistry.get(latest.id) : null;
            return (
              <li key={cam.id} className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center">
                <div className="flex min-w-0 flex-1 items-center gap-3">
                  <span className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-muted text-muted-foreground">
                    <Video className="size-4.5" aria-hidden="true" />
                  </span>
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold">
                      Camera {String(i + 1).padStart(2, "0")} — {cam.name}
                    </p>
                    <p className="truncate text-xs text-muted-foreground">
                      {cam.id.toUpperCase()} · {cam.area}
                    </p>
                    <p className="mt-1 flex min-w-0 items-center gap-1.5 text-xs text-muted-foreground">
                      {latest ? (
                        <>
                          <Film className="size-3.5 shrink-0" aria-hidden="true" />
                          <span className="min-w-0 truncate">{latest.fileName}</span>
                          {latest.sizeBytes > 0 && <span className="shrink-0">· {formatBytes(latest.sizeBytes)}</span>}
                          {latest.isFixture && <Badge variant="secondary" className="hidden sm:inline-flex">Demo fixture</Badge>}
                        </>
                      ) : (
                        <span>No sample video yet</span>
                      )}
                    </p>
                    {videoError?.cameraId === cam.id && (
                      <p role="alert" className="mt-1 text-[13px] text-destructive-text">
                        {videoError.message}
                      </p>
                    )}
                  </div>
                </div>
                <div className="flex flex-wrap gap-2">
                  {latest && (
                    <Button variant="outline" size="sm" onClick={() => setPreview({ url, name: latest.fileName })}>
                      <Play /> Preview
                    </Button>
                  )}
                  <Button variant="outline" size="sm" onClick={() => fileInputs.current[cam.id]?.click()}>
                    <UploadCloud /> Upload sample video
                  </Button>
                  <input
                    ref={(el) => {
                      fileInputs.current[cam.id] = el;
                    }}
                    type="file"
                    accept="video/mp4,.mp4"
                    className="sr-only"
                    tabIndex={-1}
                    aria-label={`Sample video for ${cam.name}`}
                    onChange={(e) => {
                      onVideo(cam, e.target.files?.[0]);
                      e.target.value = "";
                    }}
                  />
                  <Button
                    variant="ghost"
                    size="icon-sm"
                    aria-label={`Remove ${cam.name}`}
                    onClick={() => {
                      removeCamera(cam.id);
                      toast(`${cam.name} removed`, { description: "Aisles it covered now show no camera coverage." });
                    }}
                  >
                    <Trash2 />
                  </Button>
                </div>
              </li>
            );
          })}
        </ul>
      )}

      {stepError && (
        <p role="alert" className="text-sm font-medium text-destructive-text">
          {stepError}
        </p>
      )}

      <div className="flex justify-between border-t border-border pt-5">
        <Button variant="outline" onClick={onBack}>
          <ArrowLeft /> Back
        </Button>
        <Button onClick={next}>
          Continue <ArrowRight />
        </Button>
      </div>

      <Dialog open={!!preview} onOpenChange={(o) => !o && setPreview(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Video preview</DialogTitle>
            <DialogDescription className="truncate">{preview?.name}</DialogDescription>
          </DialogHeader>
          {preview?.url ? (
            <video src={preview.url} controls className="aspect-video w-full rounded-lg bg-black" />
          ) : (
            <div className="flex aspect-video w-full flex-col items-center justify-center rounded-lg bg-muted px-6 text-center text-sm text-muted-foreground">
              <Film className="mb-2 size-6" aria-hidden="true" />
              Preview unavailable — this is a demo fixture or the page was refreshed. The prototype never stores video files; upload a
              sample MP4 to preview it.
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
