import { createServer } from "vite";

const vite = await createServer({
  server: { middlewareMode: true, hmr: false, ws: false, watch: null },
  appType: "custom",
});

try {
  const { buildMockProducts } = await vite.ssrLoadModule("/src/data/mockInventory.ts");
  const { simulateForecast } = await vite.ssrLoadModule("/src/utils/calculations.ts");
  const products = buildMockProducts();
  const holdoutMonths = 3;
  const methods = new Map([
    ["Last observed month", { absoluteError: 0 }],
    ["Simulated variant A (Chronos-2 placeholder)", { absoluteError: 0, model: "chronos-2" }],
    ["Simulated variant B (TimesFM placeholder)", { absoluteError: 0, model: "timesfm-2.5" }],
  ]);
  let observations = 0;
  let actualUnits = 0;

  for (const { id, history } of products) {
    const training = history.slice(0, -holdoutMonths);
    const heldOut = history.slice(-holdoutMonths);
    const lastMonth = training.at(-1).soldQuantity;
    observations += heldOut.length;
    actualUnits += heldOut.reduce((total, actual) => total + actual.soldQuantity, 0);

    for (const method of methods.values()) {
      const predictions = method.model
        ? simulateForecast(id, training, holdoutMonths, method.model).map(({ forecast }) => forecast)
        : heldOut.map(() => lastMonth);
      for (const [index, actual] of heldOut.entries()) {
        method.absoluteError += Math.abs(actual.soldQuantity - predictions[index]);
      }
    }
  }

  console.log(`Held out the final ${holdoutMonths} months of ${products.length} synthetic products (${observations} product-months).`);
  console.log("Both named variants run the same placeholder method with different perturbations.");
  console.table(Array.from(methods, ([method, { absoluteError }]) => ({
    Method: method,
    "MAE (units)": (absoluteError / observations).toFixed(2),
    "WAPE (%)": actualUnits === 0 ? "Unavailable" : ((absoluteError / actualUnits) * 100).toFixed(2),
  })));
} finally {
  await vite.close();
}
