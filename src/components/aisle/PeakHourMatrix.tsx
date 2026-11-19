import * as React from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ChartSkeleton } from "@/components/shared/LoadingState";
import { useAisleLabel } from "@/hooks/useAisleName";
import { cn } from "@/lib/utils";
import { seqStep } from "@/lib/chart";
import type { TrafficSummary } from "@/types";
import { formatCompact, formatHourRange, formatHourShort, formatNumber } from "@/utils/formatters";

/** Text that stays readable on each sequential step in both themes (dark ramp runs light-on-top). */
function cellText(step: number) {
  if (step === 0) return "text-subtle";
  return cn(step >= 4 ? "text-white" : "text-foreground", step >= 5 ? "dark:text-slate-900" : step === 4 ? "dark:text-white" : "");
}

/**
 * Section D — peak-hour matrix (aisles × hours). A real <table> with values in every cell,
 * roving-focus arrow-key navigation, a live read-out, and a store-wide totals row.
 */
export function PeakHourMatrix({
  summary,
  selectedAisleId,
  onSelect,
  loading,
  busy,
}: {
  summary: TrafficSummary | null;
  selectedAisleId: string | null;
  onSelect: (aisleId: string) => void;
  loading?: boolean;
  busy?: boolean;
}) {
  const label = useAisleLabel();
  const tableRef = React.useRef<HTMLTableElement>(null);
  const instructionsId = React.useId();
  const rows = summary?.byAisle ?? [];
  const hours = summary?.hours ?? [];
  const max = Math.max(0, ...rows.flatMap((r) => r.hourly.map((h) => h.visits)));
  const exact = summary?.query.range === "today";
  const fmt = (n: number) => (exact || n < 1000 ? formatNumber(n) : formatCompact(n));

  const busiest = React.useMemo(() => {
    let best: { aisle: string; hour: number; visits: number } | null = null;
    for (const r of rows) for (const h of r.hourly) if (!best || h.visits > best.visits) best = { aisle: label(r.aisleId, r.aisleName), hour: h.hour, visits: h.visits };
    return best;
  }, [rows, label]);

  const [focus, setFocus] = React.useState<{ r: number; c: number }>({ r: 0, c: 0 });
  const [readout, setReadout] = React.useState<string | null>(null);
  // Keep the roving tab stop inside the grid when filters change its size.
  const fr = Math.max(0, Math.min(focus.r, rows.length - 1));
  const fc = Math.max(0, Math.min(focus.c, hours.length - 1));

  const move = (r: number, c: number) => {
    const nr = Math.max(0, Math.min(rows.length - 1, r));
    const nc = Math.max(0, Math.min(hours.length - 1, c));
    setFocus({ r: nr, c: nc });
    tableRef.current?.querySelector<HTMLElement>(`[data-cell="${nr}-${nc}"]`)?.focus();
  };

  const onKeyDown = (e: React.KeyboardEvent, r: number, c: number, aisleId: string) => {
    const keys: Record<string, () => void> = {
      ArrowRight: () => move(r, c + 1),
      ArrowLeft: () => move(r, c - 1),
      ArrowDown: () => move(r + 1, c),
      ArrowUp: () => move(r - 1, c),
      Home: () => move(r, 0),
      End: () => move(r, hours.length - 1),
      Enter: () => onSelect(aisleId),
      " ": () => onSelect(aisleId),
    };
    const fn = keys[e.key];
    if (fn) {
      e.preventDefault();
      fn();
    }
  };

  const describe = (aisle: string, hour: number, visits: number) => `${aisle}, ${formatHourRange(hour)}: ${formatNumber(visits)} aisle visits`;

  return (
    <Card id="peak" role="region" aria-labelledby="peak-title" className="min-w-0 scroll-mt-24">
      <CardHeader>
        <div>
          <CardTitle id="peak-title">Peak-Hour Analytics</CardTitle>
          <CardDescription>
            Tracked aisle visits by aisle and hour of operation · darker cells are busier · outlined cell = each aisle's peak
          </CardDescription>
        </div>
        <Legend max={max} fmt={fmt} />
      </CardHeader>
      <CardContent className={cn(busy && "opacity-60 transition-opacity")} aria-busy={busy || undefined}>
        {loading ? (
          <ChartSkeleton height={260} />
        ) : (
          <>
            <p className="mb-3 min-h-5 text-sm text-muted-foreground" aria-live="polite">
              {readout ??
                (busiest
                  ? `Busiest period: ${busiest.aisle} at ${formatHourRange(busiest.hour)} (${formatNumber(busiest.visits)} visits). Store-wide peak: ${
                      summary?.peakHour != null ? formatHourRange(summary.peakHour) : "—"
                    }.`
                  : "No measured traffic for this selection.")}
            </p>
            <p id={instructionsId} className="sr-only">
              Use the arrow keys to move between cells. Press Enter to open the aisle's details.
            </p>
            <div className="overflow-x-auto rounded-lg border border-border scrollbar-thin">
              <table ref={tableRef} className="w-full border-collapse text-xs" aria-describedby={instructionsId} onMouseLeave={() => setReadout(null)}>
                <caption className="sr-only">Aisle visits by aisle and hour</caption>
                <thead>
                  <tr className="bg-muted/60">
                    <th scope="col" className="sticky left-0 z-10 bg-muted px-3 py-2 text-left font-semibold text-muted-foreground">
                      Aisle
                    </th>
                    {hours.map((h) => (
                      <th
                        key={h}
                        scope="col"
                        className={cn(
                          "min-w-11 px-1 py-2 text-center font-semibold text-muted-foreground",
                          summary?.peakHour === h && "text-foreground",
                        )}
                      >
                        <abbr title={formatHourRange(h)} className="no-underline">
                          {formatHourShort(h)}
                        </abbr>
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {rows.map((row, r) => {
                    const name = label(row.aisleId, row.aisleName);
                    return (
                      <tr key={row.aisleId} className={cn(selectedAisleId === row.aisleId && "bg-primary-soft")}>
                        <th
                          scope="row"
                          className={cn(
                            "sticky left-0 z-10 bg-card px-3 py-1 text-left text-[13px] font-medium whitespace-nowrap text-foreground",
                            selectedAisleId === row.aisleId && "bg-primary-soft",
                          )}
                        >
                          <button
                            type="button"
                            className="rounded hover:underline focus-visible:outline-2 focus-visible:outline-ring"
                            onClick={() => onSelect(row.aisleId)}
                          >
                            {name}
                          </button>
                        </th>
                        {row.hourly.map((h, c) => {
                          const step = seqStep(h.visits, max);
                          const isPeak = h.hour === row.peakHour;
                          return (
                            <td key={h.hour} className="p-0.5">
                              <div
                                data-cell={`${r}-${c}`}
                                tabIndex={fr === r && fc === c ? 0 : -1}
                                role="button"
                                aria-label={`${describe(name, h.hour, h.visits)}${isPeak ? " — this aisle's peak hour" : ""}`}
                                onKeyDown={(e) => onKeyDown(e, r, c, row.aisleId)}
                                onFocus={() => {
                                  setFocus({ r, c });
                                  setReadout(describe(name, h.hour, h.visits));
                                }}
                                onMouseEnter={() => setReadout(describe(name, h.hour, h.visits))}
                                onClick={() => onSelect(row.aisleId)}
                                className={cn(
                                  "flex h-9 min-w-10 cursor-pointer items-center justify-center rounded-[4px] font-medium tabular transition-[box-shadow] outline-none",
                                  "hover:ring-2 hover:ring-foreground/40 focus-visible:ring-2 focus-visible:ring-ring",
                                  isPeak && "ring-2 ring-foreground/70 ring-inset",
                                  cellText(step),
                                )}
                                style={{ background: `var(--seq-${step})` }}
                              >
                                {fmt(h.visits)}
                              </div>
                            </td>
                          );
                        })}
                      </tr>
                    );
                  })}
                  {rows.length > 1 && (
                    <tr className="border-t border-border bg-muted/40">
                      <th scope="row" className="sticky left-0 z-10 bg-muted px-3 py-2 text-left text-[13px] font-semibold text-foreground">
                        All aisles
                      </th>
                      {summary?.hourly.map((h) => (
                        <td
                          key={h.hour}
                          className={cn(
                            "px-1 py-2 text-center font-semibold tabular text-muted-foreground",
                            summary.peakHour === h.hour && "text-foreground underline decoration-2 underline-offset-4",
                          )}
                        >
                          {fmt(h.visits)}
                          {summary.peakHour === h.hour && <span className="sr-only"> (store-wide peak)</span>}
                        </td>
                      ))}
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}

function Legend({ max, fmt }: { max: number; fmt: (n: number) => string }) {
  return (
    <div className="flex items-center gap-2 text-xs text-muted-foreground" aria-label={`Colour scale from 0 to ${fmt(max)} aisle visits`}>
      <span>Fewer</span>
      <span className="flex" aria-hidden="true">
        {[1, 2, 3, 4, 5, 6, 7].map((s) => (
          <span key={s} className="h-3 w-5 first:rounded-l-sm last:rounded-r-sm" style={{ background: `var(--seq-${s})` }} />
        ))}
      </span>
      <span>More ({fmt(max)})</span>
    </div>
  );
}
