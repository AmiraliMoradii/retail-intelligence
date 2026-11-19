import { useCallback, useEffect, useRef, useState } from "react";
import { Link, useLocation, useSearchParams } from "react-router";
import { Clock, Footprints, Info, RotateCcw, Timer, TrendingDown, Trophy, VideoOff } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { PageHeader, FilterBar, FilterField } from "@/components/shared/PageHeader";
import { DemoBadge } from "@/components/shared/DemoBadge";
import { ErrorState } from "@/components/shared/ErrorState";
import { EmptyState } from "@/components/shared/EmptyState";
import { InfoTip } from "@/components/shared/InfoTip";
import { KpiSkeletonRow } from "@/components/shared/LoadingState";
import { DateRangeSelect } from "@/components/layout/Header";
import { KPICard } from "@/components/dashboard/KPICard";
import { usePrefersReducedMotion } from "@/components/dashboard/chartHooks";
import { AisleTrafficChart } from "@/components/aisle/AisleTrafficChart";
import { DwellTimeChart, DWELL_DEFINITION } from "@/components/aisle/DwellTimeChart";
import { PeakHourMatrix } from "@/components/aisle/PeakHourMatrix";
import { TrafficHeatmap, HeatmapLegend } from "@/components/aisle/TrafficHeatmap";
import { AisleDetailPanel } from "@/components/aisle/AisleDetailPanel";
import { AisleDetailsTable } from "@/components/aisle/AisleDetailsTable";
import { useAppStore } from "@/store/useAppStore";
import { useTrafficSummary } from "@/hooks/useTraffic";
import { useAisleLabel } from "@/hooks/useAisleName";
import { TIME_WINDOWS, cameraLabel } from "@/services/analyticsService";
import type { TimeWindowKey } from "@/types";
import { formatHourRange, formatNumber, formatSeconds } from "@/utils/formatters";

export default function AisleAnalyticsPage() {
  const range = useAppStore((s) => s.filters.range);
  const aisles = useAppStore((s) => s.aisles);
  const cameras = useAppStore((s) => s.cameras);
  const label = useAisleLabel();
  const reduced = usePrefersReducedMotion();
  const location = useLocation();
  const [searchParams, setSearchParams] = useSearchParams();

  const [timeWindow, setTimeWindow] = useState<TimeWindowKey>("all");
  const [aisleFilter, setAisleFilter] = useState<string>("all");
  const [cameraFilter, setCameraFilter] = useState<string>("all");

  const selectedId = searchParams.get("aisle");
  const setSelected = useCallback(
    (id: string | null) => {
      setSearchParams(
        (prev) => {
          const next = new URLSearchParams(prev);
          if (id) next.set("aisle", id);
          else next.delete("aisle");
          return next;
        },
        { replace: true },
      );
    },
    [setSearchParams],
  );

  const summaryQ = useTrafficSummary({ range, timeWindow, aisleId: aisleFilter, cameraId: cameraFilter });
  const fullQ = useTrafficSummary({ range, timeWindow, cameraId: cameraFilter });
  const summary = summaryQ.data;
  const full = fullQ.data;
  const initialLoading = summaryQ.initialLoading || fullQ.initialLoading;
  const busy = (summaryQ.loading || fullQ.loading) && !initialLoading;
  const error = summaryQ.error ?? fullQ.error;

  // Deep links such as /aisles#dwell, /aisles#peak or /aisles?aisle=snacks#heatmap scroll once data is on screen.
  const scrolledFor = useRef<string | null>(null);
  useEffect(() => {
    if (initialLoading || !location.hash) return;
    if (scrolledFor.current === location.key) return;
    scrolledFor.current = location.key;
    const el = document.getElementById(location.hash.slice(1));
    if (el) requestAnimationFrame(() => el.scrollIntoView({ behavior: reduced ? "auto" : "smooth", block: "start" }));
  }, [initialLoading, location.hash, location.key, reduced]);

  const selectAndReveal = (id: string) => {
    setSelected(id);
    document.getElementById("heatmap")?.scrollIntoView({ behavior: reduced ? "auto" : "smooth", block: "start" });
  };

  const aisleOptions = aisles.filter((a) => a.kind === "aisle");
  const selectedAisle = aisles.find((a) => a.id === selectedId) ?? null;
  const filtersActive = timeWindow !== "all" || aisleFilter !== "all" || cameraFilter !== "all";
  const resetFilters = () => {
    setTimeWindow("all");
    setAisleFilter("all");
    setCameraFilter("all");
  };

  const delta =
    summary && summary.previousTotalVisits > 0 ? ((summary.totalVisits - summary.previousTotalVisits) / summary.previousTotalVisits) * 100 : null;
  const compareLabel = range === "today" ? "vs. same day last week" : "vs. previous period";
  const hasData = !!summary && summary.byAisle.length > 0;
  const most = summary?.mostVisited ?? null;
  const least = summary?.leastVisited ?? null;
  const peakVisits = summary?.hourly.find((h) => h.hour === summary.peakHour)?.visits ?? 0;
  const windowLabel = TIME_WINDOWS.find((w) => w.value === timeWindow)?.label ?? "";

  return (
    <div className="space-y-6">
      <PageHeader
        title="Aisle Analytics"
        description="Understand customer movement, aisle popularity, and shopping patterns."
        eyebrow={
          <div className="flex flex-wrap items-center gap-2">
            <DemoBadge />
            <span className="text-xs text-muted-foreground">
              {summary?.periodLabel ?? full?.periodLabel} · {windowLabel}
            </span>
          </div>
        }
      />

      <FilterBar>
        <FilterField label="Date range" htmlFor="aisles-range">
          <DateRangeSelect id="aisles-range" className="w-full sm:w-[11rem]" />
        </FilterField>
        <FilterField label="Time range" htmlFor="aisles-window">
          <Select value={timeWindow} onValueChange={(v) => setTimeWindow(v as TimeWindowKey)}>
            <SelectTrigger id="aisles-window" className="w-full sm:w-[13.5rem]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {TIME_WINDOWS.map((w) => (
                <SelectItem key={w.value} value={w.value}>
                  {w.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </FilterField>
        <FilterField label="Aisle" htmlFor="aisles-aisle">
          <Select value={aisleFilter} onValueChange={setAisleFilter}>
            <SelectTrigger id="aisles-aisle" className="w-full sm:w-[12.5rem]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All aisles</SelectItem>
              {aisleOptions.map((a) => (
                <SelectItem key={a.id} value={a.id}>
                  {label(a.id, a.name)}
                  {!a.cameraId ? " (no coverage)" : ""}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </FilterField>
        <FilterField label="Camera" htmlFor="aisles-camera">
          <Select value={cameraFilter} onValueChange={setCameraFilter}>
            <SelectTrigger id="aisles-camera" className="w-full sm:w-[13.5rem]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All cameras</SelectItem>
              {cameras.map((c) => (
                <SelectItem key={c.id} value={c.id}>
                  {cameraLabel(c)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </FilterField>
        {filtersActive && (
          <Button variant="ghost" size="sm" className="mb-0.5" onClick={resetFilters}>
            <RotateCcw /> Reset filters
          </Button>
        )}
      </FilterBar>

      <p className="flex items-start gap-2 rounded-lg border border-border bg-card px-4 py-3 text-sm text-muted-foreground">
        <Info className="mt-0.5 size-4 shrink-0 text-primary" aria-hidden="true" />
        <span>
          <strong className="font-semibold text-foreground">Aisle visits, not unique customers.</strong> A visit is counted each time a tracked
          person enters a configured aisle region. Track IDs are temporary and camera-local, people are not matched across cameras, and
          re-entering an aisle creates another visit.
        </span>
      </p>

      {error ? (
        <ErrorState
          title="We couldn't load aisle analytics"
          description="The simulated analytics service did not respond. Please try again."
          onRetry={() => {
            summaryQ.reload();
            fullQ.reload();
          }}
        />
      ) : (
        <>
          {/* Section A — KPIs */}
          {initialLoading ? (
            <KpiSkeletonRow count={5} />
          ) : (
            <section aria-label="Aisle traffic KPIs" className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
              <KPICard
                label="Total Aisle Visits"
                icon={Footprints}
                value={hasData ? formatNumber(summary!.totalVisits) : "—"}
                deltaPct={hasData ? delta : null}
                deltaLabel={hasData ? compareLabel : "No measured aisles"}
              />
              <KPICard
                label="Average Dwell Time"
                icon={Timer}
                value={hasData ? formatSeconds(summary!.avgDwellSeconds) : "—"}
                hint={
                  <span className="inline-flex items-center gap-0.5">
                    per aisle visit <InfoTip label="What is dwell time?">{DWELL_DEFINITION}</InfoTip>
                  </span>
                }
              />
              <KPICard
                label="Most Visited Aisle"
                icon={Trophy}
                value={most ? label(most.aisleId, most.aisleName) : "—"}
                hint={most ? `${formatNumber(most.visits)} visits` : undefined}
                to={most ? `/aisles?aisle=${most.aisleId}#heatmap` : undefined}
              />
              <KPICard
                label="Least Visited Aisle"
                icon={TrendingDown}
                value={least ? label(least.aisleId, least.aisleName) : "—"}
                hint={least ? `${formatNumber(least.visits)} visits` : undefined}
                to={least ? `/aisles?aisle=${least.aisleId}#heatmap` : undefined}
              />
              <KPICard
                label="Peak Traffic Hour"
                icon={Clock}
                value={summary?.peakHour != null && hasData ? formatHourRange(summary.peakHour) : "—"}
                hint={hasData ? `${formatNumber(peakVisits)} aisle visits` : undefined}
              />
            </section>
          )}

          {!initialLoading && !hasData ? (
            <EmptyState
              icon={VideoOff}
              title="No camera coverage for this selection"
              description={
                summary && summary.uncoveredAisles.length > 0
                  ? `${summary.uncoveredAisles.map((u) => u.aisleName).join(", ")} ${
                      summary.uncoveredAisles.length === 1 ? "is" : "are"
                    } not covered by a configured camera with processed footage, so no aisle visits are measured.`
                  : "No measured aisles match these filters. Customer movement is only measured inside aisle regions seen by a camera."
              }
              action={
                <>
                  <Button variant="outline" onClick={resetFilters}>
                    Reset filters
                  </Button>
                  <Button asChild>
                    <Link to="/cameras">Configure cameras & aisles</Link>
                  </Button>
                </>
              }
            />
          ) : (
            <>
              {/* Sections B + C */}
              <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
                <AisleTrafficChart summary={summary} selectedAisleId={selectedId} onSelect={selectAndReveal} loading={initialLoading} busy={busy} />
                <div id="dwell" className="min-w-0 scroll-mt-24">
                  <DwellTimeChart summary={summary} selectedAisleId={selectedId} onSelect={selectAndReveal} loading={initialLoading} busy={busy} />
                </div>
              </div>

              {/* Section D */}
              <PeakHourMatrix summary={summary} selectedAisleId={selectedId} onSelect={selectAndReveal} loading={initialLoading} busy={busy} />
            </>
          )}

          {/* Section E — store traffic heatmap */}
          <Card id="heatmap" role="region" aria-labelledby="heatmap-title" className="min-w-0 scroll-mt-24">
            <CardHeader>
              <div>
                <CardTitle id="heatmap-title" className="flex items-center gap-2">
                  Store Traffic Heatmap <DemoBadge label="Simulated" />
                </CardTitle>
                <CardDescription>
                  Simplified 2D floor plan shaded by relative aisle-visit intensity for the selected period and time range. Select an aisle for details.
                </CardDescription>
              </div>
            </CardHeader>
            <CardContent className={busy ? "opacity-60 transition-opacity" : undefined}>
              <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
                <div className="min-w-0 space-y-3 lg:col-span-2">
                  <div className="overflow-x-auto rounded-lg border border-border bg-muted/30 p-2 scrollbar-thin">
                    <div className="min-w-[560px]">
                      <TrafficHeatmap aisles={aisles} cameras={cameras} summary={full} selectedId={selectedId} onSelect={setSelected} />
                    </div>
                  </div>
                  <HeatmapLegend />
                </div>
                <div className="min-w-0 rounded-lg border border-border p-4">
                  <AisleDetailPanel
                    aisle={selectedAisle}
                    cameras={cameras}
                    summary={full}
                    aisleFilter={aisleFilter}
                    onFilterToAisle={(id) => setAisleFilter(id)}
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Section F */}
          <AisleDetailsTable summary={summary} aisles={aisles} selectedId={selectedId} onSelect={selectAndReveal} />
        </>
      )}
    </div>
  );
}
