import type * as React from "react";

export interface TooltipRow {
  label: string;
  value: React.ReactNode;
  color?: string;
  dashed?: boolean;
}

/** Consistent tooltip body for Recharts `content` renderers. */
export function ChartTooltipBox({ title, rows, footer }: { title: React.ReactNode; rows: TooltipRow[]; footer?: React.ReactNode }) {
  return (
    <div className="min-w-44 rounded-lg border border-border bg-popover px-3 py-2.5 text-xs shadow-pop">
      <p className="mb-1.5 font-semibold text-foreground">{title}</p>
      <ul className="space-y-1">
        {rows.map((r) => (
          <li key={r.label} className="flex items-center justify-between gap-4">
            <span className="flex items-center gap-1.5 text-muted-foreground">
              {r.color && (
                <span
                  aria-hidden="true"
                  className="inline-block h-0.5 w-3 rounded-full"
                  style={{ background: r.dashed ? `repeating-linear-gradient(90deg, ${r.color} 0 3px, transparent 3px 5px)` : r.color, height: 3 }}
                />
              )}
              {r.label}
            </span>
            <span className="font-semibold text-foreground tabular">{r.value}</span>
          </li>
        ))}
      </ul>
      {footer && <p className="mt-1.5 border-t border-border pt-1.5 text-[11px] text-muted-foreground">{footer}</p>}
    </div>
  );
}
