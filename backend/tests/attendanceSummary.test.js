import test from "node:test";
import assert from "node:assert/strict";
import { buildAttendanceSummary } from "../utils/attendanceSummary.js";

test("new users with no records get zero absence and late counts for their first month", () => {
  const monthStart = new Date(2026, 0, 1);
  const rangeEnd = new Date(2026, 0, 31);

  const summary = buildAttendanceSummary({
    userCreatedAt: new Date(2026, 0, 5),
    records: [],
    monthStart,
    rangeEnd,
    workDays: 20
  });

  assert.equal(summary.presentDays, 0);
  assert.equal(summary.lateDays, 0);
  assert.equal(summary.absentDays, 0);
  assert.equal(summary.onTimeDays, 0);
});

test("existing users with no records still get absent counts", () => {
  const monthStart = new Date(2026, 0, 1);
  const rangeEnd = new Date(2026, 0, 31);

  const summary = buildAttendanceSummary({
    userCreatedAt: new Date(2025, 11, 1),
    records: [],
    monthStart,
    rangeEnd,
    workDays: 20
  });

  assert.equal(summary.presentDays, 0);
  assert.equal(summary.lateDays, 0);
  assert.equal(summary.absentDays, 20);
  assert.equal(summary.onTimeDays, 0);
});
