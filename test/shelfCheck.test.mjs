import assert from "node:assert/strict";
import { test } from "node:test";
import { compareShelfFrame, summarizeShelfFrames } from "../src/utils/shelfCheck.ts";

const pixels = (r, g, b) => new Uint8ClampedArray([r, g, b, 255, r, g, b, 255]);
const stocked = pixels(130, 160, 130);
const empty = pixels(31, 43, 54);

test("separates shelf references and rejects ambiguous or unrelated frames", () => {
  assert.equal(compareShelfFrame(pixels(128, 152, 124), stocked, empty), "stocked");
  assert.equal(compareShelfFrame(pixels(37, 46, 51), stocked, empty), "empty");
  assert.equal(compareShelfFrame(pixels(80, 100, 92), stocked, empty), "uncertain");
  assert.equal(compareShelfFrame(pixels(255, 255, 255), stocked, empty), "uncertain");
  assert.equal(compareShelfFrame(stocked, stocked, stocked), "uncertain");
});

test("requires the most recent two sampled frames to agree", () => {
  assert.equal(summarizeShelfFrames(["stocked", "empty", "empty"]), "empty");
  assert.equal(summarizeShelfFrames(["empty", "empty", "stocked"]), "uncertain");
});
