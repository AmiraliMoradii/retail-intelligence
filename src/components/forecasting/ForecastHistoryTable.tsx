import * as React from "react";
import { History, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { EmptyState } from "@/components/shared/EmptyState";
import { useAppStore } from "@/store/useAppStore";
import type { ForecastHistoryEntry } from "@/types";
import { formatDateTime, formatNumber } from "@/utils/formatters";
import { modelLabel, periodLabel } from "@/components/inventory/labels";

export function ForecastHistoryTable({ onSelect }: { onSelect: (entry: ForecastHistoryEntry) => void }) {
  const history = useAppStore((s) => s.forecastHistory);
  const clear = useAppStore((s) => s.clearForecastHistory);
  const dateFormat = useAppStore((s) => s.settings.dateFormat);
  const [confirmOpen, setConfirmOpen] = React.useState(false);

  return (
    <Card className="overflow-hidden" role="region" aria-labelledby="forecast-history-title">
      <CardHeader className="border-b border-border pb-4">
        <div>
          <CardTitle id="forecast-history-title">Forecast History</CardTitle>
          <CardDescription>Previously generated simulated forecasts · select a row to load its settings</CardDescription>
        </div>
        {history.length > 0 && (
          <Button variant="outline" size="sm" onClick={() => setConfirmOpen(true)}>
            <Trash2 /> Clear history
          </Button>
        )}
      </CardHeader>
      {history.length === 0 ? (
        <div className="p-5">
          <EmptyState
            icon={History}
            title="No forecasts generated yet"
            description="Generate a simulated forecast above and it will appear here with its recommended order."
          />
        </div>
      ) : (
        <Table>
          <caption className="sr-only">Forecast history</caption>
          <TableHeader>
            <TableRow className="hover:bg-transparent">
              <TableHead scope="col">Product</TableHead>
              <TableHead scope="col">Forecast Period</TableHead>
              <TableHead scope="col">Model</TableHead>
              <TableHead scope="col">Forecast Date</TableHead>
              <TableHead scope="col" className="text-right">
                Predicted Demand
              </TableHead>
              <TableHead scope="col" className="text-right">
                Recommended Order
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {history.map((h) => (
              <TableRow key={h.id} className="cursor-pointer" onClick={() => onSelect(h)}>
                <TableCell>
                  <button
                    type="button"
                    className="text-left font-medium hover:text-primary hover:underline focus-visible:rounded-sm focus-visible:outline-2 focus-visible:outline-ring"
                    onClick={(e) => {
                      e.stopPropagation();
                      onSelect(h);
                    }}
                    aria-label={`Load forecast settings for ${h.productName}, ${periodLabel(h.periodMonths)}, ${modelLabel(h.model)}`}
                  >
                    {h.productName}
                  </button>
                  <span className="block font-mono text-[11px] text-muted-foreground">{h.productId}</span>
                </TableCell>
                <TableCell>{periodLabel(h.periodMonths)}</TableCell>
                <TableCell>
                  <span className="flex items-center gap-1.5">
                    {modelLabel(h.model)}
                    <Badge variant="secondary" className="text-[10.5px]">
                      Simulated
                    </Badge>
                  </span>
                </TableCell>
                <TableCell className="text-muted-foreground">{formatDateTime(h.generatedAt, dateFormat)}</TableCell>
                <TableCell className="text-right tabular">{formatNumber(h.predictedDemand)} units</TableCell>
                <TableCell className="text-right font-semibold tabular">{formatNumber(h.recommendedOrder)} units</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}

      <Dialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Clear forecast history?</DialogTitle>
            <DialogDescription>
              This removes all {history.length} saved simulated forecasts from this browser. Inventory data is not affected.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setConfirmOpen(false)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={() => {
                clear();
                setConfirmOpen(false);
                toast.success("Forecast history cleared");
              }}
            >
              <Trash2 /> Clear history
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
}
