import * as React from "react";
import { BarChart3, Table2 } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { cn } from "@/lib/utils";

export interface ChartTableData {
  caption: string;
  columns: string[];
  rows: (string | number)[][];
}

/**
 * Card wrapper for every chart: title, description, actions, an always-available accessible
 * summary, and a Chart ⇄ Table toggle so data is never conveyed by the visual alone.
 */
export function ChartCard({
  title,
  description,
  actions,
  summary,
  table,
  children,
  className,
  contentClassName,
  busy,
  id,
}: {
  title: React.ReactNode;
  description?: React.ReactNode;
  actions?: React.ReactNode;
  /** One-sentence plain-language takeaway read by screen readers and shown under the chart. */
  summary?: string;
  table?: ChartTableData;
  children: React.ReactNode;
  className?: string;
  contentClassName?: string;
  busy?: boolean;
  id?: string;
}) {
  const [view, setView] = React.useState<"chart" | "table">("chart");
  const headingId = React.useId();
  return (
    <Card className={cn("flex min-w-0 flex-col", className)} id={id} aria-labelledby={headingId} role="region">
      <CardHeader>
        <div className="min-w-0">
          <CardTitle id={headingId}>{title}</CardTitle>
          {description && <CardDescription>{description}</CardDescription>}
        </div>
        <div className="flex items-center gap-2">
          {actions}
          {table && (
            <div role="group" aria-label="Display as" className="inline-flex rounded-md border border-border bg-muted p-0.5">
              <button
                type="button"
                aria-pressed={view === "chart"}
                onClick={() => setView("chart")}
                className={cn(
                  "inline-flex h-7 items-center gap-1 rounded-[5px] px-2 text-xs font-medium text-muted-foreground transition-colors focus-visible:outline-2 focus-visible:outline-ring",
                  view === "chart" && "bg-card text-foreground shadow-sm",
                )}
              >
                <BarChart3 className="size-3.5" aria-hidden="true" /> Chart
              </button>
              <button
                type="button"
                aria-pressed={view === "table"}
                onClick={() => setView("table")}
                className={cn(
                  "inline-flex h-7 items-center gap-1 rounded-[5px] px-2 text-xs font-medium text-muted-foreground transition-colors focus-visible:outline-2 focus-visible:outline-ring",
                  view === "table" && "bg-card text-foreground shadow-sm",
                )}
              >
                <Table2 className="size-3.5" aria-hidden="true" /> Table
              </button>
            </div>
          )}
        </div>
      </CardHeader>
      <CardContent className={cn("flex-1", busy && "opacity-60 transition-opacity", contentClassName)} aria-busy={busy || undefined}>
        {view === "table" && table ? (
          <div className="max-h-80 overflow-auto rounded-lg border border-border scrollbar-thin">
            <Table>
              <caption className="sr-only">{table.caption}</caption>
              <TableHeader>
                <TableRow>
                  {table.columns.map((c) => (
                    <TableHead key={c} scope="col">
                      {c}
                    </TableHead>
                  ))}
                </TableRow>
              </TableHeader>
              <TableBody>
                {table.rows.map((r, i) => (
                  <TableRow key={i}>
                    {r.map((cell, j) =>
                      j === 0 ? (
                        <TableCell key={j} className="font-medium">
                          {cell}
                        </TableCell>
                      ) : (
                        <TableCell key={j} className="tabular">
                          {cell}
                        </TableCell>
                      ),
                    )}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        ) : (
          <>
            {children}
            {summary && <p className="sr-only">{summary}</p>}
          </>
        )}
      </CardContent>
    </Card>
  );
}
