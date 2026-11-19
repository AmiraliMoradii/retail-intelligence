import { useMemo } from "react";
import { CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { ChartCard } from "@/components/shared/ChartCard";
import { ChartTooltipBox } from "@/components/shared/ChartTooltip";
import { AXIS_PROPS, CHART } from "@/lib/chart";
import type { InventoryRow } from "@/types";
import { formatCompact, formatMonth, formatNumber, formatPercent } from "@/utils/formatters";
import { addMonths, format, parseISO } from "date-fns";
import { usePrefersReducedMotion } from "./chartHooks";

interface Point {
  month: string;
  label: string;
  full: string;
  sold: number | null;
  forecast: number | null;
}

function LegendKey() {
  return (
    <ul className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted-foreground" aria-label="Legend">
      <li className="flex items-center gap-1.5">
        <span aria-hidden="true" className="inline-block h-[3px] w-4 rounded-full" style={{ background: CHART.series1 }} />
        Units sold
      </li>
      <li className="flex items-center gap-1.5">
        <span
          aria-hidden="true"
          className="inline-block h-[3px] w-4 rounded-full"
          style={{ background: `repeating-linear-gradient(90deg, ${CHART.series2} 0 4px, transparent 4px 6px)` }}
        />
        Simulated forecast
      </li>
    </ul>
  );
}

/** Monthly total units sold across all products (last 12 months) plus the simulated next-month forecast. */
export function SalesTrendChart({ rows, forecastNextMonth }: { rows: InventoryRow[]; forecastNextMonth: number }) {
  const reduced = usePrefersReducedMotion();
  const data = useMemo<Point[]>(() => {
    const totals = new Map<string, number>();
    for (const r of rows) for (const h of r.history) totals.set(h.month, (totals.get(h.month) ?? 0) + h.soldQuantity);
    const months = [...totals.keys()].sort().slice(-12);
    const pts: Point[] = months.map((m) => ({
      month: m,
      label: formatMonth(m, true),
      full: formatMonth(m),
      sold: totals.get(m) ?? 0,
      forecast: null,
    }));
    const last = pts[pts.length - 1];
    if (last) {
      last.forecast = last.sold; // connect the dashed forecast segment to the last actual
      const next = format(addMonths(parseISO(`${last.month}-01`), 1), "yyyy-MM");
      pts.push({ month: next, label: formatMonth(next, true), full: formatMonth(next), sold: null, forecast: forecastNextMonth });
    }
    return pts;
  }, [rows, forecastNextMonth]);

  const actual = data.filter((d) => d.sold !== null);
  const lastActual = actual[actual.length - 1];
  const first = actual[0];
  const nextPt = data[data.length - 1];
  const yoy = first && lastActual && first.sold ? (((lastActual.sold ?? 0) - first.sold) / first.sold) * 100 : 0;

  return (
    <ChartCard
      title="Sales Trend"
      description="Total units sold per month, all products · next month is a simulated forecast"
      actions={<LegendKey />}
      summary={
        lastActual && nextPt
          ? `${formatNumber(lastActual.sold ?? 0)} units were sold in ${lastActual.full}. The simulated forecast for ${nextPt.full} is ${formatNumber(
              nextPt.forecast ?? 0,
            )} units. Change over the last 12 months: ${formatPercent(yoy)}.`
          : undefined
      }
      table={{
        caption: "Monthly units sold and simulated forecast",
        columns: ["Month", "Units sold", "Simulated forecast"],
        rows: data.map((d) => [
          d.full,
          d.sold !== null ? formatNumber(d.sold) : "—",
          d.sold === null && d.forecast !== null ? formatNumber(d.forecast) : "—",
        ]),
      }}
    >
      <div className="h-[260px]">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={data} margin={{ top: 8, right: 12, bottom: 0, left: -4 }}>
            <CartesianGrid vertical={false} stroke="var(--chart-grid)" />
            <XAxis dataKey="label" {...AXIS_PROPS} interval="preserveStartEnd" minTickGap={10} />
            <YAxis {...AXIS_PROPS} width={48} tickFormatter={(v: number) => formatCompact(v)} domain={["auto", "auto"]} />
            <Tooltip
              cursor={{ stroke: "var(--chart-axis)", strokeWidth: 1, strokeDasharray: "4 4" }}
              content={({ active, payload }) => {
                const p = active && payload?.length ? (payload[0].payload as Point) : null;
                if (!p) return null;
                const rowsOut =
                  p.sold !== null
                    ? [{ label: "Units sold", value: formatNumber(p.sold), color: CHART.series1 }]
                    : [{ label: "Simulated forecast", value: formatNumber(p.forecast ?? 0), color: CHART.series2, dashed: true }];
                return (
                  <ChartTooltipBox
                    title={p.full}
                    rows={rowsOut}
                    footer={p.sold === null ? "Simulated Forecast — AI Integration Planned" : undefined}
                  />
                );
              }}
            />
            <Line
              type="monotone"
              dataKey="sold"
              name="Units sold"
              stroke={CHART.series1}
              strokeWidth={2}
              dot={false}
              activeDot={{ r: 5, stroke: "var(--card)", strokeWidth: 2, fill: CHART.series1 }}
              connectNulls={false}
              isAnimationActive={!reduced}
            />
            <Line
              type="monotone"
              dataKey="forecast"
              name="Simulated forecast"
              stroke={CHART.series2}
              strokeWidth={2}
              strokeDasharray="6 4"
              dot={(props: { cx?: number; cy?: number; index?: number }) =>
                props.index === data.length - 1 && props.cx !== undefined && props.cy !== undefined ? (
                  <circle key="fc-dot" cx={props.cx} cy={props.cy} r={5} fill={CHART.series2} stroke="var(--card)" strokeWidth={2} />
                ) : (
                  <g key={`fc-${props.index}`} />
                )
              }
              activeDot={{ r: 5, stroke: "var(--card)", strokeWidth: 2, fill: CHART.series2 }}
              isAnimationActive={!reduced}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </ChartCard>
  );
}
