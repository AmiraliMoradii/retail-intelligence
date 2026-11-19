import { Link } from "react-router";
import { ArrowRight, PackageCheck } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { InventoryStatusBadge } from "@/components/shared/StatusBadge";
import { EmptyState } from "@/components/shared/EmptyState";
import type { InventoryRow } from "@/types";
import { formatNumber } from "@/utils/formatters";

/** Products whose forecast demand + safety stock exceeds available stock (stock-out risks first). */
export function InventoryAlerts({ rows, limit = 6 }: { rows: InventoryRow[]; limit?: number }) {
  const alerts = rows
    .filter((r) => r.recommendedOrder > 0)
    .sort((a, b) => {
      if (a.status !== b.status) return a.status === "stockout_risk" ? -1 : 1;
      return a.daysOfCover - b.daysOfCover;
    });
  const shown = alerts.slice(0, limit);

  return (
    <Card className="flex min-w-0 flex-col" role="region" aria-labelledby="inventory-alerts-title">
      <CardHeader>
        <div>
          <CardTitle id="inventory-alerts-title">Inventory Alerts</CardTitle>
          <CardDescription>
            {alerts.length} products need replenishment · {alerts.filter((a) => a.status === "stockout_risk").length} at potential stockout risk
          </CardDescription>
        </div>
      </CardHeader>
      <CardContent className="flex flex-1 flex-col">
        {shown.length === 0 ? (
          <EmptyState icon={PackageCheck} title="No replenishment needed" description="All products cover forecast demand plus safety stock." />
        ) : (
          <ul className="-mx-2 flex-1 divide-y divide-border">
            {shown.map((r) => (
              <li key={r.id}>
                <Link
                  to={`/inventory?product=${encodeURIComponent(r.id)}`}
                  className="group flex items-center gap-3 rounded-lg px-2 py-2.5 transition-colors hover:bg-muted focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-ring"
                >
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium text-foreground">{r.name}</p>
                    <p className="truncate text-xs text-muted-foreground tabular">
                      {formatNumber(r.currentStock)} on hand · {r.daysOfCover} days of cover · order {formatNumber(r.recommendedOrder)}
                    </p>
                  </div>
                  <InventoryStatusBadge status={r.status} />
                  <ArrowRight className="size-4 shrink-0 text-subtle transition-transform group-hover:translate-x-0.5" aria-hidden="true" />
                </Link>
              </li>
            ))}
          </ul>
        )}
        {alerts.length > 0 && (
          <Button asChild variant="outline" size="sm" className="mt-3 w-full">
            <Link to="/inventory?status=needs">
              View all {alerts.length} products <ArrowRight />
            </Link>
          </Button>
        )}
      </CardContent>
    </Card>
  );
}
