import test from "node:test";
import assert from "node:assert/strict";
import { detectRepeatedLatePattern } from "../utils/repeatedLatePattern.js";

test("detects repeated late arrivals when the default monthly limit is reached", () => {
  const pattern = detectRepeatedLatePattern({ lateDays: 3 });

  assert.equal(pattern.detected, true);
  assert.equal(pattern.threshold, 3);
  assert.match(pattern.message, /3 late arrivals this month/);
});

test("does not flag late arrivals below the configured limit", () => {
  const pattern = detectRepeatedLatePattern({ lateDays: 2, threshold: 4 });

  assert.equal(pattern.detected, false);
  assert.equal(pattern.message, null);
});

test("accepts a configured threshold and falls back for invalid thresholds", () => {
  assert.equal(detectRepeatedLatePattern({ lateDays: 5, threshold: 5 }).detected, true);
  assert.equal(detectRepeatedLatePattern({ lateDays: 3, threshold: 0 }).threshold, 3);
});