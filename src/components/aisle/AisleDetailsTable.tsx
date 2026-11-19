import * as React from "react";
import {
  createColumnHelper,
  flexRender,
  getCoreRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  useReactTable,
  type SortingFn,
  type SortingState,
} from "@tanstack/react-table";
import { ArrowDown, ArrowDownRight, ArrowUp, ArrowUpDown, ArrowUpRight, ChevronLeft, ChevronRight, Search } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { CoverageBadge } from "@/components/shared/StatusBadge";
import { EmptyState } from "@/components/shared/EmptyState";
import { useAisleLabel } from "@/hooks/useAisleName";
import { cn } from "@/lib/utils";
import type { Aisle, TrafficSummary } from "@/types";
import { formatHourRange, formatNumber, formatPercent, formatSeconds } from "@/utils/formatters";

interface Row {
  id: string;
  name: string;
  visits: number | null;
  dwell: number | null;
  peak: number | null;
  trend: number | null;
  coverage: "full" | "partial" | "none";
  cameraId: string | null;
  note?: string;
}

/** Sort nulls ("not measured") last regardless of direction. */
const nullsLast: SortingFn<Row> = (a, b, columnId) => {
  const x = a.getValue<number | null>(columnId);
  const y = b.getValue<number | null>(columnId);
  if (x === null && y === null) return 0;
  if (x === null) return 1;
  if (y === null) return -1;
  return x - y;
};

const col = createColumnHelper<Row>();

/** Section F — sortable, searchable, filterable aisle details table (TanStack Table). */
export function AisleDetailsTable({
  summary,
  aisles,
  selectedId,
  onSelect,
}: {
  summary: TrafficSummary | null;
  aisles: Aisle[];
  selectedId: string | null;
  onSelect: (id: string) => void;
}) {
  const label = useAisleLabel();
  const [sorting, setSorting] = React.useState<SortingState>([{ id: "visits", desc: true }]);
  const [search, setSearch] = React.useState("");
  const [coverage, setCoverage] = React.useState<"all" | "full" | "partial" | "none">("all");
  const searchId = React.useId();
  const coverageId = React.useId();

  const data = React.useMemo<Row[]>(() => {
    if (!summary) return [];
    const measured: Row[] = summary.byAisle.map((s) => ({
      id: s.aisleId,
      name: label(s.aisleId, s.aisleName),
      visits: s.visits,
      dwell: s.avgDwellSeconds,
      peak: s.peakHour,
      trend: s.trendPct,
      coverage: s.coverage,
      cameraId: s.cameraIds[0] ?? null,
    }));
    const unmeasured: Row[] = summary.uncoveredAisles.map((u) => {
      const a = aisles.find((x) => x.id === u.aisleId);
      return {
        id: u.aisleId,
        name: label(u.aisleId, u.aisleName),
        visits: null,
        dwell: null,
        peak: null,
        trend: null,
        coverage: u.reason === "no_camera" ? "none" : (a?.coverage ?? "full"),
        cameraId: u.reason === "no_camera" ? null : (a?.cameraId ?? null),
        note: u.reason === "no_camera" ? "No camera coverage" : "Awaiting footage",
      };
    });
    return [...measured, ...unmeasured].filter((r) => coverage === "all" || r.coverage === coverage);
  }, [summary, aisles, label, coverage]);

  const columns = React.useMemo(
    () => [
      col.accessor("name", {
        header: "Aisle",
        cell: (info) => <span className="font-medium text-foreground">{info.getValue()}</span>,
      }),
      col.accessor("visits", {
        header: "Visits",
        sortingFn: nullsLast,
        cell: (info) => {
          const v = info.getValue();
          return v === null ? <span className="text-muted-foreground">Not measured</span> : <span className="tabular">{formatNumber(v)}</span>;
        },
      }),
      col.accessor("dwell", {
        header: "Average Dwell Time",
        sortingFn: nullsLast,
        cell: (info) => {
          const v = info.getValue();
          return v === null ? <span className="text-subtle">—</span> : <span className="tabular">{formatSeconds(v)}</span>;
        },
      }),
      col.accessor("peak", {
        header: "Peak Hour",
        sortingFn: nullsLast,
        cell: (info) => {
          const v = info.getValue();
          return v === null ? <span className="text-subtle">—</span> : formatHourRange(v);
        },
      }),
      col.accessor("trend", {
        header: "Traffic Trend",
        sortingFn: nullsLast,
        cell: (info) => {
          const v = info.getValue();
          if (v === null) return <span className="text-subtle">—</span>;
          const up = v >= 0;
          return (
            <span className={cn("inline-flex items-center gap-0.5 font-medium tabular", up ? "text-success-text" : "text-destructive-text")}>
              {up ? <ArrowUpRight className="size-3.5" aria-hidden="true" /> : <ArrowDownRight className="size-3.5" aria-hidden="true" />}
              <span className="sr-only">{up ? "Up" : "Down"} </span>
              {formatPercent(v)}
            </span>
          );
        },
      }),
      col.accessor("coverage", {
        header: "Camera Coverage",
        enableSorting: false,
        cell: (info) => (
          <span className="flex items-center gap-2">
            <CoverageBadge coverage={info.getValue()} />
            <span className="text-xs text-muted-foreground">{info.row.original.cameraId?.toUpperCase() ?? info.row.original.note}</span>
          </span>
        ),
      }),
    ],
    [],
  );

  const table = useReactTable({
    data,
    columns,
    state: { sorting, globalFilter: search },
    onSortingChange: setSorting,
    onGlobalFilterChange: setSearch,
    globalFilterFn: (row, _id, value: string) => row.original.name.toLowerCase().includes(value.toLowerCase()),
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    initialState: { pagination: { pageSize: 10 } },
  });

  const rows = table.getRowModel().rows;
  const filteredCount = table.getFilteredRowModel().rows.length;

  return (
    <Card role="region" aria-labelledby="aisle-table-title" className="min-w-0">
      <CardHeader>
        <div>
          <CardTitle id="aisle-table-title">Aisle Details</CardTitle>
          <CardDescription>All configured aisles for the current filters · select a row to inspect it on the layout</CardDescription>
        </div>
        <div className="flex w-full flex-wrap items-end gap-2 sm:w-auto">
          <div className="relative min-w-0 flex-1 sm:w-56 sm:flex-none">
            <label htmlFor={searchId} className="sr-only">
              Search aisles
            </label>
            <Search className="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-subtle" aria-hidden="true" />
            <Input id={searchId} value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search aisles…" className="pl-8" />
          </div>
          <div className="w-full sm:w-44">
            <label htmlFor={coverageId} className="sr-only">
              Filter by camera coverage
            </label>
            <Select value={coverage} onValueChange={(v) => setCoverage(v as typeof coverage)}>
              <SelectTrigger id={coverageId} aria-label="Filter by camera coverage">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All coverage</SelectItem>
                <SelectItem value="full">Full coverage</SelectItem>
                <SelectItem value="partial">Partial coverage</SelectItem>
                <SelectItem value="none">No coverage</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </CardHeader>
      <CardContent className="px-0 pb-0">
        {filteredCount === 0 ? (
          <div className="px-5 pb-5">
            <EmptyState
              title="No aisles match"
              description="Try a different search term or coverage filter."
              action={
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setSearch("");
                    setCoverage("all");
                  }}
                >
                  Clear table filters
                </Button>
              }
            />
          </div>
        ) : (
          <Table>
            <caption className="sr-only">
              Aisle details: visits, dwell time, peak hour, trend and camera coverage. Focus a row and press Enter to view it on the store layout.
            </caption>
            <TableHeader>
              {table.getHeaderGroups().map((hg) => (
                <TableRow key={hg.id} className="hover:bg-transparent">
                  {hg.headers.map((h) => {
                    const sorted = h.column.getIsSorted();
                    return (
                      <TableHead
                        key={h.id}
                        scope="col"
                        aria-sort={sorted === "asc" ? "ascending" : sorted === "desc" ? "descending" : h.column.getCanSort() ? "none" : undefined}
                      >
                        {h.column.getCanSort() ? (
                          <button
                            type="button"
                            onClick={h.column.getToggleSortingHandler()}
                            className="inline-flex items-center gap-1 rounded uppercase hover:text-foreground focus-visible:outline-2 focus-visible:outline-ring"
                          >
                            {flexRender(h.column.columnDef.header, h.getContext())}
                            {sorted === "asc" ? (
                              <ArrowUp className="size-3.5" aria-hidden="true" />
                            ) : sorted === "desc" ? (
                              <ArrowDown className="size-3.5" aria-hidden="true" />
                            ) : (
                              <ArrowUpDown className="size-3.5 opacity-50" aria-hidden="true" />
                            )}
                          </button>
                        ) : (
                          flexRender(h.column.columnDef.header, h.getContext())
                        )}
                      </TableHead>
                    );
                  })}
                </TableRow>
              ))}
            </TableHeader>
            <TableBody>
              {rows.map((r) => (
                <TableRow
                  key={r.id}
                  data-state={selectedId === r.original.id ? "selected" : undefined}
                  className="cursor-pointer"
                  tabIndex={0}
                  onClick={() => onSelect(r.original.id)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === " ") {
                      e.preventDefault();
                      onSelect(r.original.id);
                    }
                  }}
                >
                  {r.getVisibleCells().map((c) => (
                    <TableCell key={c.id}>{flexRender(c.column.columnDef.cell, c.getContext())}</TableCell>
                  ))}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
        <div className="flex flex-wrap items-center justify-between gap-2 border-t border-border px-5 py-3 text-xs text-muted-foreground">
          <span>
            {filteredCount} {filteredCount === 1 ? "aisle" : "aisles"} · "Not measured" aisles have no camera coverage or processed footage
          </span>
          {table.getPageCount() > 1 && (
            <div className="flex items-center gap-2">
              <Button variant="outline" size="icon-sm" onClick={() => table.previousPage()} disabled={!table.getCanPreviousPage()} aria-label="Previous page">
                <ChevronLeft />
              </Button>
              <span className="tabular">
                Page {table.getState().pagination.pageIndex + 1} of {table.getPageCount()}
              </span>
              <Button variant="outline" size="icon-sm" onClick={() => table.nextPage()} disabled={!table.getCanNextPage()} aria-label="Next page">
                <ChevronRight />
              </Button>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
