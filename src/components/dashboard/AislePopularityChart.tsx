import { Bar, BarChart, CartesianGrid, Cell, LabelList, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { ChartCard } from "@/components/shared/ChartCard";
import { ChartTooltipBox } from "@/components/shared/ChartTooltip";
import { ChartSkeleton } from "@/components/shared/LoadingState";
import { AXIS_PROPS, CHART } from "@/lib/chart";
import { useAisleLabel } from "@/hooks/useAisleName";
import type { TrafficSummary } from "@/types";
import { formatCompact, formatHourRange, formatNumber } from "@/utils/formatters";
import { usePrefersReducedMotion } from "./chartHooks";

export function AislePopularityChart({
  summary,
  selectedAisleId,
  onSelect,
  loading,
  busy,
}: {
  summary: TrafficSummary | null;
  selectedAisleId: string;
  onSelect: (aisleId: string) => void;
  loading?: boolean;
  busy?: boolean;
}) {
  const reduced = usePrefersReducedMotion();
  const label = useAisleLabel();
  const total = summary?.totalVisits ?? 0;
  const data = [...(summary?.byAisle ?? [])]
    .sort((a, b) => b.visits - a.visits)
    .map((s) => ({
      id: s.aisleId,
      name: label(s.aisleId, s.aisleName),
      visits: s.visits,
      share: total ? (s.visits / total) * 100 : 0,
      peak: s.peakHour,
    }));
  const top = data[0];

  return (
    <ChartCard
      title="Aisle Popularity"
      description="Aisle visits by aisle · click a bar to filter"
      busy={busy}
      summary={top ? `${top.name} is the most visited aisle with ${formatNumber(top.visits)} visits (${top.share.toFixed(1)}% of all aisle visits).` : undefined}
      table={{
        caption: "Aisle popularity",
        columns: ["Aisle", "Aisle visits", "Share"],
        rows: data.map((d) => [d.name, formatNumber(d.visits), `${d.share.toFixed(1)}%`]),
      }}
    >
      {loading ? (
        <ChartSkeleton height={280} />
      ) : (
        <div className="h-[280px]">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={data} layout="vertical" margin={{ top: 4, right: 44, bottom: 0, left: 0 }} barCategoryGap={8}>
              <CartesianGrid horizontal={false} stroke="var(--chart-grid)" />
              <XAxis type="number" {...AXIS_PROPS} allowDecimals={false} tickFormatter={(v: number) => formatCompact(v)} />
              <YAxis type="category" dataKey="name" {...AXIS_PROPS} width={96} tick={{ fill: "var(--foreground)", fontSize: 12 }} />
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
                        { label: "Share of visits", value: `${p.share.toFixed(1)}%` },
                        { label: "Peak hour", value: formatHourRange(p.peak) },
                      ]}
                      footer="Click to filter the dashboard"
                    />
                  );
                }}
              />
              <Bar
                dataKey="visits"
                name="Aisle visits"
                radius={[0, 4, 4, 0]}
                maxBarSize={22}
                isAnimationActive={!reduced}
                onClick={(_, index) => {
                  const d = data[index];
                  if (d) onSelect(d.id === selectedAisleId ? "all" : d.id);
                }}
                className="cursor-pointer"
              >
                {data.map((d) => (
                  <Cell
                    key={d.id}
                    fill={CHART.series1}
                    fillOpacity={selectedAisleId === "all" || selectedAisleId === d.id ? 1 : 0.3}
                  />
                ))}
                <LabelList
                  dataKey="visits"
                  position="right"
                  fill="var(--muted-foreground)"
                  fontSize={12}
                  formatter={(v) => formatNumber(Number(v))}
                />
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}
    </ChartCard>
  );
}
