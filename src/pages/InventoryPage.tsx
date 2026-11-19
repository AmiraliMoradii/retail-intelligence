import * as React from "react";
import { Link, useLocation, useNavigate, useSearchParams } from "react-router";
import { format } from "date-fns";
import { toast } from "sonner";
import { AlertOctagon, AlertTriangle, Boxes, Download, FileUp, Layers, Search, TrendingUp, X } from "lucide-react";
import { PageHeader, FilterBar, FilterField } from "@/components/shared/PageHeader";
import { DemoBadge } from "@/components/shared/DemoBadge";
import { EmptyState } from "@/components/shared/EmptyState";
import { KPICard } from "@/components/dashboard/KPICard";
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Alert } from "@/components/ui/alert";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { InventoryTable } from "@/components/inventory/InventoryTable";
import { ProductDetails } from "@/components/inventory/ProductDetails";
import { STATUS_FILTERS, STATUS_RANK, type StatusFilter } from "@/components/inventory/labels";
import { useInventorySummary } from "@/hooks/useInventory";
import { useAppStore } from "@/store/useAppStore";
import { downloadCsv } from "@/services/csvService";
import { PRODUCT_CATEGORIES } from "@/data/mockInventory";
import { STATUS_META } from "@/utils/calculations";
import { formatDateTime, formatNumber } from "@/utils/formatters";
import type { InventoryRow } from "@/types";
import { cn } from "@/lib/utils";

const VALID_STATUS = new Set(STATUS_FILTERS.map((s) => s.value));

export default function InventoryPage() {
  const [params, setParams] = useSearchParams();
  const navigate = useNavigate();
  const location = useLocation();
  const summary = useInventorySummary();
  const { rows } = summary;
  const importBatches = useAppStore((s) => s.importBatches);
  const dateFormat = useAppStore((s) => s.settings.dateFormat);

  const rawStatus = params.get("status") ?? "all";
  const status: StatusFilter = VALID_STATUS.has(rawStatus as StatusFilter) ? (rawStatus as StatusFilter) : "all";
  const q = params.get("q") ?? "";
  const category = params.get("category") ?? "all";
  const importedOnly = params.get("imported") === "1";
  const productId = params.get("product");

  const updateParam = (key: string, value: string | null) => {
    setParams(
      (prev) => {
        const next = new URLSearchParams(prev);
        if (value === null || value === "" || value === "all") next.delete(key);
        else next.set(key, value);
        return next;
      },
      { replace: true },
    );
  };

  const clearFilters = () =>
    setParams(
      (prev) => {
        const next = new URLSearchParams();
        const p = prev.get("product");
        if (p) next.set("product", p);
        return next;
      },
      { replace: true },
    );

  const categories = React.useMemo(() => {
    const present = new Set(rows.map((r) => r.category));
    return [...PRODUCT_CATEGORIES, "Uncategorized" as const].filter((c) => present.has(c));
  }, [rows]);

  const filtered = React.useMemo(() => {
    const needle = q.trim().toLowerCase();
    return rows
      .filter((r) => {
        if (status === "needs" && r.recommendedOrder <= 0) return false;
        if (status !== "all" && status !== "needs" && r.status !== status) return false;
        if (category !== "all" && r.category !== category) return false;
        if (importedOnly && !r.importedAt) return false;
        if (needle && !r.name.toLowerCase().includes(needle) && !r.id.toLowerCase().includes(needle)) return false;
        return true;
      })
      .sort((a, b) => STATUS_RANK[a.status] - STATUS_RANK[b.status] || b.recommendedOrder - a.recommendedOrder);
  }, [rows, q, status, category, importedOnly]);

  const hasFilters = status !== "all" || q !== "" || category !== "all" || importedOnly;
  const selected: InventoryRow | null = productId ? (rows.find((r) => r.id === productId) ?? null) : null;

  const openProduct = React.useCallback(
    (id: string) => {
      const next = new URLSearchParams(params);
      next.set("product", id);
      navigate({ search: `?${next.toString()}` }, { state: { productFromList: true } });
    },
    [navigate, params],
  );

  const closeProduct = () => {
    if ((location.state as { productFromList?: boolean } | null)?.productFromList) {
      navigate(-1);
    } else {
      updateParam("product", null);
    }
  };

  const statusHref = (s: StatusFilter) => (s === "all" ? "/inventory" : `/inventory?status=${s}`);

  const exportCsv = () => {
    if (!filtered.length) {
      toast.error("Nothing to export", { description: "No products match the current filters." });
      return;
    }
    downloadCsv(
      `inventory_${format(new Date(), "yyyy-MM-dd")}.csv`,
      filtered.map((r) => [
        r.id,
        r.name,
        r.category,
        r.unit,
        r.currentStock,
        r.lastOrderedQuantity,
        r.lastMonthSales,
        r.forecastDemand,
        STATUS_META[r.status].label,
        r.recommendedOrder,
      ]),
      [
        "product_id",
        "product_name",
        "category",
        "unit",
        "current_stock",
        "last_ordered_quantity",
        "last_month_sales",
        "forecast_demand_next_month_simulated",
        "inventory_status",
        "recommended_order",
      ],
    );
    toast.success("Inventory exported", { description: `${filtered.length} products saved as CSV (demo data).` });
  };

  const latestBatch = importBatches[0];

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow={<DemoBadge />}
        title="Inventory Management"
        description="Review historical sales, inventory records, and replenishment needs."
        actions={
          <>
            <Button variant="outline" asChild>
              <Link to="/data">
                <FileUp /> Import CSV
              </Link>
            </Button>
            <Button variant="outline" onClick={exportCsv}>
              <Download /> Export CSV
            </Button>
            <Button asChild>
              <Link to="/forecasting">
                <TrendingUp /> Demand forecasting
              </Link>
            </Button>
          </>
        }
      />

      <section aria-label="Inventory summary" className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <KPICard
          label="Total Products"
          value={formatNumber(summary.total)}
          icon={Boxes}
          hint={`${categories.length} categories`}
          to={statusHref("all")}
          className={cn(!hasFilters && "border-primary/40 ring-2 ring-primary/15")}
        />
        <KPICard
          label="Products Needing Replenishment"
          value={formatNumber(summary.needsReplenishment)}
          icon={AlertTriangle}
          tone="warning"
          hint="Recommended order above 0"
          to={statusHref("needs")}
          className={cn(status === "needs" && "border-primary/40 ring-2 ring-primary/15")}
        />
        <KPICard
          label="Potential Stockout Risk"
          value={formatNumber(summary.stockoutRisk)}
          icon={AlertOctagon}
          tone="destructive"
          hint="< 35% of next month's demand on hand"
          to={statusHref("stockout_risk")}
          className={cn(status === "stockout_risk" && "border-primary/40 ring-2 ring-primary/15")}
        />
        <KPICard
          label="Potential Excess Inventory"
          value={formatNumber(summary.overstock)}
          icon={Layers}
          hint="> 160% of demand + safety stock"
          to={statusHref("overstock")}
          className={cn(status === "overstock" && "border-primary/40 ring-2 ring-primary/15")}
        />
      </section>

      {latestBatch && (
        <Alert
          variant="success"
          title={`Imported ${formatNumber(latestBatch.rowCount)} records from ${latestBatch.fileName}`}
          className="items-start"
        >
          {formatDateTime(latestBatch.importedAt, dateFormat)} · {latestBatch.productIds.length} products updated
          {latestBatch.newProductIds.length > 0 && <>, {latestBatch.newProductIds.length} new</>}. Forecasts and recommendations were
          recalculated.
          {!importedOnly && (
            <Button variant="link" size="sm" className="ml-1 h-auto align-baseline text-[13px]" onClick={() => updateParam("imported", "1")}>
              Show recently imported
            </Button>
          )}
        </Alert>
      )}

      <FilterBar>
        <FilterField label="Search products" htmlFor="inv-search" className="min-w-[14rem] sm:flex-1">
          <div className="relative">
            <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" aria-hidden="true" />
            <Input
              id="inv-search"
              type="search"
              placeholder="Name or product ID"
              className="pl-9"
              value={q}
              onChange={(e) => updateParam("q", e.target.value)}
            />
          </div>
        </FilterField>
        <FilterField label="Category" htmlFor="inv-category">
          <Select value={category} onValueChange={(v) => updateParam("category", v)}>
            <SelectTrigger id="inv-category" className="sm:w-44">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All categories</SelectItem>
              {categories.map((c) => (
                <SelectItem key={c} value={c}>
                  {c}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </FilterField>
        <FilterField label="Inventory status" htmlFor="inv-status">
          <Select value={status} onValueChange={(v) => updateParam("status", v)}>
            <SelectTrigger id="inv-status" className="sm:w-56">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {STATUS_FILTERS.map((s) => (
                <SelectItem key={s.value} value={s.value}>
                  {s.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </FilterField>
        <div className="flex h-9 items-center gap-2 self-end">
          <Switch
            id="inv-imported"
            checked={importedOnly}
            onCheckedChange={(v) => updateParam("imported", v ? "1" : null)}
            disabled={!rows.some((r) => r.importedAt) && !importedOnly}
          />
          <label htmlFor="inv-imported" className="text-sm font-medium whitespace-nowrap">
            Recently imported
          </label>
        </div>
        {hasFilters && (
          <Button variant="ghost" className="self-end" onClick={clearFilters}>
            <X /> Clear filters
          </Button>
        )}
      </FilterBar>

      <Card className="overflow-hidden">
        <CardHeader className="border-b border-border pb-4">
          <div>
            <CardTitle>Products</CardTitle>
            <CardDescription>
              <span aria-live="polite">
                {formatNumber(filtered.length)} of {formatNumber(rows.length)} products
                {hasFilters ? " match your filters" : ""}
              </span>{" "}
              · Forecast demand and recommendations are simulated.
            </CardDescription>
          </div>
          <Button variant="outline" size="sm" onClick={exportCsv}>
            <Download /> Export {hasFilters ? "filtered" : "all"}
          </Button>
        </CardHeader>
        {rows.length === 0 ? (
          <div className="p-5">
            <EmptyState
              icon={Boxes}
              title="No inventory records"
              description="Import a CSV of historical sales and orders to see products, forecasts and recommended orders."
              action={
                <Button asChild>
                  <Link to="/data">
                    <FileUp /> Go to Data Management
                  </Link>
                </Button>
              }
            />
          </div>
        ) : filtered.length === 0 ? (
          <div className="p-5">
            <EmptyState
              icon={Search}
              title="No products match these filters"
              description="Try a different search term, category or status."
              action={
                <Button variant="outline" onClick={clearFilters}>
                  <X /> Clear filters
                </Button>
              }
            />
          </div>
        ) : (
          <InventoryTable rows={filtered} onOpen={openProduct} selectedId={productId} />
        )}
      </Card>

      <ProductDetails
        row={selected}
        open={Boolean(productId)}
        onOpenChange={(open) => {
          if (!open) closeProduct();
        }}
      />
    </div>
  );
}
