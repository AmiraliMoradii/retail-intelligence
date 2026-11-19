import { FlaskConical, Timer } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { InfoTip } from "@/components/shared/InfoTip";
import type { Product } from "@/types";
import { placeholderBacktest } from "@/utils/calculations";

function Placeholder() {
  return (
    <Badge variant="demo" className="ml-1.5 align-middle">
      <FlaskConical aria-hidden="true" /> Placeholder
    </Badge>
  );
}

export function ModelComparison({ product, className }: { product: Product | null; className?: string }) {
  const chronos = product ? placeholderBacktest(product.id, product.history, "chronos-2") : null;
  const timesfm = product ? placeholderBacktest(product.id, product.history, "timesfm-2.5") : null;

  const metricRows = [
    {
      metric: "MAE",
      help: "Mean Absolute Error — the average number of units the forecast was off by each month. Lower is better.",
      chronos: chronos ? `${chronos.mae.toFixed(1)} units` : null,
      timesfm: timesfm ? `${timesfm.mae.toFixed(1)} units` : null,
    },
    {
      metric: "WAPE",
      help: "Weighted Absolute Percentage Error — total absolute error divided by total actual sales. Lower is better.",
      chronos: chronos ? `${chronos.wape.toFixed(1)}%` : null,
      timesfm: timesfm ? `${timesfm.wape.toFixed(1)}%` : null,
    },
  ];

  return (
    <Card className={className} role="region" aria-labelledby="model-comparison-title">
      <CardHeader>
        <div>
          <CardTitle id="model-comparison-title">Model Comparison</CardTitle>
          <CardDescription>Planned candidates: Chronos-2 (primary) and TimesFM 2.5 (comparison)</CardDescription>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="overflow-hidden rounded-lg border border-border">
          <Table>
            <caption className="sr-only">Placeholder model comparison metrics for {product?.name ?? "the selected product"}</caption>
            <TableHeader>
              <TableRow className="hover:bg-transparent">
                <TableHead scope="col">Metric</TableHead>
                <TableHead scope="col">Chronos-2</TableHead>
                <TableHead scope="col">TimesFM 2.5</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {metricRows.map((r) => (
                <TableRow key={r.metric}>
                  <TableHead scope="row" className="h-auto py-2.5 text-[13px] font-semibold tracking-normal normal-case text-foreground">
                    <span className="inline-flex items-center gap-1">
                      {r.metric}
                      <InfoTip label={`What is ${r.metric}?`}>{r.help}</InfoTip>
                    </span>
                  </TableHead>
                  <TableCell className="tabular">
                    {r.chronos ?? <span className="text-muted-foreground">Insufficient history</span>}
                    {r.chronos && <Placeholder />}
                  </TableCell>
                  <TableCell className="tabular">
                    {r.timesfm ?? <span className="text-muted-foreground">Insufficient history</span>}
                    {r.timesfm && <Placeholder />}
                  </TableCell>
                </TableRow>
              ))}
              <TableRow>
                <TableHead scope="row" className="h-auto py-2.5 text-[13px] font-semibold tracking-normal normal-case text-foreground">
                  <span className="inline-flex items-center gap-1.5">
                    <Timer className="size-3.5 text-muted-foreground" aria-hidden="true" /> Execution Time
                  </span>
                </TableHead>
                <TableCell className="text-muted-foreground">Not measured</TableCell>
                <TableCell className="text-muted-foreground">Not measured</TableCell>
              </TableRow>
            </TableBody>
          </Table>
        </div>
        <p className="text-xs leading-5 text-muted-foreground">
          <strong className="font-semibold text-foreground">Placeholders, not measured benchmarks.</strong> MAE and WAPE above come from a
          3-month hold-out of the prototype's simulated method on demo data. Neither Chronos-2 nor TimesFM 2.5 was executed.
        </p>
        <p className="rounded-lg bg-muted/60 px-3 py-2 text-xs leading-5 text-muted-foreground">
          Model performance will be evaluated using historical sales data during MVP development, including a comparison against a simple
          seasonal baseline.
        </p>
      </CardContent>
    </Card>
  );
}
