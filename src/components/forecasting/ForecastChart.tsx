import * as React from "react";
import {
  Area,
  CartesianGrid,
  ComposedChart,
  Line,
  ReferenceArea,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import type { DemandForecast, ForecastModel, SalesRecord } from "@/types";
import { ChartCard } from "@/components/shared/ChartCard";
import { ChartTooltipBox, type TooltipRow } from "@/components/shared/ChartTooltip";
import { Switch } from "@/components/ui/switch";
import { AXIS_PROPS, CHART } from "@/lib/chart";
import { formatMonth, formatNumber } from "@/utils/formatters";
import { shortMonth } from "@/components/inventory/ProductHistoryChart";

export const MODEL_SERIES: Record<ForecastModel, { name: string; color: string; dash: string }> = {
  "chronos-2": { name: "Chronos-2 (simulated placeholder)", color: CHART.series2, dash: "6 4" },
  "timesfm-2.5": { name: "TimesFM 2.5 (simulated placeholder)", color: CHART.series3, dash: "2 3" },
};

interface Row {
  month: string;
  label: string;
  kind: "history" | "forecast";
  actual?: number;
  "chronos-2"?: number;
  "timesfm-2.5"?: number;
  "chronos-2-band"?: [number, number];
  "timesfm-2.5-band"?: [number, number];
}

function LegendSwatch({ color, dash }: { color: string; dash?: string }) {
  return (
    <svg width="20" height="6" aria-hidden="true" className="shrink-0">
      <line x1="0" y1="3" x2="20" y2="3" stroke={color} strokeWidth="2.5" strokeDasharray={dash} strokeLinecap="round" />
    </svg>
  );
}

export function ForecastChart({
  productName,
  history,
  forecasts,
  busy,
}: {
  productName: string;
  history: SalesRecord[];
  forecasts: DemandForecast[] | null;
  busy?: boolean;
}) {
  const [showBand, setShowBand] = React.useState(true);
  const models = (forecasts ?? []).map((f) => f.model);

  const data: Row[] = React.useMemo(() => {
    const rows: Row[] = history.map((h) => ({ month: h.month, label: shortMonth(h.month), kind: "history", actual: h.soldQuantity }));
    if (forecasts?.length && rows.length) {
      // Anchor forecast lines on the last actual value so the series connect visually.
      const last = rows[rows.length - 1];
      for (const f of forecasts) {
        last[f.model] = last.actual;
        if (last.actual !== undefined) last[`${f.model}-band`] = [last.actual, last.actual];
      }
      const months = forecasts[0].points.map((p) => p.month);
      months.forEach((m, i) => {
        const row: Row = { month: m, label: shortMonth(m), kind: "forecast" };
        for (const f of forecasts) {
          const p = f.points[i];
          if (!p) continue;
          row[f.model] = p.forecast;
          row[`${f.model}-band`] = [p.lower, p.upper];
        }
        rows.push(row);
      });
    }
    return rows;
  }, [history, forecasts]);

  const forecastRows = data.filter((r) => r.kind === "forecast");
  const lastHistory = [...data].reverse().find((r) => r.kind === "history");
  const firstForecast = forecastRows[0];
  const lastForecast = forecastRows[forecastRows.length - 1];

  const summary =
    forecasts?.length && forecastRows.length
      ? `${productName}: ${history.length} months of historical sales followed by a simulated ${forecastRows.length}-month forecast. ` +
        forecasts.map((f) => `${MODEL_SERIES[f.model].name} totals ${formatNumber(f.totalDemand)} units.`).join(" ")
      : `${productName}: ${history.length} months of historical sales. No forecast generated yet.`;

  const tableColumns = ["Month", "Historical sales", ...models.map((m) => MODEL_SERIES[m].name), ...(showBand && models.length ? ["Illustrative interval"] : [])];
  const tableRows = data.map((r) => {
    const cells: (string | number)[] = [formatMonth(r.month), r.kind === "history" && r.actual !== undefined ? formatNumber(r.actual) : "—"];
    for (const m of models) cells.push(r.kind === "forecast" && r[m] !== undefined ? formatNumber(r[m] as number) : "—");
    if (showBand && models.length) {
      const band = r.kind === "forecast" ? r[`${models[0]}-band`] : undefined;
      cells.push(band ? `${formatNumber(band[0])}–${formatNumber(band[1])}` : "—");
    }
    return cells;
  });

  return (
    <ChartCard
      title="Sales history & simulated forecast"
      description={
        forecasts?.length ? (
          <>
            Monthly units · <span className="font-medium text-warning-text">Simulated Forecast — AI Integration Planned</span>
          </>
        ) : (
          "Monthly units sold · generate a forecast to extend the chart"
        )
      }
      busy={busy}
      summary={summary}
      table={{ caption: `${productName} historical sales and simulated forecast`, columns: tableColumns, rows: tableRows }}
      actions={
        models.length > 0 ? (
          <div className="flex items-center gap-2">
            <Switch id="fc-band" checked={showBand} onCheckedChange={setShowBand} />
            <label htmlFor="fc-band" className="text-xs font-medium whitespace-nowrap text-muted-foreground">
              Illustrative interval
            </label>
          </div>
        ) : null
      }
    >
      <ul className="mb-3 flex flex-wrap gap-x-4 gap-y-1.5 text-xs text-muted-foreground" aria-label="Legend">
        <li className="flex items-center gap-1.5">
          <LegendSwatch color={CHART.series1} /> Historical sales (actual)
        </li>
        {models.map((m) => (
          <li key={m} className="flex items-center gap-1.5">
            <LegendSwatch color={MODEL_SERIES[m].color} dash={MODEL_SERIES[m].dash} /> {MODEL_SERIES[m].name}
          </li>
        ))}
        {models.length > 0 && showBand && (
          <li className="flex items-center gap-1.5">
            <span className="inline-block h-2.5 w-4 rounded-sm opacity-30" style={{ background: MODEL_SERIES[models[0]].color }} aria-hidden="true" />
            Illustrative interval (not a statistical guarantee)
          </li>
        )}
      </ul>
      <div className="h-72 sm:h-80" aria-hidden="true">
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart data={data} margin={{ top: 16, right: 12, left: -8, bottom: 0 }}>
            <CartesianGrid vertical={false} />
            {lastHistory && firstForecast && lastForecast && (
              <ReferenceArea
                x1={lastHistory.label}
                x2={lastForecast.label}
                fill="var(--muted)"
                fillOpacity={0.7}
                ifOverflow="extendDomain"
                label={{ value: "Forecast", position: "insideTop", fill: "var(--muted-foreground)", fontSize: 11 }}
              />
            )}
            {lastHistory && firstForecast && (
              <ReferenceLine
                x={lastHistory.label}
                stroke="var(--subtle)"
                strokeDasharray="3 3"
              />
            )}
            <XAxis dataKey="label" {...AXIS_PROPS} interval="preserveStartEnd" minTickGap={14} />
            <YAxis {...AXIS_PROPS} width={52} tickFormatter={(v: number) => formatNumber(v)} />
            {showBand &&
              models.map((m) => (
                <Area
                  key={`${m}-band`}
                  type="monotone"
                  dataKey={`${m}-band`}
                  stroke="none"
                  fill={MODEL_SERIES[m].color}
                  fillOpacity={0.14}
                  isAnimationActive={false}
                  activeDot={false}
                  connectNulls={false}
                />
              ))}
            <Line
              type="monotone"
              dataKey="actual"
              name="Historical sales"
              stroke={CHART.series1}
              strokeWidth={2}
              dot={{ r: 2.5, fill: CHART.series1, strokeWidth: 0 }}
              activeDot={{ r: 5, stroke: CHART.surface, strokeWidth: 2 }}
              connectNulls={false}
            />
            {models.map((m) => (
              <Line
                key={m}
                type="monotone"
                dataKey={m}
                name={MODEL_SERIES[m].name}
                stroke={MODEL_SERIES[m].color}
                strokeWidth={2}
                strokeDasharray={MODEL_SERIES[m].dash}
                dot={{ r: 3, fill: MODEL_SERIES[m].color, strokeWidth: 0 }}
                activeDot={{ r: 5, stroke: CHART.surface, strokeWidth: 2 }}
                connectNulls={false}
              />
            ))}
            <Tooltip
              cursor={{ stroke: "var(--subtle)", strokeWidth: 1, strokeDasharray: "3 3" }}
              content={({ active, payload }) => {
                if (!active || !payload?.length) return null;
                const row = payload[0].payload as Row;
                const rows: TooltipRow[] = [];
                if (row.kind === "history") {
                  rows.push({ label: "Historical sales", value: `${formatNumber(row.actual ?? 0)} units`, color: CHART.series1 });
                } else {
                  for (const m of models) {
                    const v = row[m];
                    if (v === undefined) continue;
                    rows.push({ label: MODEL_SERIES[m].name.replace(" (simulated placeholder)", " · simulated"), value: `${formatNumber(v)} units`, color: MODEL_SERIES[m].color, dashed: true });
                    const band = row[`${m}-band`];
                    if (showBand && band) rows.push({ label: "Illustrative interval", value: `${formatNumber(band[0])}–${formatNumber(band[1])}` });
                  }
                }
                return (
                  <ChartTooltipBox
                    title={formatMonth(row.month)}
                    rows={rows}
                    footer={row.kind === "forecast" ? "Simulated placeholder — no AI model was run." : undefined}
                  />
                );
              }}
            />
          </ComposedChart>
        </ResponsiveContainer>
      </div>
    </ChartCard>
  );
}
