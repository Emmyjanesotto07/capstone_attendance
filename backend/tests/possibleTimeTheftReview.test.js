import test from "node:test";
import assert from "node:assert/strict";
import { buildPossibleTimeTheftReview } from "../utils/possibleTimeTheftReview.js";

test("flags shared punch patterns as possible time theft for review", () => {
  const review = buildPossibleTimeTheftReview({
    fakeAttendanceReview: {
      flagged: true,
      reason: "Same punch pattern appears for five employees."
    }
  });

  assert.equal(review.flagged, true);
  assert.deepEqual(review.reasons, ["Same punch pattern appears for five employees."]);
});

test("includes unusually early and sudden time-in signals", () => {
  const review = buildPossibleTimeTheftReview({
    suspiciousTimeIn: {
      isSuspicious: true,
      deviationMinutes: -150,
      reason: "Time-in is 150 minutes earlier than scheduled."
    },
    suddenScheduleInconsistency: {
      detected: true,
      reason: "Time-in differs from the employee's normal pattern."
    }
  });

  assert.equal(review.flagged, true);
  assert.equal(review.reasons.length, 2);
});

test("does not treat late arrivals or flexi-time schedule variation as time theft", () => {
  const review = buildPossibleTimeTheftReview({
    suspiciousTimeIn: {
      isSuspicious: true,
      deviationMinutes: 150,
      reason: "Time-in is later than scheduled."
    },
    suddenScheduleInconsistency: {
      detected: true,
      reason: "Time-in differs from the employee's normal pattern."
    },
    flexiTime: true
  });

  assert.equal(review.flagged, false);
  assert.deepEqual(review.reasons, []);
});

test("does not flag attendance without review signals", () => {
  assert.deepEqual(buildPossibleTimeTheftReview({}), {
    flagged: false,
    reasons: []
  });
});
