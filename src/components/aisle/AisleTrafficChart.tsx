import { Bar, BarChart, CartesianGrid, Cell, LabelList, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { ChartCard } from "@/components/shared/ChartCard";
import { ChartTooltipBox } from "@/components/shared/ChartTooltip";
import { ChartSkeleton } from "@/components/shared/LoadingState";
import { AXIS_PROPS, CHART } from "@/lib/chart";
import { useAisleLabel } from "@/hooks/useAisleName";
import { usePrefersReducedMotion } from "@/components/dashboard/chartHooks";
import type { TrafficSummary } from "@/types";
import { formatCompact, formatHourRange, formatNumber, formatPercent } from "@/utils/formatters";

/** Section B — Aisle Traffic Comparison (column chart, sorted by visits). */
export function AisleTrafficChart({
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
  const reduced = usePrefersReducedMotion();
  const label = useAisleLabel();
  const data = [...(summary?.byAisle ?? [])]
    .sort((a, b) => b.visits - a.visits)
    .map((s) => ({ id: s.aisleId, name: label(s.aisleId, s.aisleName), visits: s.visits, trend: s.trendPct, peak: s.peakHour }));
  const top = data[0];
  const bottom = data[data.length - 1];

  return (
    <ChartCard
      title="Aisle Traffic Comparison"
      description="Aisle visits per aisle for the selected filters · click a column to inspect the aisle"
      busy={busy}
      summary={
        top && bottom
          ? `${top.name} has the most aisle visits (${formatNumber(top.visits)}); ${bottom.name} has the fewest (${formatNumber(bottom.visits)}).`
          : undefined
      }
      table={{
        caption: "Aisle visits by aisle",
        columns: ["Aisle", "Aisle visits", "Trend vs previous", "Peak hour"],
        rows: data.map((d) => [d.name, formatNumber(d.visits), formatPercent(d.trend), formatHourRange(d.peak)]),
      }}
    >
      {loading ? (
        <ChartSkeleton height={300} />
      ) : (
        <div className="h-[300px]">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={data} margin={{ top: 20, right: 8, bottom: 0, left: -8 }} barCategoryGap="22%">
              <CartesianGrid vertical={false} stroke="var(--chart-grid)" />
              <XAxis dataKey="name" {...AXIS_PROPS} interval={0} tick={{ fill: "var(--foreground)", fontSize: 12 }} />
              <YAxis {...AXIS_PROPS} width={44} allowDecimals={false} tickFormatter={(v: number) => formatCompact(v)} />
              <Tooltip
                cursor={{ fill: "var(--muted)", opacity: 0.6 }}
                content={({ active, payload }) => {
                  const p = active && payload?.length ? (payload[0].payload as (typeof data)[number]) : null;
                  if (!p) return null;
                  return (
                    <ChartTooltipBox
                      title={p.name}
                      rows={[
                        { label: "Aisle visits", value: formatNumber(p.visits), color: CHART.series1 },
                        { label: "Trend vs previous", value: formatPercent(p.trend) },
                        { label: "Peak hour", value: formatHourRange(p.peak) },
                      ]}
                      footer="Click to view aisle details"
                    />
                  );
                }}
              />
              <Bar
                dataKey="visits"
                name="Aisle visits"
                radius={[4, 4, 0, 0]}
                maxBarSize={56}
                isAnimationActive={!reduced}
                className="cursor-pointer"
                onClick={(_, index) => {
                  const d = data[index];
                  if (d) onSelect(d.id);
                }}
              >
                {data.map((d) => (
                  <Cell key={d.id} fill={CHART.series1} fillOpacity={!selectedAisleId || selectedAisleId === d.id ? 1 : 0.35} />
                ))}
                <LabelList dataKey="visits" position="top" fill="var(--muted-foreground)" fontSize={12} formatter={(v) => formatNumber(Number(v))} />
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}
    </ChartCard>
  );
}
