import * as React from "react";
import {
  createColumnHelper,
  flexRender,
  getCoreRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  useReactTable,
  type SortingState,
} from "@tanstack/react-table";
import { ArrowDown, ArrowUp, ArrowUpDown, ChevronLeft, ChevronRight, FileUp } from "lucide-react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { InventoryStatusBadge } from "@/components/shared/StatusBadge";
import type { InventoryRow } from "@/types";
import { formatNumber } from "@/utils/formatters";
import { STATUS_RANK } from "./labels";
import { cn } from "@/lib/utils";

const col = createColumnHelper<InventoryRow>();

const numberCell = (v: number) => <span className="tabular">{formatNumber(v)}</span>;

export function InventoryTable({
  rows,
  onOpen,
  selectedId,
}: {
  rows: InventoryRow[];
  onOpen: (id: string) => void;
  selectedId?: string | null;
}) {
  const [sorting, setSorting] = React.useState<SortingState>([]);

  const columns = React.useMemo(
    () => [
      col.accessor("id", {
        header: "Product ID",
        cell: (c) => <span className="font-mono text-xs text-muted-foreground">{c.getValue()}</span>,
      }),
      col.accessor("name", {
        header: "Product Name",
        cell: (c) => {
          const r = c.row.original;
          return (
            <div className="flex min-w-[10.5rem] items-center gap-2">
              <div className="min-w-0">
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    onOpen(r.id);
                  }}
                  className="text-left font-medium text-foreground hover:text-primary hover:underline focus-visible:rounded-sm focus-visible:outline-2 focus-visible:outline-ring"
                  aria-label={`${r.name}, open product details`}
                >
                  {r.name}
                </button>
                <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
                  {r.unit}
                  {r.importedAt && (
                    <Badge variant="outline" className="px-1.5 py-0 text-[10.5px]">
                      <FileUp aria-hidden="true" /> Imported
                    </Badge>
                  )}
                </p>
              </div>
            </div>
          );
        },
      }),
      col.accessor("category", { header: "Category", cell: (c) => <span className="text-muted-foreground">{c.getValue()}</span> }),
      col.accessor("currentStock", { header: "Current Stock", cell: (c) => numberCell(c.getValue()), meta: { numeric: true } }),
      col.accessor("lastOrderedQuantity", { header: "Last Ordered Qty.", cell: (c) => numberCell(c.getValue()), meta: { numeric: true } }),
      col.accessor("lastMonthSales", { header: "Last Month Sales", cell: (c) => numberCell(c.getValue()), meta: { numeric: true } }),
      col.accessor("forecastDemand", {
        header: "Forecast Demand",
        cell: (c) => numberCell(c.getValue()),
        meta: { numeric: true, hint: "Next month · simulated" },
      }),
      col.accessor("status", {
        header: "Inventory Status",
        cell: (c) => <InventoryStatusBadge status={c.getValue()} />,
        sortingFn: (a, b) => STATUS_RANK[a.original.status] - STATUS_RANK[b.original.status],
      }),
      col.accessor("recommendedOrder", {
        header: "Recommended Order",
        cell: (c) => {
          const v = c.getValue();
          return v > 0 ? (
            <span className="font-semibold text-foreground tabular">{formatNumber(v)}</span>
          ) : (
            <span className="text-muted-foreground tabular">0</span>
          );
        },
        meta: { numeric: true },
      }),
    ],
    [onOpen],
  );

  const table = useReactTable({
    data: rows,
    columns,
    state: { sorting },
    initialState: { pagination: { pageIndex: 0, pageSize: 10 } },
    onSortingChange: setSorting,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    getRowId: (r) => r.id,
  });

  const { pageIndex, pageSize } = table.getState().pagination;
  const total = rows.length;
  const from = total === 0 ? 0 : pageIndex * pageSize + 1;
  const to = Math.min(total, (pageIndex + 1) * pageSize);

  return (
    <div>
      <Table>
        <caption className="sr-only">
          Inventory products. Column headers are buttons that sort the table. Select a product name to open its details.
        </caption>
        <TableHeader>
          {table.getHeaderGroups().map((hg) => (
            <TableRow key={hg.id} className="hover:bg-transparent">
              {hg.headers.map((header) => {
                const sorted = header.column.getIsSorted();
                const meta = header.column.columnDef.meta as { numeric?: boolean; hint?: string } | undefined;
                return (
                  <TableHead
                    key={header.id}
                    scope="col"
                    aria-sort={sorted === "asc" ? "ascending" : sorted === "desc" ? "descending" : "none"}
                    className={cn(meta?.numeric && "text-right whitespace-normal")}
                  >
                    <button
                      type="button"
                      onClick={header.column.getToggleSortingHandler()}
                      className={cn(
                        "inline-flex items-center gap-1 rounded-sm uppercase transition-colors hover:text-foreground focus-visible:outline-2 focus-visible:outline-ring",
                        sorted && "text-foreground",
                        meta?.numeric && "max-w-[6.5rem] flex-row-reverse text-right leading-tight",
                      )}
                    >
                      {flexRender(header.column.columnDef.header, header.getContext())}
                      {sorted === "asc" ? (
                        <ArrowUp className="size-3.5" aria-hidden="true" />
                      ) : sorted === "desc" ? (
                        <ArrowDown className="size-3.5" aria-hidden="true" />
                      ) : (
                        <ArrowUpDown className="size-3.5 opacity-40" aria-hidden="true" />
                      )}
                    </button>
                    {meta?.hint && <span className="block text-[10px] font-normal tracking-normal normal-case text-subtle">{meta.hint}</span>}
                  </TableHead>
                );
              })}
            </TableRow>
          ))}
        </TableHeader>
        <TableBody>
          {table.getRowModel().rows.map((row) => (
            <TableRow
              key={row.id}
              data-state={selectedId === row.id ? "selected" : undefined}
              className="cursor-pointer"
              onClick={() => onOpen(row.id)}
            >
              {row.getVisibleCells().map((cell) => {
                const meta = cell.column.columnDef.meta as { numeric?: boolean } | undefined;
                return (
                  <TableCell key={cell.id} className={cn(meta?.numeric && "text-right")}>
                    {flexRender(cell.column.columnDef.cell, cell.getContext())}
                  </TableCell>
                );
              })}
            </TableRow>
          ))}
        </TableBody>
      </Table>

      <div className="flex flex-col gap-3 border-t border-border px-5 py-3 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-sm text-muted-foreground" aria-live="polite">
          Showing <span className="font-medium text-foreground tabular">{from}</span>–<span className="font-medium text-foreground tabular">{to}</span> of{" "}
          <span className="font-medium text-foreground tabular">{total}</span> products
        </p>
        <div className="flex flex-wrap items-center gap-2">
          <label htmlFor="inv-page-size" className="text-sm text-muted-foreground">
            Rows per page
          </label>
          <Select value={String(pageSize)} onValueChange={(v) => table.setPageSize(Number(v))}>
            <SelectTrigger id="inv-page-size" size="sm" className="w-[4.5rem]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="10">10</SelectItem>
              <SelectItem value="20">20</SelectItem>
            </SelectContent>
          </Select>
          <span className="px-1 text-sm text-muted-foreground tabular">
            Page {pageIndex + 1} of {Math.max(1, table.getPageCount())}
          </span>
          <Button
            variant="outline"
            size="icon-sm"
            onClick={() => table.previousPage()}
            disabled={!table.getCanPreviousPage()}
            aria-label="Previous page"
          >
            <ChevronLeft />
          </Button>
          <Button variant="outline" size="icon-sm" onClick={() => table.nextPage()} disabled={!table.getCanNextPage()} aria-label="Next page">
            <ChevronRight />
          </Button>
        </div>
      </div>
    </div>
  );
}
