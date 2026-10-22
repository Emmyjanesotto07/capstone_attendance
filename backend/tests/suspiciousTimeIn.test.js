import test from "node:test";
import assert from "node:assert/strict";
import { detectSuspiciousTimeIn } from "../utils/suspiciousTimeIn.js";

test("flags a time-in more than two hours before the scheduled shift", () => {
  const result = detectSuspiciousTimeIn({
    timeIn: "05:30:00",
    shiftSchedule: "8:00 AM - 5:00 PM"
  });

  assert.equal(result.isSuspicious, true);
  assert.match(result.reason, /earlier than the scheduled shift start/);
});

test("flags a time-in more than two hours after the scheduled shift", () => {
  const result = detectSuspiciousTimeIn({
    timeIn: "11:00 AM",
    shiftSchedule: "08:00 - 17:00"
  });

  assert.equal(result.isSuspicious, true);
  assert.match(result.reason, /later than the scheduled shift start/);
});

test("does not flag normal deviations or unparseable schedules", () => {
  assert.equal(detectSuspiciousTimeIn({
    timeIn: "08:15",
    shiftSchedule: "8:00 AM - 5:00 PM"
  }).isSuspicious, false);
  assert.equal(detectSuspiciousTimeIn({
    timeIn: "08:00",
    shiftSchedule: "Rotating schedule"
  }).isSuspicious, false);
});