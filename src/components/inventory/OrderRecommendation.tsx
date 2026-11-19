import * as React from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Calculator, Equal, FlaskConical, Minus, Plus, RotateCcw } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { InfoTip } from "@/components/shared/InfoTip";
import { calculateRecommendedOrder } from "@/utils/calculations";
import { formatNumber } from "@/utils/formatters";
import { cn } from "@/lib/utils";

const MSG = "Enter a whole number of 0 or more";
const qty = z.number({ error: MSG }).int({ error: MSG }).min(0, { error: MSG }).max(1_000_000, { error: "Enter a value below 1,000,000" });

const schema = z.object({
  forecastDemand: qty,
  currentStock: qty,
  safetyStock: qty,
  incomingStock: qty,
});

export type OrderInputs = z.infer<typeof schema>;

export const SPEC_EXAMPLE: OrderInputs = { forecastDemand: 250, currentStock: 60, safetyStock: 30, incomingStock: 20 };

const FIELDS: { name: keyof OrderInputs; label: string; help: string; sign: "+" | "−" }[] = [
  { name: "forecastDemand", label: "Forecast demand", help: "Units expected to sell over the forecast period (simulated).", sign: "+" },
  { name: "safetyStock", label: "Safety stock", help: "Buffer kept on hand for demand spikes and supplier delays.", sign: "+" },
  { name: "currentStock", label: "Current stock", help: "Units on the shelf and in the back room today.", sign: "−" },
  { name: "incomingStock", label: "Incoming inventory", help: "Units already ordered that have not arrived yet.", sign: "−" },
];

/**
 * Interactive replenishment calculator.
 * Recommended Order = max(0, Forecast Demand + Safety Stock − Current Stock − Incoming Inventory)
 */
export function OrderRecommendation({
  defaults,
  contextLabel,
  productName,
  className,
}: {
  defaults: OrderInputs;
  /** e.g. "Next 3 Months · Chronos-2 (simulated placeholder)" */
  contextLabel?: string;
  productName?: string;
  className?: string;
}) {
  const {
    register,
    reset,
    watch,
    formState: { errors },
  } = useForm<OrderInputs>({
    resolver: zodResolver(schema),
    mode: "onChange",
    defaultValues: defaults,
  });
  const idBase = React.useId();
  const defaultsKey = `${defaults.forecastDemand}|${defaults.currentStock}|${defaults.safetyStock}|${defaults.incomingStock}`;

  React.useEffect(() => {
    reset(defaults);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [defaultsKey, reset]);

  const values = watch();
  const valid = FIELDS.every((f) => {
    const v = values[f.name];
    return typeof v === "number" && Number.isInteger(v) && v >= 0 && !errors[f.name];
  });
  const raw = valid ? values.forecastDemand + values.safetyStock - values.currentStock - values.incomingStock : 0;
  const recommended = valid ? calculateRecommendedOrder(values) : null;
  const required = valid ? values.forecastDemand + values.safetyStock : 0;
  const available = valid ? values.currentStock + values.incomingStock : 0;
  const scale = Math.max(required, available, 1);

  return (
    <Card className={cn("flex flex-col", className)} role="region" aria-labelledby={`${idBase}-title`}>
      <CardHeader>
        <div className="min-w-0">
          <CardTitle id={`${idBase}-title`} className="flex items-center gap-2">
            <Calculator className="size-4 text-muted-foreground" aria-hidden="true" />
            Order Recommendation
          </CardTitle>
          <CardDescription>
            {productName ? <>{productName} · </> : null}
            {contextLabel ?? "Adjust any value — the recommendation updates immediately."}
          </CardDescription>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button type="button" variant="outline" size="sm" onClick={() => reset(defaults)}>
            <RotateCcw /> Reset to product values
          </Button>
          <Button type="button" variant="ghost" size="sm" onClick={() => reset(SPEC_EXAMPLE)}>
            <FlaskConical /> Load example
          </Button>
        </div>
      </CardHeader>
      <CardContent className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.1fr)]">
        <form className="grid grid-cols-1 content-start gap-4 sm:grid-cols-2" noValidate onSubmit={(e) => e.preventDefault()} aria-label="Order recommendation inputs">
          {FIELDS.map((f) => {
            const id = `${idBase}-${f.name}`;
            const err = errors[f.name]?.message;
            return (
              <div key={f.name} className="space-y-1.5">
                <div className="flex items-center gap-1">
                  <Label htmlFor={id}>{f.label}</Label>
                  <InfoTip label={`About ${f.label.toLowerCase()}`}>{f.help}</InfoTip>
                </div>
                <div className="relative">
                  <Input
                    id={id}
                    type="number"
                    inputMode="numeric"
                    min={0}
                    step={1}
                    className="pr-12 tabular"
                    aria-invalid={err ? true : undefined}
                    aria-describedby={err ? `${id}-error` : `${id}-unit`}
                    {...register(f.name, { valueAsNumber: true })}
                  />
                  <span id={`${id}-unit`} className="pointer-events-none absolute top-1/2 right-3 -translate-y-1/2 text-xs text-muted-foreground">
                    units
                  </span>
                </div>
                {err && (
                  <p id={`${id}-error`} role="alert" className="text-xs font-medium text-destructive-text">
                    {err}
                  </p>
                )}
              </div>
            );
          })}
        </form>

        <div className="space-y-4">
          <div
            className={cn(
              "rounded-xl border p-4",
              recommended === null
                ? "border-border bg-muted/50"
                : recommended > 0
                  ? "border-primary/25 bg-primary-soft"
                  : "border-success/25 bg-success-soft",
            )}
            aria-live="polite"
            aria-atomic="true"
          >
            <p className="text-xs font-medium tracking-wide text-muted-foreground uppercase">Recommended Order</p>
            {recommended === null ? (
              <p className="mt-1 text-sm text-muted-foreground">Fix the highlighted fields to see a recommendation.</p>
            ) : (
              <>
                <p className="mt-0.5 text-3xl font-semibold tracking-tight text-foreground tabular">
                  {formatNumber(recommended)} <span className="text-base font-medium text-muted-foreground">units</span>
                </p>
                {recommended === 0 && (
                  <p className="mt-1 text-sm text-success-text">Current and incoming stock already cover forecast demand.</p>
                )}
              </>
            )}
          </div>

          {valid && (
            <>
              <ol className="space-y-1.5 text-sm" aria-label="How the recommendation was calculated">
                {FIELDS.map((f) => (
                  <li key={f.name} className="flex items-center justify-between gap-3">
                    <span className="flex items-center gap-2 text-muted-foreground">
                      <span
                        className={cn(
                          "flex size-5 items-center justify-center rounded-full text-[11px] font-semibold",
                          f.sign === "+" ? "bg-primary-soft text-primary-soft-foreground" : "bg-muted text-foreground",
                        )}
                        aria-hidden="true"
                      >
                        {f.sign === "+" ? <Plus className="size-3" /> : <Minus className="size-3" />}
                      </span>
                      <span>
                        <span className="sr-only">{f.sign === "+" ? "plus" : "minus"} </span>
                        {f.label}
                      </span>
                    </span>
                    <span className="font-medium text-foreground tabular">{formatNumber(values[f.name])}</span>
                  </li>
                ))}
                <li className="flex items-center justify-between gap-3 border-t border-border pt-1.5">
                  <span className="flex items-center gap-2 text-muted-foreground">
                    <span className="flex size-5 items-center justify-center rounded-full bg-muted text-foreground" aria-hidden="true">
                      <Equal className="size-3" />
                    </span>
                    Net requirement
                  </span>
                  <span className="font-medium text-foreground tabular">{formatNumber(raw)}</span>
                </li>
                <li className="flex items-center justify-between gap-3 font-semibold">
                  <span className="pl-7">max(0, net requirement)</span>
                  <span className="tabular">{formatNumber(recommended ?? 0)} units</span>
                </li>
              </ol>

              <div className="space-y-2" aria-hidden="true">
                <div>
                  <div className="mb-1 flex justify-between text-xs text-muted-foreground">
                    <span>Required (forecast + safety)</span>
                    <span className="tabular">{formatNumber(required)}</span>
                  </div>
                  <div className="h-2.5 rounded-full bg-muted">
                    <div className="h-full rounded-full bg-series-1" style={{ width: `${(required / scale) * 100}%` }} />
                  </div>
                </div>
                <div>
                  <div className="mb-1 flex justify-between text-xs text-muted-foreground">
                    <span>Available (current + incoming)</span>
                    <span className="tabular">{formatNumber(available)}</span>
                  </div>
                  <div className="h-2.5 rounded-full bg-muted">
                    <div className="h-full rounded-full bg-series-3" style={{ width: `${(available / scale) * 100}%` }} />
                  </div>
                </div>
              </div>
            </>
          )}

          <p className="rounded-lg bg-muted/60 px-3 py-2 text-xs leading-5 text-muted-foreground">
            <span className="font-mono text-foreground">Recommended Order = max(0, F + S − C − I)</span>
            <br />
            Recommendations are estimates and depend on inventory accuracy, supplier lead times, and other operational constraints.
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
