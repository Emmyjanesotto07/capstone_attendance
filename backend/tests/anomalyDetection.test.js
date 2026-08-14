import test from "node:test";
import assert from "node:assert/strict";
import { detectAttendanceAnomaly } from "../utils/anomalyDetection.js";

const toIso = (date) => date.toISOString().slice(0, 10);

const buildDates = (startDate, count) => {
  const dates = [];
  const cursor = new Date(startDate.getTime());

  for (let index = 0; index < count; index += 1) {
    dates.push(toIso(cursor));
    cursor.setUTCDate(cursor.getUTCDate() + 1);
  }

  return dates;
};

test("detects a sudden absence spike as an anomaly", () => {
  const analysisStart = new Date(Date.UTC(2026, 0, 1));
  const analysisEnd = new Date(Date.UTC(2026, 0, 31));

  const historicalDates = buildDates(analysisStart, 20);
  const recentDates = ["2026-01-26", "2026-01-27", "2026-01-28", "2026-01-29", "2026-01-30", "2026-01-31"];
  const attendanceDates = historicalDates.filter((date) => !["2026-01-26", "2026-01-27", "2026-01-28", "2026-01-29", "2026-01-30", "2026-01-31"].includes(date));

  const anomaly = detectAttendanceAnomaly({
    attendanceDates: attendanceDates.concat(recentDates),
    analysisStartUtc: analysisStart,
    analysisEndUtc: analysisEnd
  });

  assert.equal(anomaly.isAnomalous, true);
  assert.equal(anomaly.severity, "high");
});

test("does not flag stable attendance as an anomaly", () => {
  const analysisStart = new Date(Date.UTC(2026, 0, 1));
  const analysisEnd = new Date(Date.UTC(2026, 0, 31));

  const attendanceDates = buildDates(analysisStart, 20).slice(0, 20);

  const anomaly = detectAttendanceAnomaly({
    attendanceDates,
    analysisStartUtc: analysisStart,
    analysisEndUtc: analysisEnd
  });

  assert.equal(anomaly.isAnomalous, false);
  assert.equal(anomaly.severity, "low");
});
