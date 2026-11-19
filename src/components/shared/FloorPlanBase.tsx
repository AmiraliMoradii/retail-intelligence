import * as React from "react";
import { FLOOR_FIXTURES, FLOOR_PLAN } from "@/data/mockAisles";
import type { Point } from "@/types";
import { cn } from "@/lib/utils";

export const HATCH_ID = "ri-no-coverage-hatch";

export const polygonPoints = (pts: Point[]) => pts.map(([x, y]) => `${x},${y}`).join(" ");

export function polygonCentroid(pts: Point[]): Point {
  const n = pts.length || 1;
  return [pts.reduce((a, p) => a + p[0], 0) / n, pts.reduce((a, p) => a + p[1], 0) / n];
}

export function polygonBounds(pts: Point[]) {
  const xs = pts.map((p) => p[0]);
  const ys = pts.map((p) => p[1]);
  return { minX: Math.min(...xs), maxX: Math.max(...xs), minY: Math.min(...ys), maxY: Math.max(...ys) };
}

/**
 * Shared top-down store layout (1000 × 620 units). Draws the store outline, fixed fixtures
 * (entrance, checkout, storage) and the hatch pattern used for "no camera coverage".
 * Zone layers are passed as children so the heatmap and the aisle editor stay visually aligned.
 */
export const FloorPlanBase = React.forwardRef<
  SVGSVGElement,
  {
    children: React.ReactNode;
    title: string;
    description?: string;
    className?: string;
  } & Omit<React.SVGProps<SVGSVGElement>, "children">
>(function FloorPlanBase({ children, title, description, className, ...props }, ref) {
  const titleId = React.useId();
  const descId = React.useId();
  return (
    <svg
      ref={ref}
      viewBox={`0 0 ${FLOOR_PLAN.width} ${FLOOR_PLAN.height}`}
      className={cn("h-auto w-full select-none", className)}
      role="group"
      aria-labelledby={titleId}
      aria-describedby={description ? descId : undefined}
      {...props}
    >
      <title id={titleId}>{title}</title>
      {description && <desc id={descId}>{description}</desc>}
      <defs>
        <pattern id={HATCH_ID} width="10" height="10" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
          <rect width="10" height="10" fill="var(--muted)" />
          <line x1="0" y1="0" x2="0" y2="10" stroke="var(--subtle)" strokeWidth="2" opacity="0.45" />
        </pattern>
      </defs>
      {/* Store shell */}
      <rect x="6" y="6" width={FLOOR_PLAN.width - 12} height={FLOOR_PLAN.height - 12} rx="14" fill="var(--card)" stroke="var(--border)" strokeWidth="2" />
      {FLOOR_FIXTURES.map((f) => (
        <g key={f.id} aria-hidden="true">
          <rect x={f.x} y={f.y} width={f.w} height={f.h} rx="8" fill="var(--muted)" stroke="var(--border)" strokeDasharray="4 4" />
          <text x={f.x + f.w / 2} y={f.y + f.h / 2 + 5} textAnchor="middle" fontSize="16" fill="var(--muted-foreground)" fontWeight={500}>
            {f.label}
          </text>
        </g>
      ))}
      {/* Entrance arrow */}
      <path d="M 105 606 L 105 596" stroke="var(--muted-foreground)" strokeWidth="2" aria-hidden="true" />
      {children}
    </svg>
  );
});
