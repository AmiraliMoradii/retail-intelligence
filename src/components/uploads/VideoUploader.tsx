import * as React from "react";
import { format } from "date-fns";
import { toast } from "sonner";
import { Film, RotateCcw, UploadCloud, XCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useAppStore } from "@/store/useAppStore";
import { latency, startVideoProcessing } from "@/services/mockApi";
import { videoRegistry } from "@/services/videoRegistry";
import { cameraLabel } from "@/services/analyticsService";
import { formatBytes } from "@/utils/formatters";
import { uid } from "@/utils/random";
import { cn } from "@/lib/utils";

export const MAX_VIDEO_BYTES = 2 * 1024 * 1024 * 1024;

type Phase = "idle" | "error" | "uploading" | "details";

function durationLabel(seconds: number) {
  if (!Number.isFinite(seconds) || seconds <= 0) return "Unknown length";
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = Math.round(seconds % 60);
  if (h) return `${h}h ${String(m).padStart(2, "0")}m`;
  if (m) return `${m}m ${String(s).padStart(2, "0")}s`;
  return `${s}s`;
}

/**
 * MP4 upload with simulated progress, local preview, camera assignment and recording date.
 * The file never leaves the browser — only metadata is stored, and previews are lost on refresh.
 */
export function VideoUploader({ onAdded }: { onAdded?: (videoId: string) => void }) {
  const cameras = useAppStore((s) => s.cameras);
  const addVideo = useAppStore((s) => s.addVideo);
  const assignVideoToCamera = useAppStore((s) => s.assignVideoToCamera);

  const inputRef = React.useRef<HTMLInputElement>(null);
  const [phase, setPhase] = React.useState<Phase>("idle");
  const [dragOver, setDragOver] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [progress, setProgress] = React.useState(0);
  const [file, setFile] = React.useState<File | null>(null);
  const [pending, setPending] = React.useState<{ id: string; url: string } | null>(null);
  const [duration, setDuration] = React.useState<string>("Unknown length");
  const [cameraId, setCameraId] = React.useState<string>("unassigned");
  const [recordingDate, setRecordingDate] = React.useState<string>(format(new Date(), "yyyy-MM-dd"));
  const [dateError, setDateError] = React.useState<string | null>(null);
  const [autoProcess, setAutoProcess] = React.useState(true);
  const today = format(new Date(), "yyyy-MM-dd");

  const reset = React.useCallback(() => {
    setPhase("idle");
    setError(null);
    setProgress(0);
    setFile(null);
    setDuration("Unknown length");
    setCameraId("unassigned");
    setRecordingDate(format(new Date(), "yyyy-MM-dd"));
    setDateError(null);
    if (inputRef.current) inputRef.current.value = "";
  }, []);

  const cancel = () => {
    if (pending) videoRegistry.remove(pending.id);
    setPending(null);
    reset();
  };

  const handleFile = async (f: File) => {
    const isMp4 = /\.mp4$/i.test(f.name) && (f.type === "" || f.type === "video/mp4");
    if (!isMp4) {
      setFile(f);
      setError("Unsupported video format. Please upload an MP4 file.");
      setPhase("error");
      return;
    }
    if (f.size > MAX_VIDEO_BYTES) {
      setFile(f);
      setError("This video is larger than 2 GB. Trim or split the recording and try again.");
      setPhase("error");
      return;
    }
    setFile(f);
    setError(null);
    setPhase("uploading");
    for (const p of [12, 31, 55, 74, 91]) {
      setProgress(p);
      await latency(140);
    }
    setProgress(100);
    const id = uid("vid");
    const url = videoRegistry.set(id, f);
    setPending({ id, url });
    const guess = cameras.find((c) => f.name.toLowerCase().includes(c.id.replace("-", "")) || f.name.toLowerCase().includes(c.id));
    if (guess) setCameraId(guess.id);
    setPhase("details");
  };

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!file || !pending) return;
    if (!recordingDate) {
      setDateError("Recording date is required.");
      return;
    }
    if (recordingDate > today) {
      setDateError("Recording date can't be in the future.");
      return;
    }
    setDateError(null);
    addVideo({
      id: pending.id,
      fileName: file.name,
      sizeBytes: file.size,
      durationLabel: duration,
      cameraId: cameraId === "unassigned" ? null : cameraId,
      recordingDate,
      uploadedAt: new Date().toISOString(),
      status: "ready",
      progress: 0,
      message: "Ready to process.",
    });
    if (cameraId !== "unassigned") assignVideoToCamera(pending.id, cameraId);
    const camera = cameras.find((c) => c.id === cameraId);
    toast.success("Video added", {
      description: `${file.name}${camera ? ` assigned to ${cameraLabel(camera)}` : " (not assigned to a camera)"}.${
        autoProcess ? " Simulated processing started." : ""
      }`,
    });
    if (autoProcess) startVideoProcessing(pending.id);
    onAdded?.(pending.id);
    setPending(null);
    reset();
  };

  return (
    <div className="space-y-4">
      {(phase === "idle" || phase === "uploading") && (
        <div
          onDragOver={(e) => {
            e.preventDefault();
            setDragOver(true);
          }}
          onDragLeave={() => setDragOver(false)}
          onDrop={(e) => {
            e.preventDefault();
            setDragOver(false);
            const f = e.dataTransfer.files?.[0];
            if (f) void handleFile(f);
          }}
          className={cn(
            "flex flex-col items-center justify-center rounded-xl border-2 border-dashed px-6 py-10 text-center transition-colors",
            dragOver ? "border-primary bg-primary-soft" : "border-input bg-muted/40 hover:border-primary/50",
          )}
        >
          {phase === "uploading" ? (
            <div className="w-full max-w-sm space-y-3" role="status" aria-live="polite">
              <Film className="mx-auto size-8 text-primary" aria-hidden="true" />
              <p className="text-sm font-medium">Uploading {file?.name}…</p>
              <Progress value={progress} aria-label="Upload progress" />
              <p className="text-xs text-muted-foreground tabular">{progress}% · kept in this browser only</p>
            </div>
          ) : (
            <>
              <div className="mb-3 flex size-12 items-center justify-center rounded-full bg-card text-primary shadow-sm">
                <UploadCloud className="size-6" aria-hidden="true" />
              </div>
              <p className="text-sm font-semibold">Drag and drop recorded CCTV footage</p>
              <p className="mt-1 text-xs text-muted-foreground">MP4 only · up to 2 GB · preview before adding</p>
              <Button type="button" className="mt-4" onClick={() => inputRef.current?.click()}>
                <Film /> Choose video
              </Button>
              <input
                ref={inputRef}
                type="file"
                accept="video/mp4,.mp4"
                className="sr-only"
                tabIndex={-1}
                aria-label="Video file"
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  if (f) void handleFile(f);
                }}
              />
            </>
          )}
        </div>
      )}

      {phase === "error" && (
        <div role="alert" className="rounded-lg border border-destructive/25 bg-destructive-soft p-4">
          <p className="flex items-center gap-2 text-sm font-semibold">
            <XCircle className="size-4 text-destructive-text" aria-hidden="true" />
            {error}
          </p>
          {file && (
            <p className="mt-1 ml-6 text-sm text-muted-foreground">
              Selected file: {file.name} ({formatBytes(file.size)})
            </p>
          )}
          <div className="mt-3 ml-6 flex flex-wrap gap-2">
            <Button
              size="sm"
              onClick={() => {
                reset();
                setTimeout(() => inputRef.current?.click(), 0);
              }}
            >
              <UploadCloud /> Choose another file
            </Button>
            <Button size="sm" variant="outline" onClick={reset}>
              <RotateCcw /> Start over
            </Button>
          </div>
        </div>
      )}

      {phase === "details" && file && pending && (
        <form onSubmit={submit} className="grid gap-4 rounded-xl border border-border p-4 lg:grid-cols-[minmax(0,1.2fr)_minmax(0,1fr)]" noValidate>
          <div className="space-y-2">
            <video
              src={pending.url}
              controls
              muted
              preload="metadata"
              className="aspect-video w-full rounded-lg bg-slate-950 object-contain"
              onLoadedMetadata={(e) => setDuration(durationLabel(e.currentTarget.duration))}
              aria-label={`Preview of ${file.name}`}
            />
            <p className="truncate text-xs text-muted-foreground">
              {file.name} · {formatBytes(file.size)} · {duration}
            </p>
          </div>
          <div className="flex flex-col gap-4">
            <div className="grid gap-1.5">
              <Label htmlFor="video-camera">Assign to camera</Label>
              <Select value={cameraId} onValueChange={setCameraId}>
                <SelectTrigger id="video-camera">
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
              {cameras.length === 0 && <p className="text-helper">No cameras configured yet — add one in Cameras & Aisles.</p>}
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="video-date">
                Recording date <span className="text-destructive-text" aria-hidden="true">*</span>
              </Label>
              <Input
                id="video-date"
                type="date"
                value={recordingDate}
                max={today}
                required
                aria-required="true"
                aria-invalid={dateError ? true : undefined}
                aria-describedby={dateError ? "video-date-error" : undefined}
                onChange={(e) => {
                  setRecordingDate(e.target.value);
                  setDateError(null);
                }}
              />
              {dateError && (
                <p id="video-date-error" role="alert" className="text-xs text-destructive-text">
                  {dateError}
                </p>
              )}
            </div>
            <div className="flex items-start gap-2">
              <Checkbox id="video-auto" checked={autoProcess} onCheckedChange={(v) => setAutoProcess(v === true)} className="mt-0.5" />
              <Label htmlFor="video-auto" className="font-normal">
                Start simulated processing after adding
              </Label>
            </div>
            <div className="mt-auto flex flex-wrap justify-end gap-2">
              <Button type="button" variant="outline" onClick={cancel}>
                Cancel
              </Button>
              <Button type="submit">Add video</Button>
            </div>
          </div>
        </form>
      )}
    </div>
  );
}
