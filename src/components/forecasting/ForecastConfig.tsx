import { Sparkles } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectGroup, SelectItem, SelectLabel, SelectTrigger, SelectValue } from "@/components/ui/select";
import { InventoryStatusBadge } from "@/components/shared/StatusBadge";
import type { ForecastModelOption, ForecastPeriod, InventoryRow } from "@/types";
import { PRODUCT_CATEGORIES } from "@/data/mockInventory";
import { MODEL_OPTIONS, PERIOD_OPTIONS } from "@/components/inventory/labels";
import { formatNumber } from "@/utils/formatters";

export function ForecastConfig({
  rows,
  productId,
  period,
  model,
  loading,
  onProductChange,
  onPeriodChange,
  onModelChange,
  onGenerate,
}: {
  rows: InventoryRow[];
  productId: string;
  period: ForecastPeriod;
  model: ForecastModelOption;
  loading: boolean;
  onProductChange: (id: string) => void;
  onPeriodChange: (p: ForecastPeriod) => void;
  onModelChange: (m: ForecastModelOption) => void;
  onGenerate: () => void;
}) {
  const selected = rows.find((r) => r.id === productId);
  const groups = [...PRODUCT_CATEGORIES, "Uncategorized" as const]
    .map((c) => ({ category: c, items: rows.filter((r) => r.category === c).sort((a, b) => a.name.localeCompare(b.name)) }))
    .filter((g) => g.items.length > 0);

  return (
    <Card role="region" aria-labelledby="forecast-config-title" className="flex flex-col">
      <CardHeader>
        <div>
          <CardTitle id="forecast-config-title">Forecast Configuration</CardTitle>
          <CardDescription>Choose a product, horizon and planned model</CardDescription>
        </div>
      </CardHeader>
      <CardContent className="flex flex-1 flex-col gap-4">
        <form
          className="flex flex-1 flex-col gap-4"
          onSubmit={(e) => {
            e.preventDefault();
            onGenerate();
          }}
        >
          <div className="space-y-1.5">
            <Label htmlFor="fc-product">Product</Label>
            <Select value={productId} onValueChange={onProductChange}>
              <SelectTrigger id="fc-product">
                <SelectValue placeholder="Select a product" />
              </SelectTrigger>
              <SelectContent className="max-h-80">
                {groups.map((g) => (
                  <SelectGroup key={g.category}>
                    <SelectLabel>{g.category}</SelectLabel>
                    {g.items.map((r) => (
                      <SelectItem key={r.id} value={r.id}>
                        {r.name} <span className="text-muted-foreground">· {r.id}</span>
                      </SelectItem>
                    ))}
                  </SelectGroup>
                ))}
              </SelectContent>
            </Select>
            {selected && (
              <div className="mt-2 space-y-2 rounded-lg border border-border bg-muted/40 p-3 text-xs">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-muted-foreground">{selected.unit}</span>
                  <InventoryStatusBadge status={selected.status} />
                </div>
                <dl className="grid grid-cols-3 gap-2">
                  <div>
                    <dt className="text-muted-foreground">On hand</dt>
                    <dd className="font-semibold text-foreground tabular">{formatNumber(selected.currentStock)}</dd>
                  </div>
                  <div>
                    <dt className="text-muted-foreground">Last month</dt>
                    <dd className="font-semibold text-foreground tabular">{formatNumber(selected.lastMonthSales)}</dd>
                  </div>
                  <div>
                    <dt className="text-muted-foreground">History</dt>
                    <dd className="font-semibold text-foreground tabular">{selected.history.length} mo</dd>
                  </div>
                </dl>
              </div>
            )}
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="fc-period">Forecast period</Label>
            <Select value={String(period)} onValueChange={(v) => onPeriodChange(Number(v) as ForecastPeriod)}>
              <SelectTrigger id="fc-period">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {PERIOD_OPTIONS.map((p) => (
                  <SelectItem key={p.value} value={String(p.value)}>
                    {p.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="fc-model">Forecasting model</Label>
            <Select value={model} onValueChange={(v) => onModelChange(v as ForecastModelOption)}>
              <SelectTrigger id="fc-model" aria-describedby="fc-model-hint">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {MODEL_OPTIONS.map((m) => (
                  <SelectItem key={m.value} value={m.value}>
                    {m.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p id="fc-model-hint" className="text-helper">
              {MODEL_OPTIONS.find((m) => m.value === model)?.hint}. No model is executed in this prototype.
            </p>
          </div>

          <div className="mt-auto pt-1">
            <Button type="submit" className="w-full" loading={loading} disabled={!selected}>
              {loading ? (
                "Generating simulated forecast…"
              ) : (
                <>
                  <Sparkles /> Generate Forecast
                </>
              )}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
