import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";
import { parseInventoryCsv, parseInventoryCsvText, REQUIRED_COLUMNS, validateParsed } from "../src/services/csvService.ts";

const validRow = {
  product_id: "P-1",
  product_name: "Whole Wheat Bread",
  date: "2024-02-29",
  ordered_quantity: "12",
  sold_quantity: "0",
};

function validateRow(row) {
  return validateParsed("inventory.csv", 128, [...REQUIRED_COLUMNS], [row]);
}

test("imports the bundled inventory sample", () => {
  const file = new URL("../sample-data/inventory_valid.csv", import.meta.url);
  const csv = readFileSync(file, "utf8");
  const result = parseInventoryCsvText("inventory_valid.csv", Buffer.byteLength(csv), csv);
  assert.equal(result.ok, true);
  assert.equal(result.records.length, 36);
  assert.equal(result.productCount, 3);
});

test("accepts zero sales and a leap day", () => {
  const result = validateRow(validRow);
  assert.equal(result.ok, true);
  assert.equal(result.records[0].sold_quantity, 0);
});

test("accepts a month value with surrounding spaces", () => {
  assert.equal(validateRow({ ...validRow, date: " 2024-02 " }).ok, true);
});

test("rejects dates that would roll into the following month", () => {
  const result = validateRow({ ...validRow, date: "2025-02-29" });
  assert.equal(result.ok, false);
  assert.equal(result.issues[0].column, "date");
});

test("reports required quantities omitted from a row", () => {
  const { ordered_quantity, sold_quantity, ...shortRow } = validRow;
  const result = validateRow(shortRow);
  assert.equal(result.ok, false);
  assert.deepEqual(result.issues.map(({ column }) => column), [
    "ordered_quantity",
    "sold_quantity",
  ]);
});

test("rejects a row with extra fields before import", () => {
  const csv = `${REQUIRED_COLUMNS.join(",")}\nP-1,Bread,2025-01,12,2,unexpected`;
  const result = parseInventoryCsvText("inventory.csv", Buffer.byteLength(csv), csv);
  assert.equal(result.ok, false);
  assert.deepEqual(result.records, []);
  assert.equal(result.issues[0].row, 1);
});

test("rejects duplicate inventory headers after normalization", () => {
  const csv = `${REQUIRED_COLUMNS.join(",")},Sold Quantity\nP-1,Bread,2025-01,12,2,3`;
  const result = parseInventoryCsvText("inventory.csv", Buffer.byteLength(csv), csv);
  assert.equal(result.ok, false);
  assert.deepEqual(result.records, []);
  assert.equal(result.issues[0].column, "sold_quantity");
});

test("rejects quantities that cannot be represented exactly", () => {
  const result = validateRow({ ...validRow, sold_quantity: "9007199254740993" });
  assert.equal(result.ok, false);
  assert.deepEqual(result.records, []);
  assert.equal(result.issues[0].column, "sold_quantity");
});

test("rejects an unterminated quoted value in a browser file", async () => {
  const csv = `${REQUIRED_COLUMNS.join(",")}\nP-1,"Bread,2025-01,12,2`;
  const result = await parseInventoryCsv(new File([csv], "inventory.csv", { type: "text/csv" }));
  assert.equal(result.ok, false);
  assert.deepEqual(result.records, []);
  assert.ok(result.issues.some((issue) => issue.code === "parse_error"));
});
