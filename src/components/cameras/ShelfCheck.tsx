import { useEffect, useRef, useState } from "react";
import sampleVideoUrl from "@/assets/synthetic-shelf.mp4?url";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { compareShelfFrame, summarizeShelfFrames, type ShelfState } from "@/utils/shelfCheck";

const labels: Record<ShelfState, string> = {
  stocked: "Looks stocked",
  empty: "Check shelf: likely empty",
  uncertain: "Unclear — check the shelf manually",
};

function frameAt(video: HTMLVideoElement, time: number, signal: AbortSignal): Promise<void> {
  if (signal.aborted) return Promise.reject(signal.reason);
  if (video.readyState >= 2 && Math.abs(video.currentTime - time) < 0.005) return Promise.resolve();
  return new Promise((resolve, reject) => {
    const cleanup = () => {
      clearTimeout(timer);
      video.removeEventListener("seeked", done);
      video.removeEventListener("error", fail);
      signal.removeEventListener("abort", fail);
    };
    const done = () => { cleanup(); resolve(); };
    const fail = () => { cleanup(); reject(new Error("Could not read a video frame.")); };
    const timer = window.setTimeout(fail, 4000);
    video.addEventListener("seeked", done);
    video.addEventListener("error", fail);
    signal.addEventListener("abort", fail);
    video.currentTime = time;
  });
}

// The overlay and sample use the same crop, covering the right half of the middle shelf.
function capture(video: HTMLVideoElement) {
  const canvas = document.createElement("canvas");
  canvas.width = 48;
  canvas.height = 16;
  const context = canvas.getContext("2d", { willReadFrequently: true });
  if (!context || video.readyState < 2) throw new Error("Could not read a video frame.");
  context.drawImage(video, video.videoWidth * 0.51, video.videoHeight * 0.42,
    video.videoWidth * 0.42, video.videoHeight * 0.17, 0, 0, canvas.width, canvas.height);
  return context.getImageData(0, 0, canvas.width, canvas.height).data;
}

export function ShelfCheck({ allowLocalVideo }: { allowLocalVideo: boolean }) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const operation = useRef<AbortController | null>(null);
  const [localUrl, setLocalUrl] = useState<string>();
  const [stocked, setStocked] = useState<Uint8ClampedArray>();
  const [empty, setEmpty] = useState<Uint8ClampedArray>();
  const [result, setResult] = useState<ShelfState>();
  const [ready, setReady] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => () => {
    operation.current?.abort();
    if (localUrl) URL.revokeObjectURL(localUrl);
  }, [localUrl]);

  function changeSource(next?: string) {
    setReady(false);
    setError("");
    setResult(undefined);
    setStocked(undefined);
    setEmpty(undefined);
    setLocalUrl(next);
  }

  function saveReference(kind: "stocked" | "empty") {
    const video = videoRef.current;
    if (!video) return;
    video.pause();
    setError("");
    setResult(undefined);
    try {
      const reference = capture(video);
      if (kind === "stocked") setStocked(reference);
      else setEmpty(reference);
    } catch {
      setError("Could not capture this frame. Let the video load and try again.");
    }
  }

  async function checkShelf(sampleEnd = 1.65) {
    const video = videoRef.current;
    if (!video || operation.current) return;
    const controller = new AbortController();
    operation.current = controller;
    const { signal } = controller;
    video.pause();
    const end = localUrl ? video.currentTime : sampleEnd;
    setBusy(true);
    setError("");
    setResult(undefined);
    try {
      let stockedFrame = stocked;
      let emptyFrame = empty;
      if (!localUrl) {
        await frameAt(video, 0.15, signal);
        stockedFrame = capture(video);
        await frameAt(video, 1.8, signal);
        emptyFrame = capture(video);
      }
      if (!stockedFrame || !emptyFrame) return;
      if (end < 0.5) {
        setError("Choose a frame at least half a second into the video.");
        return;
      }
      const results: ShelfState[] = [];
      for (const time of [end - 0.5, end - 0.25, end]) {
        await frameAt(video, Math.min(time, video.duration - 0.01), signal);
        results.push(compareShelfFrame(capture(video), stockedFrame, emptyFrame));
      }
      setResult(summarizeShelfFrames(results));
    } catch {
      if (!signal.aborted) setError("The browser could not read the video frames. Try another MP4.");
    } finally {
      if (operation.current === controller) operation.current = null;
      if (!signal.aborted) setBusy(false);
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Experimental shelf check</CardTitle>
        <CardDescription>Compare the marked area with stocked and empty reference frames. Use the result as a prompt for a shelf check.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="relative w-full max-w-lg">
          <video
            key={localUrl ?? "sample"}
            ref={videoRef}
            className="block w-full rounded-lg bg-slate-950"
            src={localUrl ?? sampleVideoUrl}
            aria-label={localUrl ? "Local shelf video" : "Synthetic shelf video"}
            controls={!busy}
            muted
            playsInline
            preload="auto"
            onLoadedMetadata={() => setReady(true)}
            onCanPlay={() => setReady(true)}
            onError={() => { setReady(false); setError("This browser could not open the video."); }}
          />
          <span aria-hidden="true" className="pointer-events-none absolute left-[51%] top-[42%] h-[17%] w-[42%] border-2 border-dashed border-yellow-300" />
        </div>
        {!localUrl && <a className="inline-block underline" href={sampleVideoUrl} download="synthetic-shelf.mp4">Download the sample MP4</a>}
        {allowLocalVideo && (
          <div className="flex flex-wrap items-end gap-3">
            <label className="grid gap-1 text-sm">
              Local fixed-camera MP4
              <input type="file" accept="video/mp4,.mp4" disabled={busy} onChange={(event) => {
                const file = event.currentTarget.files?.[0];
                event.currentTarget.value = "";
                if (file && /\.mp4$/i.test(file.name)) changeSource(URL.createObjectURL(file));
                else if (file) setError("Choose an MP4 file.");
              }} />
            </label>
            {localUrl && <Button variant="outline" disabled={busy} onClick={() => changeSource()}>Use sample video</Button>}
          </div>
        )}
        {localUrl && (
          <>
            <p className="text-sm text-muted-foreground">Keep the shelf in the marked area. Pause on a stocked frame and then on an empty frame to save both references. Seek to the moment you want to check.</p>
            <div className="flex flex-wrap gap-2">
              <Button variant="outline" disabled={!ready || busy} onClick={() => saveReference("stocked")}>Save stocked frame{stocked ? " ✓" : ""}</Button>
              <Button variant="outline" disabled={!ready || busy} onClick={() => saveReference("empty")}>Save empty frame{empty ? " ✓" : ""}</Button>
            </div>
          </>
        )}
        <div className="flex flex-wrap gap-2">
          <Button disabled={busy || Boolean(localUrl && (!ready || !stocked || !empty))} onClick={() => void checkShelf()}>
            {busy ? "Checking frames…" : localUrl ? "Check selected moment" : "Check end of sample"}
          </Button>
          {!localUrl && (
            <Button variant="outline" disabled={busy} onClick={() => void checkShelf(0.75)}>
              Check start of sample
            </Button>
          )}
        </div>
        {error && <p role="alert" className="text-sm text-destructive-text">{error}</p>}
        <p role="status" className="font-medium">{result && labels[result]}</p>
        <p className="text-sm text-muted-foreground">Video stays in this browser. Shelf checks do not change stock counts or orders.</p>
      </CardContent>
    </Card>
  );
}
