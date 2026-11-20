import { expect, test } from "@playwright/test";
import { fileURLToPath } from "node:url";
import { password, stores } from "./fixtures.mjs";

const sample = (name: string) => fileURLToPath(new URL(`../sample-data/${name}`, import.meta.url));

test("manager imports dated inventory and calculates a reorder", async ({ page }, testInfo) => {
  const store = testInfo.project.name === "store-mobile" ? stores.mobile : stores.desktop;
  await page.goto("/store-inventory");
  await expect(page.getByRole("heading", { name: "Store inventory" })).toBeVisible();
  await page.getByLabel("Email").fill(store.email);
  await page.getByLabel("Password").fill(password);
  await page.getByRole("button", { name: "Sign in" }).click();
  await expect(page.getByRole("combobox", { name: "Store", exact: true })).toHaveValue(store.storeId);
  await expect(page.getByText("No products imported yet.")).toBeVisible();

  const input = page.getByLabel("Inventory CSV");
  const upload = page.getByRole("button", { name: "Import CSV" });
  await input.setInputFiles(sample("inventory_invalid_quantity.csv"));
  await upload.click();
  await expect(page.getByRole("alert")).toContainText("Row 8 contains an invalid sold_quantity value.");
  await expect(page.getByText("No imports yet.")).toBeVisible();
  await expect(page.getByText("No products imported yet.")).toBeVisible();

  await input.setInputFiles(sample("inventory_valid.csv"));
  await upload.click();
  const bread = page.getByText(/Whole Wheat Bread \(P-1013\).*150 in stock/);
  await expect(bread).toBeVisible();
  await bread.click();
  await expect(page.getByRole("table", { name: "Monthly history for Whole Wheat Bread" })).toBeVisible();
  await page.getByRole("combobox", { name: "Product", exact: true }).selectOption("P-1013");
  await page.getByLabel("Expected demand").fill("250");
  await page.getByLabel("Safety stock").fill("30");
  await page.getByLabel("Incoming stock").fill("20");
  await page.getByRole("button", { name: "Calculate reorder" }).click();
  await expect(page.getByText("Recommended order: 110 units")).toBeVisible();

  await page.reload();
  await expect(bread).toBeVisible();
  await expect(page.getByText(/inventory_valid\.csv.*36 rows/)).toBeVisible();
  await page.getByRole("button", { name: "Sign out" }).click();
  await expect(page.getByRole("button", { name: "Sign in" })).toBeVisible();
  await expect(bread).toHaveCount(0);
});
