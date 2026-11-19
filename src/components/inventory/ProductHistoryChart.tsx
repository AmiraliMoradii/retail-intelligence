import { CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { format, parseISO } from "date-fns";
import type { SalesRecord } from "@/types";
import { ChartCard } from "@/components/shared/ChartCard";
import { ChartTooltipBox } from "@/components/shared/ChartTooltip";
import { AXIS_PROPS, CHART } from "@/lib/chart";
import { formatMonth, formatNumber } from "@/utils/formatters";

export const shortMonth = (month: string) => format(parseISO(`${month}-01`), "MMM ''yy");

/** Monthly units sold vs. units ordered — same unit, one axis, two labelled series. */
export function ProductHistoryChart({ productName, history }: { productName: string; history: SalesRecord[] }) {
  const data = history.map((h) => ({ ...h, label: shortMonth(h.month) }));
  const peak = history.reduce<SalesRecord | null>((best, h) => (!best || h.soldQuantity > best.soldQuantity ? h : best), null);
  const summary = peak
    ? `${productName}: monthly units sold and ordered for ${history.length} months. Highest sales were ${formatNumber(peak.soldQuantity)} units in ${formatMonth(peak.month)}.`
    : `${productName} has no sales history.`;

  return (
    <ChartCard
      title="Historical sales & orders"
      description="Monthly units sold vs. units ordered from the supplier"
      summary={summary}
      table={{
        caption: `${productName} monthly sales and orders`,
        columns: ["Month", "Units sold", "Units ordered"],
        rows: history.map((h) => [formatMonth(h.month), formatNumber(h.soldQuantity), formatNumber(h.orderedQuantity)]),
      }}
    >
      <ul className="mb-3 flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground" aria-label="Legend">
        <li className="flex items-center gap-1.5">
          <span className="inline-block h-[3px] w-4 rounded-full" style={{ background: CHART.series1 }} aria-hidden="true" />
          Units sold
        </li>
        <li className="flex items-center gap-1.5">
          <span
            className="inline-block h-[3px] w-4 rounded-full"
            style={{ background: `repeating-linear-gradient(90deg, ${CHART.series2} 0 4px, transparent 4px 6px)` }}
            aria-hidden="true"
          />
          Units ordered
        </li>
      </ul>
      <div className="h-56" aria-hidden="true">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={data} margin={{ top: 4, right: 8, left: -12, bottom: 0 }}>
            <CartesianGrid vertical={false} strokeDasharray="0" />
            <XAxis dataKey="label" {...AXIS_PROPS} interval="preserveStartEnd" minTickGap={16} />
            <YAxis {...AXIS_PROPS} width={48} tickFormatter={(v: number) => formatNumber(v)} />
            <Tooltip
              cursor={{ stroke: CHART.grid, strokeWidth: 1 }}
              content={({ active, payload }) => {
                if (!active || !payload?.length) return null;
                const row = payload[0].payload as SalesRecord;
                return (
                  <ChartTooltipBox
                    title={formatMonth(row.month)}
                    rows={[
                      { label: "Units sold", value: formatNumber(row.soldQuantity), color: CHART.series1 },
                      { label: "Units ordered", value: formatNumber(row.orderedQuantity), color: CHART.series2, dashed: true },
                    ]}
                  />
                );
              }}
            />
            <Line type="monotone" dataKey="soldQuantity" name="Units sold" stroke={CHART.series1} strokeWidth={2} dot={false} activeDot={{ r: 4, strokeWidth: 2, stroke: CHART.surface }} />
            <Line
              type="monotone"
              dataKey="orderedQuantity"
              name="Units ordered"
              stroke={CHART.series2}
              strokeWidth={2}
              strokeDasharray="5 4"
              dot={false}
              activeDot={{ r: 4, strokeWidth: 2, stroke: CHART.surface }}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </ChartCard>
  );
}
