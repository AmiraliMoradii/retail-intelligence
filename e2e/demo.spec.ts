import { expect, test } from "@playwright/test";

test("sample inventory runs without a store account", async ({ page }, testInfo) => {
  const apiRequests: string[] = [];
  page.on("request", (request) => {
    if (/(^|\/)api(\/|$)/.test(new URL(request.url()).pathname)) apiRequests.push(request.url());
  });

  await page.goto("./");
  const openStore = page.getByRole("button", { name: "Open sample store" });
  await expect(openStore).toBeVisible();
  await expect(page.getByRole("link", { name: /store inventory/i })).toHaveCount(0);
  await openStore.click();
  await expect(page).toHaveURL(/#\/overview$/);

  if (testInfo.project.name === "demo-desktop") {
    const skip = page.getByRole("link", { name: "Skip to main content" });
    await skip.focus();
    await page.keyboard.press("Enter");
    await expect(page.locator("#main-content")).toBeFocused();
    await expect(page).toHaveURL(/#\/overview$/);
  } else {
    await page.getByRole("button", { name: "Open navigation menu" }).click();
  }

  await page.getByRole("navigation", { name: "Main navigation" })
    .getByRole("link", { name: "Data Management" }).click();
  await expect(page.getByRole("heading", { name: "Data Management" })).toBeVisible();
  await page.reload();
  await expect(page.getByRole("heading", { name: "Data Management" })).toBeVisible();
  await expect(page.locator('input[type="file"]')).toHaveCount(0);
  await expect(page.getByRole("tab", { name: /video/i })).toHaveCount(0);

  await page.getByRole("button", { name: "Try a sample file" }).click();
  await page.getByRole("menuitem", { name: /Invalid quantity/ }).click();
  await expect(page.getByText("Row 8 contains an invalid sold_quantity value.")).toBeVisible();
  await expect(page.getByRole("button", { name: "Confirm import" })).toHaveCount(0);
  await expect(page.getByText("No CSV files imported yet")).toBeVisible();
  await page.getByRole("button", { name: "Start over" }).click();

  await page.getByRole("button", { name: "Try a sample file" }).click();
  await page.getByRole("menuitem", { name: /Valid inventory file/ }).click();
  await expect(page.getByText("First 10 of 36 records")).toBeVisible();
  await page.getByRole("button", { name: "Confirm import" }).click();
  const history = page.getByRole("table", { name: "Inventory import history" });
  const receipt = history.getByRole("row").filter({ hasText: "inventory_valid.csv" });
  await expect(receipt.getByRole("cell").nth(2)).toHaveText("36");
  await expect(receipt.getByRole("cell").nth(3)).toHaveText("1");
  await expect(receipt.getByRole("cell").nth(4)).toHaveText("2");
  await page.getByRole("link", { name: "View updated inventory" }).click();
  await expect(page.getByRole("heading", { name: "Inventory Management" })).toBeVisible();
  await expect(page.getByText("3 of 26 products match your filters")).toBeVisible();
  await page.getByRole("searchbox", { name: "Search products" }).fill("Whole Wheat Bread");
  const bread = page.getByRole("row").filter({ hasText: "Whole Wheat Bread" });
  await expect(bread.getByRole("cell", { name: "150", exact: true })).toBeVisible();

  await page.reload();
  await expect(page.getByText("Imported 36 records from inventory_valid.csv")).toBeVisible();

  await page.goto("#/forecasting");
  const calculator = page.getByRole("region", { name: "Order Recommendation" });
  await calculator.getByRole("button", { name: "Load example" }).click();
  await expect(calculator.getByRole("paragraph").filter({ hasText: /^200\s*units$/ })).toBeVisible();
  await calculator.getByRole("spinbutton", { name: "Current stock", exact: true }).fill("300");
  await expect(calculator.getByRole("paragraph").filter({ hasText: /^0\s*units$/ })).toBeVisible();

  await page.goto("#/store-inventory");
  await expect(page.getByRole("heading", { name: "Page not found" })).toBeVisible();
  await expect(page.getByLabel("Password")).toHaveCount(0);
  expect(apiRequests).toEqual([]);
});
