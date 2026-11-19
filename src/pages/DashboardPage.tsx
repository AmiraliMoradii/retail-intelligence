import { useMemo } from "react";
import { Link } from "react-router";
import { format, parseISO } from "date-fns";
import { toast } from "sonner";
import {
  Clock,
  Download,
  Footprints,
  PackageSearch,
  RefreshCw,
  Timer,
  TrendingUp,
  Trophy,
  VideoOff,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Alert } from "@/components/ui/alert";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { PageHeader, FilterBar, FilterField } from "@/components/shared/PageHeader";
import { DemoBadge } from "@/components/shared/DemoBadge";
import { ErrorState } from "@/components/shared/ErrorState";
import { EmptyState } from "@/components/shared/EmptyState";
import { DateRangeSelect } from "@/components/layout/Header";
import { KPICard } from "@/components/dashboard/KPICard";
import { TrafficChart } from "@/components/dashboard/TrafficChart";
import { AislePopularityChart } from "@/components/dashboard/AislePopularityChart";
import { SalesTrendChart } from "@/components/dashboard/SalesTrendChart";
import { InventoryAlerts } from "@/components/dashboard/InventoryAlerts";
import { useAppStore } from "@/store/useAppStore";
import { useTrafficSummary } from "@/hooks/useTraffic";
import { useInventorySummary } from "@/hooks/useInventory";
import { useAisleLabel } from "@/hooks/useAisleName";
import { DATE_RANGES } from "@/services/analyticsService";
import { downloadCsv } from "@/services/csvService";
import { simulateForecast } from "@/utils/calculations";
import { formatHourRange, formatMonth, formatNumber, formatPercent, formatSeconds } from "@/utils/formatters";

export default function DashboardPage() {
  const range = useAppStore((s) => s.filters.range);
  const rawAisleId = useAppStore((s) => s.filters.aisleId);
  const setFilters = useAppStore((s) => s.setFilters);
  const refresh = useAppStore((s) => s.refresh);
  const lastRefreshedAt = useAppStore((s) => s.lastRefreshedAt);
  const store = useAppStore((s) => s.store);
  const aisles = useAppStore((s) => s.aisles);
  const label = useAisleLabel();

  const aisleOptions = aisles.filter((a) => a.kind === "aisle");
  const selectedAisle = aisleOptions.find((a) => a.id === rawAisleId);
  // A filter that points at a deleted aisle region falls back to all aisles.
  const aisleId = selectedAisle ? rawAisleId : "all";

  const storeWide = useTrafficSummary({ range });
  const filtered = useTrafficSummary({ range, aisleId });
  const inventory = useInventorySummary();

  const scopeLabel = selectedAisle ? label(selectedAisle.id, selectedAisle.name) : "All aisles";
  const rangeLabel = DATE_RANGES.find((r) => r.value === range)?.label ?? "Today";
  const compareLabel = range === "today" ? "vs. same day last week" : "vs. previous period";

  const sw = storeWide.data;
  const f = filtered.data;
  const initialLoading = storeWide.initialLoading || filtered.initialLoading;
  const busy = (storeWide.loading || filtered.loading) && !initialLoading;
  const error = storeWide.error ?? filtered.error;

  const visitsDelta = f && f.previousTotalVisits > 0 ? ((f.totalVisits - f.previousTotalVisits) / f.previousTotalVisits) * 100 : null;
  const peakVisits = f?.hourly.find((h) => h.hour === f.peakHour)?.visits ?? 0;
  const most = sw?.mostVisited ?? null;
  const mostShare = most && sw?.totalVisits ? (most.visits / sw.totalVisits) * 100 : 0;
  const filteredNotMeasured = selectedAisle && f && f.byAisle.length === 0;

  const nextMonthLabel = useMemo(() => {
    const p = inventory.rows[0];
    const pt = p ? simulateForecast(p.id, p.history, 1, "chronos-2")[0] : undefined;
    const last = p?.history.at(-1)?.month;
    return pt && last ? `${formatMonth(pt.month)} forecast vs. ${formatMonth(last)} sales` : "Next month vs. last month";
  }, [inventory.rows]);

  const onRefresh = () => {
    refresh();
    toast.success("Demo data refreshed", {
      description: "Simulated values are deterministic, so figures stay consistent between refreshes.",
    });
  };

  const onExport = () => {
    if (!f || !sw) return;
    const rows: (string | number)[][] = [
      ["Store Overview — simulated demo data (CPSC 598 prototype)"],
      ["Store", `${store.name} (${store.location})`],
      ["Period", `${rangeLabel} · ${f.periodLabel}`],
      ["Aisle filter", scopeLabel],
      ["Exported at", new Date().toISOString()],
      [],
      ["KPI", "Value"],
      ["Total Aisle Visits", f.totalVisits],
      ["Most Visited Aisle (store-wide)", most ? `${most.aisleName} (${most.visits})` : "—"],
      ["Average Dwell Time (seconds)", Math.round(f.avgDwellSeconds)],
      ["Peak Traffic Hour", f.peakHour !== null ? formatHourRange(f.peakHour) : "—"],
      ["Products Needing Replenishment", inventory.needsReplenishment],
      ["Forecasted Demand Change (simulated)", formatPercent(inventory.demandChangePct)],
      [],
      ["Aisle", "Aisle visits", "Avg dwell (sec)", "Peak hour", `Trend ${compareLabel} (%)`, "Camera coverage"],
      ...f.byAisle.map((a) => [a.aisleName, a.visits, a.avgDwellSeconds, formatHourRange(a.peakHour), a.trendPct.toFixed(1), a.coverage]),
      ...f.uncoveredAisles.map((u) => [u.aisleName, "Not measured", "", "", "", u.reason === "no_camera" ? "No camera coverage" : "No processed footage"]),
      [],
      ["Hour", "Aisle visits"],
      ...f.hourly.map((h) => [formatHourRange(h.hour), h.visits]),
    ];
    downloadCsv(`store-overview_${range}_${aisleId}_${format(new Date(), "yyyyMMdd-HHmm")}.csv`, rows);
    toast.success("Summary exported", { description: "The CSV reflects the filters currently on screen." });
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Store Overview"
        description="Monitor customer traffic, inventory performance, and demand forecasts."
        eyebrow={
          <div className="flex flex-wrap items-center gap-2">
            <DemoBadge />
            <span className="text-xs text-muted-foreground">{f?.periodLabel ?? sw?.periodLabel}</span>
          </div>
        }
        actions={
          <>
            <span className="hidden text-xs text-muted-foreground sm:inline" aria-live="polite">
              Last updated {format(parseISO(lastRefreshedAt), "h:mm a")}
            </span>
            <Button variant="outline" onClick={onRefresh} loading={busy} aria-label="Refresh demo data">
              {!busy && <RefreshCw />} Refresh
            </Button>
            <Button onClick={onExport} disabled={!f || !sw}>
              <Download /> Export CSV
            </Button>
          </>
        }
      />

      <FilterBar>
        <FilterField label="Date range" htmlFor="overview-range">
          <DateRangeSelect id="overview-range" className="w-full sm:w-[11rem]" />
        </FilterField>
        <FilterField label="Aisle" htmlFor="overview-aisle">
          <Select value={aisleId} onValueChange={(v) => setFilters({ aisleId: v })}>
            <SelectTrigger id="overview-aisle" className="w-full sm:w-[13rem]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All aisles</SelectItem>
              {aisleOptions.map((a) => (
                <SelectItem key={a.id} value={a.id}>
                  {label(a.id, a.name)}
                  {!a.cameraId ? " (no camera coverage)" : ""}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </FilterField>
        {aisleId !== "all" && (
          <Button variant="ghost" size="sm" className="mb-0.5" onClick={() => setFilters({ aisleId: "all" })}>
            Clear aisle filter
          </Button>
        )}
        <p className="ml-auto hidden self-center text-xs text-muted-foreground xl:block">
          Traffic KPIs reflect {scopeLabel.toLowerCase() === "all aisles" ? "all measured aisles" : scopeLabel} · inventory KPIs cover all products
        </p>
      </FilterBar>

      {error ? (
        <ErrorState
          title="We couldn't load store traffic"
          description="The simulated analytics service did not respond. Please try again."
          onRetry={() => {
            storeWide.reload();
            filtered.reload();
          }}
        />
      ) : (
        <>
          <section aria-label="Key performance indicators" className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-6">
            <KPICard
              label="Total Aisle Visits"
              icon={Footprints}
              loading={initialLoading}
              value={filteredNotMeasured ? "Not measured" : formatNumber(f?.totalVisits ?? 0)}
              deltaPct={filteredNotMeasured ? null : visitsDelta}
              deltaLabel={filteredNotMeasured ? "No camera coverage" : compareLabel}
              to={selectedAisle ? `/aisles?aisle=${selectedAisle.id}` : "/aisles"}
            />
            <KPICard
              label="Most Visited Aisle"
              icon={Trophy}
              loading={initialLoading}
              value={most ? label(most.aisleId, most.aisleName) : "—"}
              hint={most ? `${formatNumber(most.visits)} visits · ${mostShare.toFixed(1)}% of all` : "No measured aisles"}
              to={most ? `/aisles?aisle=${most.aisleId}` : "/aisles"}
            />
            <KPICard
              label="Average Dwell Time"
              icon={Timer}
              loading={initialLoading}
              value={f && f.totalVisits ? formatSeconds(f.avgDwellSeconds) : "—"}
              hint="per aisle visit"
              to="/aisles#dwell"
            />
            <KPICard
              label="Peak Traffic Hour"
              icon={Clock}
              loading={initialLoading}
              value={f?.peakHour != null ? formatHourRange(f.peakHour) : "—"}
              hint={f?.peakHour != null ? `${formatNumber(peakVisits)} aisle visits in that hour` : "No measured traffic"}
              to="/aisles#peak"
            />
            <KPICard
              label="Products Needing Replenishment"
              icon={PackageSearch}
              tone={inventory.needsReplenishment > 0 ? "warning" : "success"}
              value={formatNumber(inventory.needsReplenishment)}
              hint={`${inventory.stockoutRisk} at potential stockout risk`}
              to="/inventory?status=needs"
            />
            <KPICard
              label="Forecasted Demand Change"
              icon={TrendingUp}
              value={formatPercent(inventory.demandChangePct)}
              hint={`${nextMonthLabel} · simulated`}
              to="/forecasting"
            />
          </section>

          {filteredNotMeasured ? (
            <EmptyState
              icon={VideoOff}
              title={`No camera coverage for ${scopeLabel}`}
              description="This aisle is not covered by a configured camera, so customer movement there is not measured. Assign a camera to the aisle region to start collecting traffic analytics."
              action={
                <>
                  <Button variant="outline" onClick={() => setFilters({ aisleId: "all" })}>
                    Show all aisles
                  </Button>
                  <Button asChild>
                    <Link to="/cameras">Configure cameras & aisles</Link>
                  </Button>
                </>
              }
            />
          ) : (
            <div className="grid grid-cols-1 gap-6 xl:grid-cols-3">
              <div className="min-w-0 xl:col-span-2">
                <TrafficChart summary={f} loading={initialLoading} busy={busy} scopeLabel={scopeLabel} />
              </div>
              <div className="min-w-0">
                <AislePopularityChart
                  summary={sw}
                  selectedAisleId={aisleId}
                  onSelect={(id) => setFilters({ aisleId: id })}
                  loading={initialLoading}
                  busy={busy}
                />
              </div>
            </div>
          )}

          <div className="grid grid-cols-1 gap-6 xl:grid-cols-3">
            <div className="min-w-0 xl:col-span-2">
              <SalesTrendChart rows={inventory.rows} forecastNextMonth={inventory.forecastNextMonth} />
            </div>
            <InventoryAlerts rows={inventory.rows} />
          </div>

          {sw && sw.uncoveredAisles.length > 0 && (
            <Alert variant="info" title="Some store areas are not measured">
              {sw.uncoveredAisles.map((u) => u.aisleName).join(", ")}{" "}
              {sw.uncoveredAisles.length === 1 ? "has" : "have"} no camera coverage or processed footage, so they are excluded from traffic
              totals. Aisle visits are counted only inside configured aisle regions seen by a camera.{" "}
              <Link to="/cameras" className="font-medium text-primary underline-offset-4 hover:underline">
                Review camera coverage
              </Link>
            </Alert>
          )}
        </>
      )}
    </div>
  );
}
