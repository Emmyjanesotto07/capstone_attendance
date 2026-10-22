import test from "node:test";
import assert from "node:assert/strict";
import { detectSuddenScheduleInconsistencies } from "../utils/scheduleInconsistency.js";

const record = (id, date, time) => ({
  id,
  attendanceDate: date,
  amTimeIn: time
});

test("flags a sudden time-in deviation from at least five earlier records", () => {
  const records = [
    record(1, "2026-09-01", "07:55:00"),
    record(2, "2026-09-02", "08:00:00"),
    record(3, "2026-09-03", "08:05:00"),
    record(4, "2026-09-04", "08:00:00"),
    record(5, "2026-09-07", "08:10:00"),
    record(6, "2026-09-08", "05:30:00")
  ];
  const results = detectSuddenScheduleInconsistencies(records);

  assert.equal(results.get(6).detected, true);
  assert.equal(results.get(6).baselineTimeIn, "08:00");
  assert.match(results.get(6).reason, /earlier than this employee's previous pattern/);
});

test("does not flag normal time-in variation or deviations within two hours", () => {
  const records = [
    record(1, "2026-09-01", "08:00"),
    record(2, "2026-09-02", "08:00"),
    record(3, "2026-09-03", "08:00"),
    record(4, "2026-09-04", "08:00"),
    record(5, "2026-09-07", "08:00"),
    record(6, "2026-09-08", "09:30")
  ];

  assert.equal(detectSuddenScheduleInconsistencies(records).get(6).detected, false);
});

test("does not flag a deviation until five earlier valid time-ins exist", () => {
  const records = [
    record(1, "2026-09-01", "08:00"),
    record(2, "2026-09-02", "08:00"),
    record(3, "2026-09-03", "08:00"),
    record(4, "2026-09-04", "08:00"),
    record(5, "2026-09-07", "05:30")
  ];

  assert.equal(detectSuddenScheduleInconsistencies(records).get(5).detected, false);
});