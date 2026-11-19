import { Link } from "react-router";
import { Bar, BarChart, Cell, ResponsiveContainer, Tooltip, XAxis } from "recharts";
import { ArrowDownRight, ArrowUpRight, Filter, MousePointerClick, PencilRuler, VideoOff } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Alert } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { CoverageBadge } from "@/components/shared/StatusBadge";
import { DemoBadge } from "@/components/shared/DemoBadge";
import { EmptyState } from "@/components/shared/EmptyState";
import { ChartTooltipBox } from "@/components/shared/ChartTooltip";
import { useAisleLabel } from "@/hooks/useAisleName";
import { cameraLabel } from "@/services/analyticsService";
import { CHART } from "@/lib/chart";
import { cn } from "@/lib/utils";
import type { Aisle, Camera, TrafficSummary } from "@/types";
import { formatHourRange, formatHourShort, formatNumber, formatPercent, formatSeconds } from "@/utils/formatters";
import { zoneState } from "./zoneState";

export function AisleDetailPanel({
  aisle,
  cameras,
  summary,
  aisleFilter,
  onFilterToAisle,
}: {
  aisle: Aisle | null;
  cameras: Camera[];
  summary: TrafficSummary | null;
  aisleFilter: string;
  onFilterToAisle: (id: string) => void;
}) {
  const label = useAisleLabel();
  if (!aisle) {
    return (
      <EmptyState
        icon={MousePointerClick}
        title="Select an aisle"
        description="Click or press Enter on an aisle in the store layout to see its visits, dwell time, peak hour and ranking."
        className="h-full"
      />
    );
  }
  const st = zoneState(aisle, summary, cameras);
  const camera = cameras.find((c) => c.id === aisle.cameraId);
  const name = label(aisle.id, aisle.name);

  return (
    <div className="flex h-full flex-col gap-4" aria-live="polite">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <p className="text-xs font-medium tracking-wide text-muted-foreground uppercase">Selected aisle</p>
          <h3 className="text-lg font-semibold tracking-tight">{name}</h3>
        </div>
        <DemoBadge label="Simulated" />
      </div>

      {st.kind === "measured" ? (
        <>
          <dl className="grid grid-cols-2 gap-3">
            <Stat label="Aisle visits" value={formatNumber(st.stat.visits)} />
            <Stat label="Avg dwell time" value={formatSeconds(st.stat.avgDwellSeconds)} />
            <Stat label="Peak hour" value={formatHourRange(st.stat.peakHour)} />
            <Stat
              label="Relative ranking"
              value={`#${st.rank} of ${st.of}`}
              extra={
                <Badge variant="outline" className="mt-1">
                  {st.levelLabel} traffic
                </Badge>
              }
            />
          </dl>
          <div className="flex items-center gap-2 text-sm">
            <span className="text-muted-foreground">Trend vs previous period:</span>
            <span className={cn("inline-flex items-center gap-0.5 font-semibold", st.stat.trendPct >= 0 ? "text-success-text" : "text-destructive-text")}>
              {st.stat.trendPct >= 0 ? <ArrowUpRight className="size-4" aria-hidden="true" /> : <ArrowDownRight className="size-4" aria-hidden="true" />}
              {formatPercent(st.stat.trendPct)}
            </span>
          </div>
          <div>
            <p className="mb-1 text-xs font-medium text-muted-foreground">Aisle visits by hour</p>
            <div className="h-24" aria-hidden="true">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={st.stat.hourly} margin={{ top: 4, right: 0, bottom: 0, left: 0 }}>
                  <XAxis dataKey="hour" tickFormatter={(h: number) => formatHourShort(h)} tick={{ fill: "var(--chart-axis)", fontSize: 10 }} tickLine={false} axisLine={false} interval="preserveStartEnd" />
                  <Tooltip
                    cursor={{ fill: "var(--muted)", opacity: 0.6 }}
                    content={({ active, payload }) => {
                      const p = active && payload?.length ? (payload[0].payload as { hour: number; visits: number }) : null;
                      return p ? <ChartTooltipBox title={formatHourRange(p.hour)} rows={[{ label: "Aisle visits", value: formatNumber(p.visits), color: CHART.series1 }]} /> : null;
                    }}
                  />
                  <Bar dataKey="visits" radius={[3, 3, 0, 0]} isAnimationActive={false}>
                    {st.stat.hourly.map((h) => (
                      <Cell key={h.hour} fill={CHART.series1} fillOpacity={h.hour === st.stat.peakHour ? 1 : 0.45} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
          <div className="rounded-lg border border-border bg-muted/40 p-3 text-sm">
            <p className="flex flex-wrap items-center gap-2">
              <span className="text-muted-foreground">Camera:</span>
              <span className="font-medium">{camera ? cameraLabel(camera) : "—"}</span>
              <CoverageBadge coverage={aisle.coverage} />
            </p>
            {aisle.coverage === "partial" && (
              <p className="mt-1 text-xs text-muted-foreground">Only part of this aisle is in frame, so visits may be undercounted.</p>
            )}
          </div>
          <div className="mt-auto flex flex-wrap gap-2">
            {aisleFilter !== aisle.id && (
              <Button size="sm" variant="outline" onClick={() => onFilterToAisle(aisle.id)}>
                <Filter /> Filter page to this aisle
              </Button>
            )}
            <Button size="sm" variant="ghost" asChild>
              <Link to="/cameras">
                <PencilRuler /> Edit aisle region
              </Link>
            </Button>
          </div>
        </>
      ) : st.kind === "no_camera" ? (
        <>
          <Alert variant="warning" title="No camera coverage" icon={<VideoOff aria-hidden="true" />}>
            No configured camera sees this area, so customer movement here is not measured. It is excluded from all traffic totals.
          </Alert>
          <Button size="sm" asChild className="self-start">
            <Link to="/cameras">Assign a camera</Link>
          </Button>
        </>
      ) : st.kind === "no_footage" ? (
        <Alert variant="info" title="Awaiting processed footage">
          {camera ? cameraLabel(camera) : "A camera"} is assigned, but no simulated metrics exist for this region yet. Upload and process footage in
          Data Management.
        </Alert>
      ) : (
        <Alert variant="info" title="Outside the current filter">
          This aisle is covered by {camera ? cameraLabel(camera) : "another camera"}, which is excluded by the camera filter.
        </Alert>
      )}
    </div>
  );
}

function Stat({ label, value, extra }: { label: string; value: string; extra?: React.ReactNode }) {
  return (
    <div className="rounded-lg border border-border p-3">
      <dt className="text-xs text-muted-foreground">{label}</dt>
      <dd className="mt-0.5 text-lg font-semibold tracking-tight tabular">{value}</dd>
      {extra}
    </div>
  );
}
