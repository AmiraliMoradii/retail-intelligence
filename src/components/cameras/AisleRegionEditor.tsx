import * as React from "react";
import { useBlocker } from "react-router";
import { toast } from "sonner";
import { AlertCircle, Plus, RotateCcw, Save, Trash2, MousePointerClick } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert } from "@/components/ui/alert";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { FloorPlanBase, HATCH_ID, polygonBounds, polygonCentroid, polygonPoints } from "@/components/shared/FloorPlanBase";
import { SegmentedControl } from "@/components/settings/SegmentedControl";
import { ConfirmDialog } from "./ConfirmDialog";
import { AISLE_BASELINES, FLOOR_PLAN } from "@/data/mockAisles";
import { useAppStore } from "@/store/useAppStore";
import { cameraLabel } from "@/services/analyticsService";
import type { Aisle, Point } from "@/types";
import { cn } from "@/lib/utils";

const PAD = 10;
const MAX_X = FLOOR_PLAN.width - PAD;
const MAX_Y = FLOOR_PLAN.height - PAD;
const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v));
const clampPoint = ([x, y]: Point): Point => [Math.round(clamp(x, PAD, MAX_X)), Math.round(clamp(y, PAD, MAX_Y))];
const clone = (aisles: Aisle[]): Aisle[] => aisles.map((a) => ({ ...a, polygon: a.polygon.map((p) => [p[0], p[1]] as Point) }));
const same = (a: Aisle[], b: Aisle[]) => JSON.stringify(a) === JSON.stringify(b);

function moveRegion(orig: Point[], dx: number, dy: number): Point[] {
  const b = polygonBounds(orig);
  const ddx = clamp(dx, PAD - b.minX, MAX_X - b.maxX);
  const ddy = clamp(dy, PAD - b.minY, MAX_Y - b.maxY);
  return orig.map(([x, y]) => [Math.round(x + ddx), Math.round(y + ddy)]);
}

/** Greedy word wrap for SVG labels, sized to the region width. */
function wrapLabel(text: string, width: number, charPx: number, maxLines = 3): string[] {
  const maxChars = Math.max(4, Math.floor((width - 12) / charPx));
  const words = text.split(/\s+/);
  const lines: string[] = [];
  let line = "";
  for (const w of words) {
    if (!line) line = w;
    else if ((line + " " + w).length <= maxChars) line += " " + w;
    else {
      lines.push(line);
      line = w;
    }
  }
  if (line) lines.push(line);
  return lines.slice(0, maxLines);
}

function validate(draft: Aisle[]): Record<string, string> {
  const errors: Record<string, string> = {};
  const seen = new Map<string, string>();
  for (const a of draft) {
    const key = a.name.trim().toLowerCase();
    if (!key) {
      errors[a.id] = "Aisle name is required.";
      continue;
    }
    if (a.name.trim().length > 40) {
      errors[a.id] = "Keep the aisle name under 40 characters.";
      continue;
    }
    const other = seen.get(key);
    if (other) {
      errors[a.id] = `Another region is already named “${a.name.trim()}”. Names must be unique.`;
      errors[other] = errors[other] ?? `Another region is already named “${a.name.trim()}”. Names must be unique.`;
    } else seen.set(key, a.id);
  }
  return errors;
}

type DragState =
  | { kind: "vertex"; regionId: string; index: number }
  | { kind: "region"; regionId: string; start: Point; orig: Point[] };

export function AisleRegionEditor() {
  const storeAisles = useAppStore((s) => s.aisles);
  const cameras = useAppStore((s) => s.cameras);
  const saveAisles = useAppStore((s) => s.saveAisles);

  const [baseline, setBaseline] = React.useState(storeAisles);
  const [draft, setDraft] = React.useState<Aisle[]>(() => clone(storeAisles));
  const [selectedId, setSelectedId] = React.useState<string | null>(storeAisles[0]?.id ?? null);
  const [focusedVertex, setFocusedVertex] = React.useState<number | null>(null);
  const [confirmDelete, setConfirmDelete] = React.useState<Aisle | null>(null);
  const [dragging, setDragging] = React.useState(false);
  const svgRef = React.useRef<SVGSVGElement>(null);
  const drag = React.useRef<DragState | null>(null);
  const vertexRefs = React.useRef<(SVGCircleElement | null)[]>([]);

  // Pick up external changes (e.g. a camera was removed or demo data reset) when there are no local edits.
  React.useEffect(() => {
    if (storeAisles === baseline) return;
    setDraft((d) => (same(d, baseline) ? clone(storeAisles) : d));
    setBaseline(storeAisles);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [storeAisles]);

  const dirty = React.useMemo(() => !same(draft, baseline), [draft, baseline]);
  const errors = React.useMemo(() => validate(draft), [draft]);
  const errorCount = Object.keys(errors).length;
  const cameraIds = React.useMemo(() => new Set(cameras.map((c) => c.id)), [cameras]);
  const isCovered = (a: Aisle) => a.cameraId !== null && cameraIds.has(a.cameraId);
  const selected = draft.find((a) => a.id === selectedId) ?? null;
  const coveredCount = draft.filter((a) => a.kind === "aisle" && isCovered(a)).length;
  const aisleCount = draft.filter((a) => a.kind === "aisle").length;

  // Leave-page guard for unsaved edits.
  const blocker = useBlocker(({ currentLocation, nextLocation }) => dirty && currentLocation.pathname !== nextLocation.pathname);
  React.useEffect(() => {
    if (!dirty) return;
    const handler = (e: BeforeUnloadEvent) => {
      e.preventDefault();
    };
    window.addEventListener("beforeunload", handler);
    return () => window.removeEventListener("beforeunload", handler);
  }, [dirty]);

  const updateRegion = (id: string, patch: Partial<Aisle>) => setDraft((d) => d.map((a) => (a.id === id ? { ...a, ...patch } : a)));

  const toSvgPoint = (e: { clientX: number; clientY: number }): Point | null => {
    const svg = svgRef.current;
    const ctm = svg?.getScreenCTM();
    if (!svg || !ctm) return null;
    const pt = new DOMPoint(e.clientX, e.clientY).matrixTransform(ctm.inverse());
    return [pt.x, pt.y];
  };

  const onPointerMove = (e: React.PointerEvent<SVGSVGElement>) => {
    const d = drag.current;
    if (!d) return;
    const p = toSvgPoint(e);
    if (!p) return;
    if (d.kind === "vertex") {
      setDraft((all) =>
        all.map((a) => (a.id === d.regionId ? { ...a, polygon: a.polygon.map((pt, i) => (i === d.index ? clampPoint(p) : pt)) } : a)),
      );
    } else {
      updateRegion(d.regionId, { polygon: moveRegion(d.orig, p[0] - d.start[0], p[1] - d.start[1]) });
    }
  };

  const endDrag = () => {
    drag.current = null;
    setDragging(false);
  };

  const startVertexDrag = (e: React.PointerEvent<SVGElement>, regionId: string, index: number) => {
    e.stopPropagation();
    (e.currentTarget as Element).setPointerCapture?.(e.pointerId);
    drag.current = { kind: "vertex", regionId, index };
    setDragging(true);
  };

  const startRegionDrag = (e: React.PointerEvent<SVGElement>, region: Aisle) => {
    setSelectedId(region.id);
    setFocusedVertex(null);
    const p = toSvgPoint(e);
    if (!p) return;
    (e.currentTarget as Element).setPointerCapture?.(e.pointerId);
    drag.current = { kind: "region", regionId: region.id, start: p, orig: region.polygon };
    setDragging(true);
  };

  const insertVertex = (e: React.PointerEvent<SVGElement> | null, region: Aisle, afterIndex: number) => {
    const a = region.polygon[afterIndex];
    const b = region.polygon[(afterIndex + 1) % region.polygon.length];
    const mid: Point = [Math.round((a[0] + b[0]) / 2), Math.round((a[1] + b[1]) / 2)];
    const polygon = [...region.polygon.slice(0, afterIndex + 1), mid, ...region.polygon.slice(afterIndex + 1)];
    updateRegion(region.id, { polygon });
    if (e) {
      e.stopPropagation();
      (e.currentTarget as Element).setPointerCapture?.(e.pointerId);
      drag.current = { kind: "vertex", regionId: region.id, index: afterIndex + 1 };
      setDragging(true);
    } else {
      setFocusedVertex(afterIndex + 1);
      requestAnimationFrame(() => vertexRefs.current[afterIndex + 1]?.focus());
    }
  };

  const removeVertex = (region: Aisle, index: number) => {
    if (region.polygon.length <= 3) {
      toast.error("A region needs at least 3 points.");
      return;
    }
    updateRegion(region.id, { polygon: region.polygon.filter((_, i) => i !== index) });
    setFocusedVertex(null);
  };

  const nudge = (e: React.KeyboardEvent, apply: (dx: number, dy: number) => void) => {
    const step = e.shiftKey ? 10 : 1;
    const map: Record<string, [number, number]> = {
      ArrowLeft: [-step, 0],
      ArrowRight: [step, 0],
      ArrowUp: [0, -step],
      ArrowDown: [0, step],
    };
    const delta = map[e.key];
    if (!delta) return false;
    e.preventDefault();
    apply(delta[0], delta[1]);
    return true;
  };

  const addRegion = () => {
    const base = "New aisle";
    const names = new Set(draft.map((a) => a.name.trim().toLowerCase()));
    let name = base;
    let n = 2;
    while (names.has(name.toLowerCase())) name = `${base} ${n++}`;
    const x = 400 + ((draft.length * 23) % 120);
    const y = 220 + ((draft.length * 17) % 80);
    const region: Aisle = {
      id: `region-${Date.now().toString(36)}`,
      name,
      kind: "aisle",
      cameraId: null,
      coverage: "full",
      polygon: [
        [x, y],
        [x + 130, y],
        [x + 130, y + 90],
        [x, y + 90],
      ],
    };
    setDraft((d) => [...d, region]);
    setSelectedId(region.id);
    toast.info("Region added", { description: "Drag its points to match the aisle, name it, and assign a camera. Save to apply." });
  };

  const deleteRegion = (region: Aisle) => {
    setDraft((d) => d.filter((a) => a.id !== region.id));
    setSelectedId((cur) => (cur === region.id ? null : cur));
    toast(`“${region.name || "Region"}” removed`, { description: "Save configuration to apply this change." });
  };

  const requestDelete = (region: Aisle) => {
    if (AISLE_BASELINES[region.id]?.visits) setConfirmDelete(region);
    else deleteRegion(region);
  };

  const save = () => {
    if (errorCount) {
      toast.error("Fix the highlighted region names before saving.");
      return;
    }
    const sanitized = draft.map((a) => ({
      ...a,
      name: a.name.trim(),
      cameraId: a.cameraId && cameraIds.has(a.cameraId) ? a.cameraId : null,
    }));
    setDraft(clone(sanitized));
    saveAisles(sanitized);
    toast.success("Aisle configuration saved", {
      description: `${sanitized.filter((a) => a.kind === "aisle" && a.cameraId).length} of ${sanitized.filter((a) => a.kind === "aisle").length} aisle regions have camera coverage. Aisle Analytics now uses these regions.`,
    });
  };

  const discard = () => {
    setDraft(clone(storeAisles));
    setBaseline(storeAisles);
    toast("Changes discarded");
  };

  const selectedError = selected ? errors[selected.id] : undefined;
  const selectedCameraMissing = selected?.cameraId != null && !cameraIds.has(selected.cameraId);

  return (
    <div className="space-y-4">
      <Alert variant="warning" title="Analytics are only produced where a camera has footage">
        Hatched regions have no camera coverage. The platform does not measure or estimate customer movement there — assign a camera
        with uploaded footage to include a region in Aisle Analytics.
      </Alert>

      <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_320px]">
        {/* Plan */}
        <div className="min-w-0 space-y-3">
          <div className="overflow-hidden rounded-xl border border-border bg-muted/30 p-2">
            <FloorPlanBase
              ref={svgRef}
              title="Store layout — aisle region editor"
              description={`${aisleCount} aisle regions, ${coveredCount} covered by a camera. Select a region, then drag its points or use the arrow keys to adjust it.`}
              onPointerMove={onPointerMove}
              onPointerUp={endDrag}
              onPointerCancel={endDrag}
              onPointerDown={(e) => {
                if (e.target === e.currentTarget) setSelectedId(null);
              }}
              style={{ touchAction: "none", cursor: dragging ? "grabbing" : undefined }}
            >
              {draft.map((a) => {
                const covered = isCovered(a);
                const isSel = a.id === selectedId;
                const err = Boolean(errors[a.id]);
                const b = polygonBounds(a.polygon);
                const [cx, cy] = polygonCentroid(a.polygon);
                const nameLines = wrapLabel(a.name || "Unnamed", b.maxX - b.minX, 7.6);
                const camText = covered
                  ? `${a.cameraId!.toUpperCase()}${a.coverage === "partial" ? " · partial" : ""}`
                  : "No camera coverage";
                const subLines = wrapLabel(camText, b.maxX - b.minX, 6.2, 2);
                const totalLines = nameLines.length + subLines.length;
                const startY = cy - ((totalLines - 1) * 15) / 2 + 4;
                return (
                  <g
                    key={a.id}
                    role="button"
                    tabIndex={0}
                    aria-pressed={isSel}
                    aria-label={`${a.name || "Unnamed region"}, ${covered ? `covered by ${a.cameraId!.toUpperCase()}` : "no camera coverage"}. ${
                      isSel ? "Selected. Arrow keys move the region; Shift moves faster." : "Press Enter to select."
                    }`}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" || e.key === " ") {
                        e.preventDefault();
                        setSelectedId(a.id);
                        return;
                      }
                      if (isSel) nudge(e, (dx, dy) => updateRegion(a.id, { polygon: moveRegion(a.polygon, dx, dy) }));
                    }}
                    className="outline-none [&:focus-visible>polygon.region-shape]:stroke-[var(--ring)] [&:focus-visible>polygon.region-shape]:[stroke-width:4]"
                  >
                    <polygon
                      className="region-shape"
                      points={polygonPoints(a.polygon)}
                      fill={covered ? "var(--primary)" : `url(#${HATCH_ID})`}
                      fillOpacity={covered ? (isSel ? 0.22 : 0.1) : 1}
                      stroke={err ? "var(--destructive)" : isSel ? "var(--primary)" : covered ? "var(--primary)" : "var(--subtle)"}
                      strokeOpacity={isSel || err ? 1 : 0.55}
                      strokeWidth={isSel ? 3 : 2}
                      strokeDasharray={!covered ? "6 4" : a.coverage === "partial" ? "9 5" : undefined}
                      strokeLinejoin="round"
                      style={{ cursor: isSel ? "move" : "pointer", transition: "fill-opacity 120ms" }}
                      onPointerDown={(e) => startRegionDrag(e, a)}
                    />
                    {!covered && isSel && (
                      <polygon points={polygonPoints(a.polygon)} fill="var(--primary)" fillOpacity={0.08} pointerEvents="none" />
                    )}
                    <text textAnchor="middle" pointerEvents="none" aria-hidden="true">
                      {nameLines.map((l, i) => (
                        <tspan key={`n${i}`} x={cx} y={startY + i * 15} fontSize="14" fontWeight={600} fill="var(--foreground)">
                          {l}
                        </tspan>
                      ))}
                      {subLines.map((l, i) => (
                        <tspan
                          key={`s${i}`}
                          x={cx}
                          y={startY + (nameLines.length + i) * 15}
                          fontSize="11"
                          fontWeight={500}
                          fill={covered ? "var(--primary-soft-foreground)" : "var(--muted-foreground)"}
                        >
                          {l}
                        </tspan>
                      ))}
                    </text>
                  </g>
                );
              })}

              {/* Handles for the selected region (drawn last so they sit on top) */}
              {selected && (
                <g>
                  {selected.polygon.map((p, i) => {
                    const q = selected.polygon[(i + 1) % selected.polygon.length];
                    const mx = (p[0] + q[0]) / 2;
                    const my = (p[1] + q[1]) / 2;
                    return (
                      <circle
                        key={`mid-${i}`}
                        cx={mx}
                        cy={my}
                        r={6}
                        fill="var(--primary)"
                        fillOpacity={0.35}
                        stroke="var(--card)"
                        strokeWidth={2}
                        role="button"
                        tabIndex={0}
                        aria-label={`Add a point between point ${i + 1} and point ${((i + 1) % selected.polygon.length) + 1}`}
                        style={{ cursor: "copy" }}
                        onPointerDown={(e) => insertVertex(e, selected, i)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter" || e.key === " ") {
                            e.preventDefault();
                            insertVertex(null, selected, i);
                          }
                        }}
                      />
                    );
                  })}
                  {selected.polygon.map((p, i) => (
                    <g key={`v-${i}`}>
                      {focusedVertex === i && (
                        <circle cx={p[0]} cy={p[1]} r={14} fill="none" stroke="var(--ring)" strokeWidth={2.5} pointerEvents="none" />
                      )}
                      <circle
                        ref={(el) => {
                          vertexRefs.current[i] = el;
                        }}
                        cx={p[0]}
                        cy={p[1]}
                        r={8}
                        fill="var(--card)"
                        stroke="var(--primary)"
                        strokeWidth={2.5}
                        role="button"
                        tabIndex={0}
                        aria-roledescription="draggable point"
                        aria-label={`Point ${i + 1} of ${selected.polygon.length} on ${selected.name || "region"}, at ${p[0]}, ${p[1]}. Arrow keys move it, Shift moves faster, Delete removes it.`}
                        style={{ cursor: "grab", outline: "none" }}
                        onFocus={() => setFocusedVertex(i)}
                        onBlur={() => setFocusedVertex((f) => (f === i ? null : f))}
                        onPointerDown={(e) => startVertexDrag(e, selected.id, i)}
                        onDoubleClick={() => removeVertex(selected, i)}
                        onKeyDown={(e) => {
                          if (e.key === "Delete" || e.key === "Backspace") {
                            e.preventDefault();
                            removeVertex(selected, i);
                            return;
                          }
                          nudge(e, (dx, dy) =>
                            updateRegion(selected.id, {
                              polygon: selected.polygon.map((pt, j) => (j === i ? clampPoint([pt[0] + dx, pt[1] + dy]) : pt)),
                            }),
                          );
                        }}
                      />
                    </g>
                  ))}
                </g>
              )}
            </FloorPlanBase>
          </div>

          {/* Legend */}
          <ul className="flex flex-wrap gap-x-5 gap-y-2 text-xs text-muted-foreground" aria-label="Legend">
            <li className="flex items-center gap-2">
              <span aria-hidden="true" className="inline-block h-3.5 w-5 rounded-[3px] border-2 border-primary/60 bg-primary/10" />
              Covered by a camera
            </li>
            <li className="flex items-center gap-2">
              <span aria-hidden="true" className="inline-block h-3.5 w-5 rounded-[3px] border-2 border-dashed border-primary/60 bg-primary/10" />
              Partially in frame
            </li>
            <li className="flex items-center gap-2">
              <span
                aria-hidden="true"
                className="inline-block h-3.5 w-5 rounded-[3px] border-2 border-dashed border-subtle"
                style={{ background: "repeating-linear-gradient(45deg, var(--muted) 0 3px, color-mix(in srgb, var(--subtle) 45%, transparent) 3px 5px)" }}
              />
              No camera coverage — not measured
            </li>
            <li className="flex items-center gap-2">
              <MousePointerClick className="size-3.5" aria-hidden="true" />
              Drag points to reshape · click a small dot to add a point · double-click a point to remove it
            </li>
          </ul>
        </div>

        {/* Inspector */}
        <div className="space-y-4">
          <div className="rounded-xl border border-border">
            <div className="flex items-center justify-between gap-2 border-b border-border px-4 py-3">
              <div>
                <p className="text-card-title">Regions</p>
                <p className="text-xs text-muted-foreground">
                  {coveredCount} of {aisleCount} covered
                </p>
              </div>
              <Button size="sm" variant="outline" onClick={addRegion}>
                <Plus /> Add region
              </Button>
            </div>
            <ul className="max-h-72 overflow-y-auto p-1.5 scrollbar-thin" aria-label="Aisle regions">
              {draft.map((a) => {
                const covered = isCovered(a);
                const isSel = a.id === selectedId;
                return (
                  <li key={a.id}>
                    <button
                      type="button"
                      aria-pressed={isSel}
                      onClick={() => setSelectedId(a.id)}
                      className={cn(
                        "flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-left text-sm transition-colors hover:bg-muted focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-ring",
                        isSel && "bg-primary-soft hover:bg-primary-soft",
                      )}
                    >
                      <span
                        aria-hidden="true"
                        className={cn(
                          "inline-block size-3.5 shrink-0 rounded-[3px] border-2",
                          covered ? "border-primary/60 bg-primary/15" : "border-dashed border-subtle",
                          covered && a.coverage === "partial" && "border-dashed",
                        )}
                        style={
                          covered
                            ? undefined
                            : { background: "repeating-linear-gradient(45deg, var(--muted) 0 2px, color-mix(in srgb, var(--subtle) 45%, transparent) 2px 4px)" }
                        }
                      />
                      <span className="min-w-0 flex-1">
                        <span className={cn("block truncate font-medium", isSel && "text-primary-soft-foreground")}>{a.name || "Unnamed region"}</span>
                        <span className="block truncate text-xs text-muted-foreground">
                          {covered
                            ? `${cameraLabel(cameras.find((c) => c.id === a.cameraId)!)}${a.coverage === "partial" ? " · partial" : ""}`
                            : "No camera coverage"}
                        </span>
                      </span>
                      {errors[a.id] && <AlertCircle className="size-4 shrink-0 text-destructive-text" aria-label="Has a problem" />}
                    </button>
                  </li>
                );
              })}
            </ul>
          </div>

          {selected ? (
            <div className="space-y-4 rounded-xl border border-border p-4" aria-label={`Edit ${selected.name || "region"}`} role="group">
              <div className="grid gap-1.5">
                <Label htmlFor="region-name">Aisle name</Label>
                <Input
                  id="region-name"
                  value={selected.name}
                  maxLength={60}
                  onChange={(e) => updateRegion(selected.id, { name: e.target.value })}
                  aria-invalid={selectedError ? true : undefined}
                  aria-describedby={selectedError ? "region-name-error" : undefined}
                />
                {selectedError && (
                  <p id="region-name-error" role="alert" className="text-xs text-destructive-text">
                    {selectedError}
                  </p>
                )}
              </div>
              <div className="grid gap-1.5">
                <Label htmlFor="region-camera">Assigned camera</Label>
                <Select
                  value={selected.cameraId && cameraIds.has(selected.cameraId) ? selected.cameraId : "none"}
                  onValueChange={(v) => updateRegion(selected.id, { cameraId: v === "none" ? null : v })}
                >
                  <SelectTrigger id="region-camera">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">No camera (not measured)</SelectItem>
                    {cameras.map((c) => (
                      <SelectItem key={c.id} value={c.id}>
                        {cameraLabel(c)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {selectedCameraMissing && (
                  <p className="text-xs text-warning-text">The camera previously assigned here was removed — this region has no coverage.</p>
                )}
              </div>
              <SegmentedControl
                name="region-coverage"
                legend="Coverage"
                value={selected.coverage}
                onChange={(v) => updateRegion(selected.id, { coverage: v })}
                options={[
                  { value: "full", label: "Full", disabled: !isCovered(selected) },
                  { value: "partial", label: "Partial", disabled: !isCovered(selected) },
                ]}
              />
              <p className="text-xs text-muted-foreground">
                {selected.polygon.length} points ·{" "}
                {AISLE_BASELINES[selected.id]?.visits
                  ? "has simulated footage data"
                  : "new region — no processed footage yet, so no analytics until video is processed"}
              </p>
              <Button variant="outline" size="sm" className="w-full text-destructive-text hover:bg-destructive-soft" onClick={() => requestDelete(selected)}>
                <Trash2 /> Delete region
              </Button>
            </div>
          ) : (
            <p className="rounded-xl border border-dashed border-border p-4 text-center text-sm text-muted-foreground">
              Select a region on the layout or in the list to rename it, assign a camera, or reshape it.
            </p>
          )}
        </div>
      </div>

      {/* Save bar */}
      <div
        className={cn(
          "flex flex-col gap-3 rounded-xl border px-4 py-3 sm:flex-row sm:items-center sm:justify-between",
          dirty ? "border-warning/40 bg-warning-soft" : "border-border bg-muted/30",
        )}
        aria-live="polite"
      >
        <div className="flex items-center gap-2 text-sm">
          {dirty ? (
            <Badge variant="warning">
              <AlertCircle aria-hidden="true" /> Unsaved changes
            </Badge>
          ) : (
            <span className="text-muted-foreground">All changes saved.</span>
          )}
          {errorCount > 0 && <span className="text-destructive-text">{errorCount === 1 ? "1 region needs a valid name." : `${errorCount} regions need valid names.`}</span>}
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" onClick={discard} disabled={!dirty}>
            <RotateCcw /> Discard changes
          </Button>
          <Button onClick={save} disabled={!dirty || errorCount > 0}>
            <Save /> Save configuration
          </Button>
        </div>
      </div>

      <ConfirmDialog
        open={Boolean(confirmDelete)}
        onOpenChange={(o) => !o && setConfirmDelete(null)}
        title={`Delete “${confirmDelete?.name}”?`}
        description="This region has simulated footage data. Deleting it removes it from Aisle Analytics, heatmaps and the Overview once you save. You can restore it with Discard changes before saving, or by resetting demo data."
        confirmLabel={
          <>
            <Trash2 /> Delete region
          </>
        }
        destructive
        onConfirm={() => confirmDelete && deleteRegion(confirmDelete)}
      />

      <Dialog open={blocker.state === "blocked"} onOpenChange={(o) => !o && blocker.state === "blocked" && blocker.reset()}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Leave without saving?</DialogTitle>
            <DialogDescription>Your aisle region changes have not been saved and will be lost.</DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => blocker.state === "blocked" && blocker.reset()}>
              Stay on page
            </Button>
            <Button variant="destructive" onClick={() => blocker.state === "blocked" && blocker.proceed()}>
              Discard and leave
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
