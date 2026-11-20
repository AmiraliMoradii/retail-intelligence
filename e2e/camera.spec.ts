import { readFileSync } from "node:fs";
import { expect, test } from "@playwright/test";
import { demoBase, demoPort } from "./fixtures.mjs";

const shelfClip = readFileSync(new URL("../src/assets/synthetic-shelf.mp4", import.meta.url));

test("synthetic shelf footage previews and follows the simulated camera workflow", async ({ page }) => {
  const writes: string[] = [];
  page.on("request", (request) => {
    if (["POST", "PUT", "PATCH"].includes(request.method())) writes.push(request.url());
  });
  await page.goto("/login");
  await page.getByRole("button", { name: "Use demo account" }).click();
  await page.getByRole("button", { name: "Sign in", exact: true }).click();
  await page.getByRole("button", { name: "Skip setup" }).click();
  await page.waitForURL("**/overview");
  await page.goto("/data?tab=video");
  await expect(page.getByText("Video analytics processing is simulated in this prototype.")).toBeVisible();

  const file = page.getByLabel("Video file");
  await file.setInputFiles({ name: "shelf.txt", mimeType: "text/plain", buffer: Buffer.from("synthetic only") });
  await expect(page.getByText("Unsupported video format. Please upload an MP4 file.")).toBeVisible();
  await page.getByRole("button", { name: /start over|try again/i }).click();

  for (const name of ["synthetic-shelf.mp4", "synthetic-shelf-corrupt.mp4"]) {
    if (name === "synthetic-shelf.mp4") {
      await page.getByRole("button", { name: "Use synthetic shelf video" }).click();
    } else {
      await file.setInputFiles({ name, mimeType: "video/mp4", buffer: shelfClip });
    }
    const video = page.getByLabel(`Preview of ${name}`);
    await expect(video).toBeVisible();
    await expect.poll(() => video.evaluate((element: HTMLVideoElement) => element.readyState)).toBeGreaterThanOrEqual(2);
    if (name === "synthetic-shelf.mp4") {
      const green = () => video.evaluate((element: HTMLVideoElement) => {
        const canvas = document.createElement("canvas");
        canvas.width = element.videoWidth;
        canvas.height = element.videoHeight;
        const ctx = canvas.getContext("2d")!;
        ctx.drawImage(element, 0, 0);
        return ctx.getImageData(270, 89, 1, 1).data[1];
      });
      const before = await green();
      expect(before).toBeGreaterThan(100);
      await video.evaluate((element: HTMLVideoElement) => element.play());
      await expect.poll(() => video.evaluate((element: HTMLVideoElement) => element.currentTime)).toBeGreaterThan(1.2);
      await expect.poll(green).toBeLessThan(before - 50);
      await video.evaluate((element: HTMLVideoElement) => element.pause());
    }
    await page.getByRole("combobox", { name: "Assign to camera" }).click();
    await page.getByRole("option", { name: /Center Aisles/ }).click();
    await page.getByRole("button", { name: "Add video" }).click();
  }

  const completed = page.getByRole("listitem").filter({ has: page.getByText("synthetic-shelf.mp4", { exact: true }) });
  const failed = page.getByRole("listitem").filter({ has: page.getByText("synthetic-shelf-corrupt.mp4", { exact: true }) });
  await expect(completed.getByText("Simulated aisle metrics generated.")).toBeVisible({ timeout: 15_000 });
  await expect(failed.getByText("Simulated failure: the video could not be decoded.")).toBeVisible();
  await expect(completed.getByRole("combobox")).toContainText("Center Aisles");

  await page.goto("/cameras");
  await expect(page.getByText("Aisle configuration", { exact: true })).toBeVisible();
  await page.getByRole("list", { name: "Aisle regions" }).getByRole("button", { name: /^Snacks/ }).click();
  await page.getByRole("combobox", { name: "Assigned camera" }).click();
  await page.getByRole("option", { name: "No camera (not measured)" }).click();
  await page.getByRole("button", { name: "Save configuration" }).click();
  await page.goto("/aisles");
  const heatmap = page.getByRole("region", { name: /heatmap/i });
  await expect(heatmap.getByRole("button", { name: /Snacks: no camera coverage/ })).toBeVisible();

  await page.goto("/data?tab=video");
  await completed.getByRole("button", { name: "Preview synthetic-shelf.mp4" }).click();
  await expect(page.getByText(/Preview unavailable — demo fixture or page was refreshed/)).toBeVisible();
  expect(writes).toEqual([]);
});

test("the public camera page plays the bundled shelf clip", async ({ page }) => {
  const site = new URL(demoBase, `http://127.0.0.1:${demoPort}`);
  await page.goto(site.href);
  await page.getByRole("button", { name: "Open sample store" }).click();
  await page.goto(new URL("#/cameras", site).href);
  const clip = page.getByLabel("Synthetic shelf video", { exact: true });
  await expect(clip).toBeVisible();
  await expect(page.locator('input[type="file"]')).toHaveCount(0);
  await clip.evaluate((video: HTMLVideoElement) => video.play());
  await expect.poll(() => clip.evaluate((video: HTMLVideoElement) => video.currentTime)).toBeGreaterThan(1);
  await expect(page.getByRole("link", { name: "Download the sample MP4" })).toBeVisible();
});
