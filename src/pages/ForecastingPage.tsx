import * as React from "react";
import { Link, useSearchParams } from "react-router";
import { toast } from "sonner";
import { Boxes, CalendarRange, FileUp, PackageCheck, Sparkles, TrendingUp } from "lucide-react";
import { PageHeader } from "@/components/shared/PageHeader";
import { SimulatedForecastBadge } from "@/components/shared/DemoBadge";
import { EmptyState } from "@/components/shared/EmptyState";
import { ErrorState } from "@/components/shared/ErrorState";
import { KPICard } from "@/components/dashboard/KPICard";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { ForecastConfig } from "@/components/forecasting/ForecastConfig";
import { ForecastChart, MODEL_SERIES } from "@/components/forecasting/ForecastChart";
import { ModelComparison } from "@/components/forecasting/ModelComparison";
import { ForecastHistoryTable } from "@/components/forecasting/ForecastHistoryTable";
import { OrderRecommendation, type OrderInputs } from "@/components/inventory/OrderRecommendation";
import { modelLabel, periodLabel, STATUS_RANK } from "@/components/inventory/labels";
import { useInventoryRows } from "@/hooks/useInventory";
import { useAppStore } from "@/store/useAppStore";
import { ApiError, generateForecast } from "@/services/mockApi";
import { calculateRecommendedOrder } from "@/utils/calculations";
import { formatNumber } from "@/utils/formatters";
import type { DemandForecast, ForecastHistoryEntry, ForecastModelOption, ForecastPeriod } from "@/types";

interface ForecastResult {
  productId: string;
  period: ForecastPeriod;
  model: ForecastModelOption;
  forecasts: DemandForecast[];
}

export default function ForecastingPage() {
  const [params, setParams] = useSearchParams();
  const rows = useInventoryRows();
  const addForecastHistory = useAppStore((s) => s.addForecastHistory);
  const pushNotification = useAppStore((s) => s.pushNotification);

  const defaultProductId = React.useMemo(
    () =>
      [...rows]
        .filter((r) => r.recommendedOrder > 0)
        .sort((a, b) => STATUS_RANK[a.status] - STATUS_RANK[b.status] || b.recommendedOrder - a.recommendedOrder)[0]?.id ??
      rows[0]?.id ??
      "",
    [rows],
  );
  const productParam = params.get("product");
  const paramValid = !!productParam && rows.some((r) => r.id === productParam);
  const productId = paramValid ? productParam! : defaultProductId;
  const product = rows.find((r) => r.id === productId) ?? null;

  const [period, setPeriod] = React.useState<ForecastPeriod>(1);
  const [model, setModel] = React.useState<ForecastModelOption>("chronos-2");
  const [result, setResult] = React.useState<ForecastResult | null>(null);
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<{ message: string; code?: string } | null>(null);

  const setProduct = (id: string) => {
    setError(null);
    setParams(
      (prev) => {
        const next = new URLSearchParams(prev);
        next.set("product", id);
        return next;
      },
      { replace: true },
    );
  };

  const activeResult = result && result.productId === productId ? result : null;
  const stale = activeResult && (activeResult.period !== period || activeResult.model !== model);
  const primary = activeResult?.forecasts[0] ?? null;

  const generate = async () => {
    if (!product) return;
    setLoading(true);
    setError(null);
    try {
      const forecasts = await generateForecast({ product, periodMonths: period, model });
      const first = forecasts[0];
      const recommendedOrder = calculateRecommendedOrder({
        forecastDemand: first.totalDemand,
        safetyStock: product.safetyStock,
        currentStock: product.currentStock,
        incomingStock: product.incomingStock,
      });
      setResult({ productId: product.id, period, model, forecasts });
      addForecastHistory({
        id: first.id,
        productId: product.id,
        productName: product.name,
        periodMonths: period,
        model,
        generatedAt: first.generatedAt,
        predictedDemand: first.totalDemand,
        recommendedOrder,
      });
      pushNotification({
        kind: "forecast",
        title: "Simulated forecast generated",
        body: `${product.name} · ${periodLabel(period)} · ${modelLabel(model)} — ${formatNumber(first.totalDemand)} units forecast (simulated).`,
        href: `/forecasting?product=${encodeURIComponent(product.id)}`,
      });
      toast.success("Simulated forecast generated", {
        description: `${product.name}: ${formatNumber(first.totalDemand)} units over the ${periodLabel(period).toLowerCase()}. Recommended order ${formatNumber(recommendedOrder)} units.`,
      });
    } catch (e) {
      const err = e instanceof ApiError ? { message: e.message, code: e.code } : { message: "The simulated forecast could not be generated. Please try again." };
      setError(err);
      toast.error("Forecast not generated", { description: err.message });
    } finally {
      setLoading(false);
    }
  };

  const loadFromHistory = (entry: ForecastHistoryEntry) => {
    if (!rows.some((r) => r.id === entry.productId)) {
      toast.error("Product no longer available", { description: `${entry.productName} is not in the current inventory dataset.` });
      return;
    }
    setProduct(entry.productId);
    setPeriod(entry.periodMonths);
    setModel(entry.model);
    toast.message("Forecast settings loaded", { description: "Select Generate Forecast to run the simulation again." });
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  if (!rows.length || !product) {
    return (
      <div className="space-y-6">
        <PageHeader
          eyebrow={<SimulatedForecastBadge />}
          title="Demand Forecasting"
          description="Estimate future product demand and generate inventory order recommendations."
        />
        <Card className="p-5">
          <EmptyState
            icon={Boxes}
            title="No products available to forecast"
            description="Import historical sales and order records as a CSV to start forecasting demand."
            action={
              <Button asChild>
                <Link to="/data">
                  <FileUp /> Go to Data Management
                </Link>
              </Button>
            }
          />
        </Card>
      </div>
    );
  }

  // Calculator defaults: latest generated forecast for this product, otherwise next month's simulated inventory forecast.
  const calcDefaults: OrderInputs = {
    forecastDemand: primary ? primary.totalDemand : product.forecastDemand,
    currentStock: product.currentStock,
    safetyStock: product.safetyStock,
    incomingStock: product.incomingStock,
  };
  const calcContext = primary
    ? `${periodLabel(activeResult!.period)} · ${MODEL_SERIES[primary.model].name} total`
    : "Next Month · prefilled from the simulated inventory forecast — generate a forecast to update";

  const n = activeResult?.period ?? period;
  const previousActual = product.history.slice(-n).reduce((a, h) => a + h.soldQuantity, 0);
  const changePct = primary && previousActual > 0 ? ((primary.totalDemand - previousActual) / previousActual) * 100 : null;
  const recommended = primary
    ? calculateRecommendedOrder({
        forecastDemand: primary.totalDemand,
        safetyStock: product.safetyStock,
        currentStock: product.currentStock,
        incomingStock: product.incomingStock,
      })
    : null;

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow={<SimulatedForecastBadge />}
        title="Demand Forecasting"
        description="Estimate future product demand and generate inventory order recommendations."
        actions={
          <>
            <Button variant="outline" asChild>
              <Link to={`/inventory?product=${encodeURIComponent(product.id)}`}>
                <Boxes /> View in inventory
              </Link>
            </Button>
          </>
        }
      />

      <Alert variant="warning" title="Simulated Forecast — AI Integration Planned">
        Forecasts on this page come from a deterministic placeholder method on demo data. Chronos-2 and TimesFM 2.5 are{" "}
        <strong>not executed</strong> in Milestone 2; they will be integrated behind the same screen and evaluated on real sales history in
        Milestone 4.
      </Alert>

      {productParam && !paramValid && (
        <Alert variant="info" title="Product not found">
          The product in the link is not in the current dataset, so {product.name} is shown instead.
        </Alert>
      )}

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-3">
        <ForecastConfig
          rows={rows}
          productId={productId}
          period={period}
          model={model}
          loading={loading}
          onProductChange={setProduct}
          onPeriodChange={setPeriod}
          onModelChange={setModel}
          onGenerate={generate}
        />
        <div className="min-w-0 xl:col-span-2">
          {error ? (
            <Card className="h-full p-5">
              <ErrorState
                title="Forecast not generated"
                description={error.message}
                onRetry={error.code === "insufficient_history" ? undefined : generate}
                action={
                  error.code === "insufficient_history" ? (
                    <Button variant="outline" size="sm" asChild>
                      <Link to="/data">
                        <FileUp /> Import more history
                      </Link>
                    </Button>
                  ) : undefined
                }
                className="h-full"
              />
            </Card>
          ) : (
            <ForecastChart
              productName={product.name}
              history={product.history}
              forecasts={activeResult?.forecasts ?? null}
              busy={loading}
            />
          )}
        </div>
      </div>

      {activeResult && primary ? (
        <section aria-label="Forecast summary" className="space-y-3">
          {stale && (
            <Alert variant="info" title="Settings changed">
              The results below are for {periodLabel(activeResult.period)} · {modelLabel(activeResult.model)}. Select Generate Forecast to update
              them.
            </Alert>
          )}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
            {activeResult.forecasts.map((f) => (
              <KPICard
                key={f.model}
                label={`Forecast demand · ${modelLabel(f.model)}`}
                value={`${formatNumber(f.totalDemand)} units`}
                icon={TrendingUp}
                hint={`${periodLabel(f.periodMonths)} · simulated`}
              />
            ))}
            <KPICard
              label={`Previous ${n === 1 ? "month" : `${n} months`} (actual)`}
              value={`${formatNumber(previousActual)} units`}
              icon={CalendarRange}
              deltaPct={changePct}
              deltaLabel="forecast vs. previous period"
            />
            <KPICard
              label="Recommended order"
              value={`${formatNumber(recommended ?? 0)} units`}
              icon={PackageCheck}
              tone={recommended && recommended > 0 ? "warning" : "success"}
              hint={recommended && recommended > 0 ? "Based on the primary forecast" : "Stock covers the forecast"}
            />
          </div>
        </section>
      ) : (
        !error && (
          <Card className="p-5">
            <EmptyState
              icon={Sparkles}
              title={`No forecast generated for ${product.name} yet`}
              description="Choose a forecast period and planned model, then generate a simulated forecast to see projected demand and an order recommendation."
              action={
                <Button onClick={generate} loading={loading}>
                  {loading ? "Generating simulated forecast…" : (
                    <>
                      <Sparkles /> Generate Forecast
                    </>
                  )}
                </Button>
              }
            />
          </Card>
        )
      )}

      <div className="grid grid-cols-1 gap-6 2xl:grid-cols-3">
        <OrderRecommendation
          className="2xl:col-span-2"
          defaults={calcDefaults}
          productName={product.name}
          contextLabel={calcContext}
        />
        <ModelComparison product={product} />
      </div>

      <ForecastHistoryTable onSelect={loadFromHistory} />
    </div>
  );
}
