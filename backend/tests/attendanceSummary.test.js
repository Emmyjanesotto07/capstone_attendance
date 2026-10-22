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

test("counts one present day as late when a 12-hour biometric punch is after the threshold", () => {
  const summary = buildAttendanceSummary({
    userCreatedAt: new Date(2025, 11, 1),
    records: [{ attendanceDate: "2026-01-05", amTimeIn: "08:16 AM" }],
    monthStart: new Date(2026, 0, 1),
    rangeEnd: new Date(2026, 0, 5),
    workDays: 3
  });

  assert.equal(summary.presentDays, 1);
  assert.equal(summary.lateDays, 1);
  assert.equal(summary.onTimeDays, 0);
  assert.equal(summary.absentDays, 2);
});

test("counts on-time punch on time and ignores duplicate punches on the same day", () => {
  const summary = buildAttendanceSummary({
    userCreatedAt: new Date(2025, 11, 1),
    records: [
      { attendanceDate: "2026-01-05", amTimeIn: "08:15:00" },
      { attendanceDate: "2026-01-05", amTimeIn: "08:10:00" }
    ],
    monthStart: new Date(2026, 0, 1),
    rangeEnd: new Date(2026, 0, 5),
    workDays: 3
  });

  assert.equal(summary.presentDays, 1);
  assert.equal(summary.lateDays, 0);
  assert.equal(summary.onTimeDays, 1);
  assert.equal(summary.absentDays, 2);
});

test("uses an employee's scheduled start time and one-minute grace period for flexi-time", () => {
  const summary = buildAttendanceSummary({
    userCreatedAt: new Date(2025, 11, 1),
    records: [
      { attendanceDate: "2026-01-05", amTimeIn: "09:01 AM", remarks: "Late" },
      { attendanceDate: "2026-01-06", amTimeIn: "09:02 AM" }
    ],
    monthStart: new Date(2026, 0, 1),
    rangeEnd: new Date(2026, 0, 6),
    workDays: 4,
    flexiTime: true,
    shiftSchedule: "9:00 AM - 6:00 PM"
  });

  assert.equal(summary.presentDays, 2);
  assert.equal(summary.lateDays, 1);
  assert.equal(summary.onTimeDays, 1);
  assert.equal(summary.absentDays, 2);
});

test("keeps the standard late cutoff for employees without flexi-time", () => {
  const summary = buildAttendanceSummary({
    userCreatedAt: new Date(2025, 11, 1),
    records: [{ attendanceDate: "2026-01-05", amTimeIn: "09:01 AM" }],
    monthStart: new Date(2026, 0, 1),
    rangeEnd: new Date(2026, 0, 5),
    workDays: 1,
    shiftSchedule: "9:00 AM - 6:00 PM"
  });

  assert.equal(summary.lateDays, 1);
});
