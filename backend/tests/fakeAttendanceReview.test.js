import test from "node:test";
import assert from "node:assert/strict";
import { detectSharedPunchPatterns } from "../utils/fakeAttendanceReview.js";

const sameDailyPunches = (id) => ({
  id,
  matchedUserId: id,
  attendanceDate: "2026-09-10",
  amTimeIn: "08:00:00",
  amTimeOut: "12:00:00",
  noonTimeIn: "13:00:00",
  pmTimeOut: "17:00:00"
});

test("flags an identical full-day punch pattern shared by five employees", () => {
  const records = [1, 2, 3, 4, 5].map(sameDailyPunches);
  const [result] = detectSharedPunchPatterns([records[0]], records);

  assert.equal(result.flagged, true);
  assert.equal(result.matchingEmployees, 5);
  assert.match(result.reason, /5 employees/);
});

test("does not flag a common pattern shared by fewer than five employees", () => {
  const records = [1, 2, 3, 4].map(sameDailyPunches);
  const [result] = detectSharedPunchPatterns([records[0]], records);

  assert.equal(result.flagged, false);
  assert.equal(result.reason, null);
});

test("requires the same date, at least two punches, and distinct employees", () => {
  const target = sameDailyPunches(1);
  const records = [
    target,
    ...[2, 3, 4].map(sameDailyPunches),
    { ...sameDailyPunches(5), attendanceDate: "2026-09-11" },
    { ...sameDailyPunches(6), pmTimeOut: "17:01:00" },
    { ...sameDailyPunches(1), id: 7 }
  ];
  const [result] = detectSharedPunchPatterns([target], records);

  assert.equal(result.flagged, false);
  assert.equal(result.matchingEmployees, 4);
});

test("does not flag a pattern with only one recorded punch", () => {
  const records = [1, 2, 3, 4, 5].map((id) => ({
    id,
    matchedUserId: id,
    attendanceDate: "2026-09-10",
    amTimeIn: "08:00:00"
  }));
  const [result] = detectSharedPunchPatterns([records[0]], records);

  assert.equal(result.flagged, false);
});