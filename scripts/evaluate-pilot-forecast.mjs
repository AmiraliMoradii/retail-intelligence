import { readFile } from "node:fs/promises";
import { basename } from "node:path";
import { pathToFileURL } from "node:url";
import { parseInventoryCsvText } from "../src/services/csvService.ts";

function monthIndex(date) {
  return Number(date.slice(0, 4)) * 12 + Number(date.slice(5, 7)) - 1;
}

export function evaluateBaselines(records) {
  const products = new Map();
  for (const row of records) {
    if (!products.has(row.product_id)) products.set(row.product_id, new Map());
    const sales = products.get(row.product_id);
    const month = monthIndex(row.date);
    const total = (sales.get(month) ?? 0) + row.sold_quantity;
    if (!Number.isSafeInteger(total)) throw new Error("A product-month total exceeds the supported quantity.");
    sales.set(month, total);
  }

  const methods = [
    { name: "Last observed month", predict: (previous) => previous[0], absoluteError: 0, signedError: 0 },
    { name: "Three-month moving average", predict: (previous) => previous.reduce((sum, units) => sum + units, 0) / previous.length, absoluteError: 0, signedError: 0 },
  ];
  let observations = 0;
  let missingHistory = 0;
  let actualUnits = 0;
  let eligibleProducts = 0;

  for (const sales of products.values()) {
    let evaluated = false;
    for (const [month, actual] of sales) {
      const previous = [sales.get(month - 1), sales.get(month - 2), sales.get(month - 3)];
      if (previous.includes(undefined)) {
        missingHistory++;
        continue;
      }
      evaluated = true;
      observations++;
      actualUnits += actual;
      for (const method of methods) {
        const error = method.predict(previous) - actual;
        method.absoluteError += Math.abs(error);
        method.signedError += error;
      }
    }
    if (evaluated) eligibleProducts++;
  }

  return {
    observations,
    missingHistory,
    eligibleProducts,
    totalProducts: products.size,
    methods: methods.map(({ name, absoluteError, signedError }) => ({
      name,
      mae: observations ? absoluteError / observations : null,
      wape: actualUnits ? absoluteError / actualUnits : null,
      bias: observations ? signedError / observations : null,
    })),
  };
}

async function main(fileName) {
  if (!fileName) throw new Error("Usage: node scripts/evaluate-pilot-forecast.mjs <de-identified.csv>");
  const csv = await readFile(fileName);
  const result = parseInventoryCsvText(basename(fileName), csv.byteLength, csv.toString("utf8"));
  if (!result.ok) throw new Error(result.issues[0]?.message ?? "The inventory file could not be validated.");
  const summary = evaluateBaselines(result.records);
  if (!summary.observations) throw new Error("Include at least four consecutive, complete months for a product.");
  console.log(JSON.stringify(summary, null, 2));
}

if (process.argv[1] && pathToFileURL(process.argv[1]).href === import.meta.url) {
  main(process.argv[2]).catch((error) => {
    console.error(error.code ? "Could not read the inventory CSV." : error.message);
    process.exitCode = 1;
  });
}
