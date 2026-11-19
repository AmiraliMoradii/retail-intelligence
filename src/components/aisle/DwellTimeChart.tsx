import { Bar, BarChart, CartesianGrid, Cell, LabelList, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { ChartCard } from "@/components/shared/ChartCard";
import { ChartTooltipBox } from "@/components/shared/ChartTooltip";
import { ChartSkeleton } from "@/components/shared/LoadingState";
import { InfoTip } from "@/components/shared/InfoTip";
import { AXIS_PROPS, CHART } from "@/lib/chart";
import { useAisleLabel } from "@/hooks/useAisleName";
import { usePrefersReducedMotion } from "@/components/dashboard/chartHooks";
import type { TrafficSummary } from "@/types";
import { formatNumber, formatSeconds } from "@/utils/formatters";

export const DWELL_DEFINITION =
  "Dwell time is the average time a tracked person spends inside the aisle region per visit. Repeated entries into the same aisle count as separate visits.";

/** Section C — average dwell time per aisle (horizontal bars, store average as a reference line). */
export function DwellTimeChart({
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
    .sort((a, b) => b.avgDwellSeconds - a.avgDwellSeconds)
    .map((s) => ({ id: s.aisleId, name: label(s.aisleId, s.aisleName), dwell: Math.round(s.avgDwellSeconds), visits: s.visits }));
  const avg = summary?.avgDwellSeconds ?? 0;
  const top = data[0];

  return (
    <ChartCard
      title={
        <span className="inline-flex items-center gap-1">
          Dwell-Time Analysis <InfoTip label="What is dwell time?">{DWELL_DEFINITION}</InfoTip>
        </span>
      }
      description={`Average seconds per aisle visit · dashed line = visit-weighted average (${formatSeconds(avg)})`}
      busy={busy}
      summary={top ? `Shoppers stay longest in ${top.name} (${formatSeconds(top.dwell)} per visit). The visit-weighted average is ${formatSeconds(avg)}.` : undefined}
      table={{
        caption: "Average dwell time by aisle",
        columns: ["Aisle", "Average dwell time", "Aisle visits"],
        rows: data.map((d) => [d.name, formatSeconds(d.dwell), formatNumber(d.visits)]),
      }}
    >
      {loading ? (
        <ChartSkeleton height={300} />
      ) : (
        <div className="h-[300px]">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={data} layout="vertical" margin={{ top: 18, right: 52, bottom: 0, left: 0 }} barCategoryGap={8}>
              <CartesianGrid horizontal={false} stroke="var(--chart-grid)" />
              <XAxis type="number" {...AXIS_PROPS} allowDecimals={false} unit="s" />
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
                        { label: "Avg dwell time", value: formatSeconds(p.dwell), color: CHART.series1 },
                        { label: "Aisle visits", value: formatNumber(p.visits) },
                        { label: "vs. store average", value: `${p.dwell - Math.round(avg) >= 0 ? "+" : "−"}${Math.abs(p.dwell - Math.round(avg))} sec` },
                      ]}
                    />
                  );
                }}
              />
              <ReferenceLine
                x={avg}
                stroke="var(--chart-axis)"
                strokeDasharray="4 4"
                label={{ value: `Avg ${Math.round(avg)}s`, position: "top", fill: "var(--muted-foreground)", fontSize: 11 }}
              />
              <Bar
                dataKey="dwell"
                name="Average dwell time"
                radius={[0, 4, 4, 0]}
                maxBarSize={22}
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
                <LabelList dataKey="dwell" position="right" fill="var(--muted-foreground)" fontSize={12} formatter={(v) => `${v} sec`} />
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}
    </ChartCard>
  );
}
