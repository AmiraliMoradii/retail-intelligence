import { useState } from "react";
import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { ChartCard } from "@/components/shared/ChartCard";
import { ChartTooltipBox } from "@/components/shared/ChartTooltip";
import { ChartSkeleton } from "@/components/shared/LoadingState";
import { AXIS_PROPS, CHART } from "@/lib/chart";
import { cn } from "@/lib/utils";
import type { TrafficSummary } from "@/types";
import { formatCompact, formatHourRange, formatHourShort, formatNumber } from "@/utils/formatters";
import { usePrefersReducedMotion } from "./chartHooks";

type Mode = "hourly" | "daily";

export function TrafficChart({
  summary,
  loading,
  busy,
  scopeLabel,
}: {
  summary: TrafficSummary | null;
  loading?: boolean;
  busy?: boolean;
  /** e.g. "All aisles" or "Snacks" */
  scopeLabel: string;
}) {
  const reduced = usePrefersReducedMotion();
  const [modePref, setModePref] = useState<Mode>("hourly");
  const multiDay = summary ? summary.query.range !== "today" : false;
  const mode: Mode = multiDay ? modePref : "hourly";

  type Pt = { key: string; label: string; full: string; visits: number };
  const hourly: Pt[] = summary?.hourly.map((p) => ({ key: String(p.hour), label: formatHourShort(p.hour), full: formatHourRange(p.hour), visits: p.visits })) ?? [];
  const daily: Pt[] = summary?.daily.map((d) => ({ key: d.date, label: d.label, full: d.label, visits: d.visits })) ?? [];
  const data: Pt[] = mode === "hourly" ? hourly : daily;
  const peak = hourly.reduce<Pt | null>((b, p) => (!b || p.visits > b.visits ? p : b), null);

  const toggle = multiDay ? (
    <div role="group" aria-label="Time granularity" className="inline-flex rounded-md border border-border bg-muted p-0.5">
      {(["hourly", "daily"] as const).map((m) => (
        <button
          key={m}
          type="button"
          aria-pressed={mode === m}
          onClick={() => setModePref(m)}
          className={cn(
            "h-7 rounded-[5px] px-2.5 text-xs font-medium text-muted-foreground capitalize transition-colors focus-visible:outline-2 focus-visible:outline-ring",
            mode === m && "bg-card text-foreground shadow-sm",
          )}
        >
          {m}
        </button>
      ))}
    </div>
  ) : null;

  return (
    <ChartCard
      title="Customer Traffic Over Time"
      description={
        mode === "hourly"
          ? `Aisle visits by hour of day · ${scopeLabel}${multiDay ? " · summed over the period" : ""}`
          : `Aisle visits per day · ${scopeLabel}`
      }
      actions={toggle}
      busy={busy}
      summary={peak ? `Traffic for ${scopeLabel} peaks at ${peak.full} with ${formatNumber(peak.visits)} aisle visits.` : undefined}
      table={{
        caption: `Customer traffic ${mode} — ${scopeLabel}`,
        columns: [mode === "hourly" ? "Hour" : "Date", "Aisle visits"],
        rows: data.map((d) => [d.full, formatNumber(d.visits)]),
      }}
    >
      {loading ? (
        <ChartSkeleton height={280} />
      ) : (
        <div className="h-[280px]">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={data} margin={{ top: 8, right: 8, bottom: 0, left: -8 }}>
              <defs>
                <linearGradient id="traffic-fill" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor={CHART.series1} stopOpacity={0.18} />
                  <stop offset="100%" stopColor={CHART.series1} stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid vertical={false} stroke="var(--chart-grid)" />
              <XAxis dataKey="label" {...AXIS_PROPS} interval="preserveStartEnd" minTickGap={16} />
              <YAxis {...AXIS_PROPS} width={44} allowDecimals={false} tickFormatter={(v: number) => formatCompact(v)} />
              <Tooltip
                cursor={{ stroke: "var(--chart-axis)", strokeWidth: 1, strokeDasharray: "4 4" }}
                content={({ active, payload }) => {
                  const p = active && payload?.length ? (payload[0].payload as Pt) : null;
                  if (!p) return null;
                  return (
                    <ChartTooltipBox title={p.full} rows={[{ label: "Aisle visits", value: formatNumber(p.visits), color: CHART.series1 }]} />
                  );
                }}
              />
              <Area
                type="monotone"
                dataKey="visits"
                name="Aisle visits"
                stroke={CHART.series1}
                strokeWidth={2}
                fill="url(#traffic-fill)"
                isAnimationActive={!reduced}
                dot={false}
                activeDot={{ r: 5, stroke: "var(--card)", strokeWidth: 2, fill: CHART.series1 }}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      )}
    </ChartCard>
  );
}
