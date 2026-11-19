import { Link } from "react-router";
import { ArrowRight, CalendarClock, DollarSign, FileUp, Package, Ruler, ShieldCheck, Truck } from "lucide-react";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { InventoryStatusBadge } from "@/components/shared/StatusBadge";
import { DemoBadge } from "@/components/shared/DemoBadge";
import { InfoTip } from "@/components/shared/InfoTip";
import { ProductHistoryChart } from "./ProductHistoryChart";
import type { InventoryRow } from "@/types";
import { STATUS_META } from "@/utils/calculations";
import { formatCurrency, formatDate, formatMonth, formatNumber } from "@/utils/formatters";
import { useAppStore } from "@/store/useAppStore";
import { cn } from "@/lib/utils";

function Stat({ label, value, hint, tone }: { label: string; value: string; hint?: string; tone?: "warning" | "destructive" | "success" }) {
  return (
    <div className="rounded-lg border border-border bg-card p-3">
      <p className="text-xs font-medium text-muted-foreground">{label}</p>
      <p
        className={cn(
          "mt-0.5 text-xl font-semibold tracking-tight tabular",
          tone === "destructive" && "text-destructive-text",
          tone === "warning" && "text-warning-text",
          tone === "success" && "text-success-text",
        )}
      >
        {value}
      </p>
      {hint && <p className="mt-0.5 text-[11px] text-muted-foreground">{hint}</p>}
    </div>
  );
}

export function ProductDetails({
  row,
  open,
  onOpenChange,
}: {
  row: InventoryRow | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const dateFormat = useAppStore((s) => s.settings.dateFormat);

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="sm:max-w-2xl">
        {row ? (
          <>
            <SheetHeader>
              <div className="flex flex-wrap items-center gap-2">
                <InventoryStatusBadge status={row.status} />
                {row.importedAt && (
                  <Badge variant="outline">
                    <FileUp aria-hidden="true" /> Imported {formatDate(row.importedAt, dateFormat)}
                  </Badge>
                )}
              </div>
              <SheetTitle className="mt-1">{row.name}</SheetTitle>
              <SheetDescription>
                <span className="font-mono">{row.id}</span> · {row.category} · {row.unit}
              </SheetDescription>
            </SheetHeader>

            <div className="flex-1 space-y-5 overflow-y-auto px-6 py-5 scrollbar-thin">
              <section aria-labelledby="pd-inventory" className="space-y-3">
                <div className="flex items-center justify-between gap-2">
                  <h3 id="pd-inventory" className="text-card-title">
                    Inventory position
                  </h3>
                  <DemoBadge />
                </div>
                <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                  <Stat label="Current stock" value={formatNumber(row.currentStock)} hint="units on hand" />
                  <Stat label="Forecast demand" value={formatNumber(row.forecastDemand)} hint="next month · simulated" />
                  <Stat
                    label="Days of cover"
                    value={`${row.daysOfCover} days`}
                    hint="at forecast pace"
                    tone={row.status === "stockout_risk" ? "destructive" : row.status === "replenish" ? "warning" : undefined}
                  />
                  <Stat
                    label="Recommended order"
                    value={formatNumber(row.recommendedOrder)}
                    hint="units"
                    tone={row.recommendedOrder > 0 ? "warning" : "success"}
                  />
                </div>
                <p className="text-xs text-muted-foreground">{STATUS_META[row.status].description}</p>
              </section>

              <section aria-labelledby="pd-recommendation" className="rounded-xl border border-border bg-muted/40 p-4">
                <div className="flex items-center gap-1">
                  <h3 id="pd-recommendation" className="text-card-title">
                    Recommended replenishment
                  </h3>
                  <InfoTip label="How the recommendation is calculated">
                    Recommended Order = max(0, Forecast Demand + Safety Stock − Current Stock − Incoming Inventory). The forecast is a simulated
                    placeholder until Chronos-2 / TimesFM 2.5 are integrated.
                  </InfoTip>
                </div>
                <p className="mt-2 font-mono text-[13px] leading-6 text-foreground tabular">
                  max(0, {formatNumber(row.forecastDemand)} + {formatNumber(row.safetyStock)} − {formatNumber(row.currentStock)} −{" "}
                  {formatNumber(row.incomingStock)}) = <strong>{formatNumber(row.recommendedOrder)} units</strong>
                </p>
                <p className="mt-1 text-xs text-muted-foreground">Forecast demand + safety stock − current stock − incoming inventory</p>
              </section>

              <section aria-labelledby="pd-info">
                <h3 id="pd-info" className="mb-2 text-card-title">
                  Product information
                </h3>
                <dl className="grid grid-cols-1 gap-x-6 gap-y-2.5 text-sm sm:grid-cols-2">
                  {[
                    { icon: Ruler, label: "Unit", value: row.unit },
                    { icon: DollarSign, label: "Unit cost", value: formatCurrency(row.unitCost) },
                    { icon: CalendarClock, label: "Supplier lead time", value: `${row.supplierLeadTimeDays} days` },
                    { icon: ShieldCheck, label: "Safety stock", value: `${formatNumber(row.safetyStock)} units` },
                    { icon: Truck, label: "Incoming inventory", value: `${formatNumber(row.incomingStock)} units` },
                    { icon: Package, label: "Last ordered quantity", value: `${formatNumber(row.lastOrderedQuantity)} units` },
                  ].map((item) => (
                    <div key={item.label} className="flex items-center justify-between gap-3 border-b border-border pb-2">
                      <dt className="flex items-center gap-2 text-muted-foreground">
                        <item.icon className="size-4" aria-hidden="true" />
                        {item.label}
                      </dt>
                      <dd className="font-medium tabular">{item.value}</dd>
                    </div>
                  ))}
                </dl>
              </section>

              <ProductHistoryChart productName={row.name} history={row.history} />

              <section aria-labelledby="pd-monthly">
                <h3 id="pd-monthly" className="mb-2 text-card-title">
                  Monthly records
                </h3>
                <div className="overflow-hidden rounded-lg border border-border">
                  <Table wrapperClassName="max-h-72">
                    <caption className="sr-only">Monthly sold and ordered quantities for {row.name}</caption>
                    <TableHeader>
                      <TableRow>
                        <TableHead scope="col">Month</TableHead>
                        <TableHead scope="col" className="text-right">
                          Sold
                        </TableHead>
                        <TableHead scope="col" className="text-right">
                          Ordered
                        </TableHead>
                        <TableHead scope="col" className="text-right">
                          Ordered − sold
                        </TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {[...row.history].reverse().map((h) => {
                        const diff = h.orderedQuantity - h.soldQuantity;
                        return (
                          <TableRow key={h.month}>
                            <TableCell className="font-medium">{formatMonth(h.month)}</TableCell>
                            <TableCell className="text-right tabular">{formatNumber(h.soldQuantity)}</TableCell>
                            <TableCell className="text-right tabular">{formatNumber(h.orderedQuantity)}</TableCell>
                            <TableCell className="text-right text-muted-foreground tabular">
                              {diff > 0 ? "+" : diff < 0 ? "−" : ""}
                              {formatNumber(Math.abs(diff))}
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                </div>
              </section>
            </div>

            <div className="flex flex-col-reverse gap-2 border-t border-border px-6 py-4 sm:flex-row sm:items-center sm:justify-between">
              <p className="text-xs text-muted-foreground">Generate a simulated forecast and adjust the order on the forecasting page.</p>
              <Button asChild>
                <Link to={`/forecasting?product=${encodeURIComponent(row.id)}`}>
                  View Demand Forecast <ArrowRight />
                </Link>
              </Button>
            </div>
          </>
        ) : (
          <SheetHeader>
            <SheetTitle>Product not found</SheetTitle>
            <SheetDescription>This product is no longer in the inventory dataset.</SheetDescription>
          </SheetHeader>
        )}
      </SheetContent>
    </Sheet>
  );
}
