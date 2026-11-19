import * as React from "react";
import { FloorPlanBase, HATCH_ID, polygonBounds, polygonCentroid, polygonPoints } from "@/components/shared/FloorPlanBase";
import { useAisleLabel } from "@/hooks/useAisleName";
import type { Aisle, Camera, TrafficSummary } from "@/types";
import { formatCompact, formatNumber } from "@/utils/formatters";
import { LEVEL_FILL, zoneState } from "./zoneState";

function wrapLabel(text: string, maxChars: number): string[] {
  const words = text.split(" ");
  const lines: string[] = [];
  let line = "";
  for (const w of words) {
    const next = line ? `${line} ${w}` : w;
    if (next.length > maxChars && line) {
      lines.push(line);
      line = w;
    } else line = next;
  }
  if (line) lines.push(line);
  return lines.slice(0, 3);
}

/**
 * Section E — simplified top-down store layout coloured by simulated traffic intensity.
 * Every zone is a keyboard-operable button; uncovered zones are hatched and labelled "not measured".
 */
export function TrafficHeatmap({
  aisles,
  cameras,
  summary,
  selectedId,
  onSelect,
}: {
  aisles: Aisle[];
  cameras: Camera[];
  summary: TrafficSummary | null;
  selectedId: string | null;
  onSelect: (id: string) => void;
}) {
  const label = useAisleLabel();
  const [focusedId, setFocusedId] = React.useState<string | null>(null);
  const zones = aisles.filter((a) => a.kind === "aisle");
  const exact = summary?.query.range === "today";

  return (
    <FloorPlanBase
      title="Store traffic heatmap (simulated)"
      description="Top-down store layout. Each aisle region is shaded by relative aisle-visit intensity: high, medium or low. Hatched regions have no camera coverage and are not measured."
      className="rounded-lg"
    >
      {zones.map((aisle) => {
        const st = zoneState(aisle, summary, cameras);
        const name = label(aisle.id, aisle.name);
        const b = polygonBounds(aisle.polygon);
        const [cx, cy] = polygonCentroid(aisle.polygon);
        const width = b.maxX - b.minX;
        const maxChars = Math.max(6, Math.floor((width - 12) / 8));
        const nameLines = wrapLabel(name, maxChars);
        const selected = selectedId === aisle.id;
        const focused = focusedId === aisle.id;

        let fill = "var(--muted)";
        let onDark = false;
        let onColor = "#ffffff";
        let detail: string[] = [];
        let aria = "";
        if (st.kind === "measured") {
          fill = LEVEL_FILL[st.level];
          onDark = st.level >= 2;
          onColor = st.level === 3 ? "var(--seq-on-6)" : "var(--seq-on-4)";
          const v = exact ? formatNumber(st.stat.visits) : formatCompact(st.stat.visits);
          detail = width < 120 ? [st.levelLabel, `${v} visits`] : [`${st.levelLabel} · ${v} visits`];
          aria = `${name}: ${st.levelLabel} traffic, ${formatNumber(st.stat.visits)} aisle visits, ranked ${st.rank} of ${st.of}.`;
        } else if (st.kind === "no_camera") {
          fill = `url(#${HATCH_ID})`;
          detail = width < 160 ? ["No camera", "coverage —", "not measured"] : ["No camera coverage", "Not measured"];
          aria = `${name}: no camera coverage. Customer movement here is not measured.`;
        } else if (st.kind === "no_footage") {
          detail = ["Awaiting", "footage"];
          aria = `${name}: camera assigned but no processed footage yet.`;
        } else {
          detail = ["Outside", "filter"];
          aria = `${name}: outside the current camera filter.`;
        }
        if (aisle.coverage === "partial" && st.kind === "measured") detail = [...detail, "Partial view"];

        const lines = [...nameLines.map((t) => ({ t, strong: true })), ...detail.map((t) => ({ t, strong: false }))];
        const lineH = 22;
        const startY = cy - ((lines.length - 1) * lineH) / 2 + 4;

        return (
          <g
            key={aisle.id}
            role="button"
            tabIndex={0}
            aria-label={`${aria} Select for details.`}
            aria-pressed={selected}
            className="cursor-pointer outline-none"
            onClick={() => onSelect(aisle.id)}
            onKeyDown={(e) => {
              if (e.key === "Enter" || e.key === " ") {
                e.preventDefault();
                onSelect(aisle.id);
              }
            }}
            onFocus={() => setFocusedId(aisle.id)}
            onBlur={() => setFocusedId(null)}
          >
            <polygon
              points={polygonPoints(aisle.polygon)}
              fill={fill}
              stroke={focused ? "var(--ring)" : selected ? "var(--foreground)" : "var(--card)"}
              strokeWidth={selected || focused ? 4 : 2}
              className="transition-[stroke,opacity] duration-150 hover:opacity-90"
              style={{ strokeLinejoin: "round" }}
            />
            {aisle.coverage === "partial" && st.kind === "measured" && (
              <polygon
                points={polygonPoints(aisle.polygon.map(([x, y]) => [x + (x < cx ? 6 : -6), y + (y < cy ? 6 : -6)]))}
                fill="none"
                stroke="var(--foreground)"
                strokeOpacity={0.55}
                strokeDasharray="6 5"
                strokeWidth={1.5}
                pointerEvents="none"
              />
            )}
            <text textAnchor="middle" pointerEvents="none" aria-hidden="true">
              {lines.map((l, i) => (
                <tspan
                  key={i}
                  x={cx}
                  y={startY + i * lineH}
                  fontSize={l.strong ? 19 : 15.5}
                  fontWeight={l.strong ? 650 : 500}
                  fill={onDark ? onColor : l.strong ? "var(--foreground)" : "var(--muted-foreground)"}
                  fillOpacity={onDark && !l.strong ? 0.92 : 1}
                  stroke={onDark ? "none" : "var(--card)"}
                  strokeWidth={onDark ? 0 : 4}
                  strokeLinejoin="round"
                  paintOrder="stroke"
                >
                  {l.t}
                </tspan>
              ))}
            </text>
          </g>
        );
      })}
    </FloorPlanBase>
  );
}

export function HeatmapLegend() {
  const items = [
    { key: "low", label: "Low traffic", swatch: <span className="size-3.5 rounded-sm" style={{ background: LEVEL_FILL[1] }} /> },
    { key: "med", label: "Medium traffic", swatch: <span className="size-3.5 rounded-sm" style={{ background: LEVEL_FILL[2] }} /> },
    { key: "high", label: "High traffic (≥70% of busiest aisle)", swatch: <span className="size-3.5 rounded-sm" style={{ background: LEVEL_FILL[3] }} /> },
    {
      key: "none",
      label: "No camera coverage — not measured",
      swatch: (
        <span
          className="size-3.5 rounded-sm border border-border"
          style={{ background: "repeating-linear-gradient(45deg, var(--muted) 0 3px, var(--subtle) 3px 4px)" }}
        />
      ),
    },
    { key: "partial", label: "Partial camera view", swatch: <span className="size-3.5 rounded-sm border-[1.5px] border-dashed border-foreground/60" /> },
  ];
  return (
    <ul className="flex flex-wrap gap-x-4 gap-y-1.5 text-xs text-muted-foreground" aria-label="Heatmap legend">
      {items.map((i) => (
        <li key={i.key} className="flex items-center gap-1.5">
          <span aria-hidden="true" className="inline-flex">
            {i.swatch}
          </span>
          {i.label}
        </li>
      ))}
    </ul>
  );
}
