export type ShelfState = "stocked" | "empty" | "uncertain";

function distance(a: Uint8ClampedArray, b: Uint8ClampedArray) {
  let total = 0;
  for (let i = 0; i < a.length; i += 4) {
    total += Math.abs(a[i] - b[i]) + Math.abs(a[i + 1] - b[i + 1]) + Math.abs(a[i + 2] - b[i + 2]);
  }
  return total / (a.length * 0.75);
}

export function compareShelfFrame(
  frame: Uint8ClampedArray,
  stocked: Uint8ClampedArray,
  empty: Uint8ClampedArray,
): ShelfState {
  if (!frame.length || frame.length % 4 || frame.length !== stocked.length || frame.length !== empty.length) {
    return "uncertain";
  }

  const separation = distance(stocked, empty);
  if (separation < 12) return "uncertain";
  const stockedDistance = distance(frame, stocked);
  const emptyDistance = distance(frame, empty);
  if (Math.abs(stockedDistance - emptyDistance) < separation * 0.25
      || Math.min(stockedDistance, emptyDistance) > separation * 0.35) return "uncertain";

  return stockedDistance < emptyDistance ? "stocked" : "empty";
}

export function summarizeShelfFrames(frames: ShelfState[]): ShelfState {
  const last = frames.at(-1);
  return last && frames.at(-2) === last ? last : "uncertain";
}
