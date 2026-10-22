import test from "node:test";
import assert from "node:assert/strict";
import { buildAbsenceAlertMessage, hasExceededAbsenceLimit } from "../utils/absenceAlert.js";

test("triggers the alert at three absent workdays", () => {
  assert.equal(hasExceededAbsenceLimit({ absentDays: 3, expectedWorkDays: 10 }), true);
});

test("triggers the alert when absence rate reaches 35 percent", () => {
  assert.equal(hasExceededAbsenceLimit({ absentDays: 2, expectedWorkDays: 5 }), true);
});

test("does not trigger before five workdays or below both limits", () => {
  assert.equal(hasExceededAbsenceLimit({ absentDays: 2, expectedWorkDays: 4 }), false);
  assert.equal(hasExceededAbsenceLimit({ absentDays: 2, expectedWorkDays: 10 }), false);
});

test("personalizes the alert with the staff first name and attendance counts", () => {
  assert.equal(
    buildAbsenceAlertMessage({ completeName: "Riza Santos", absentDays: 6, lateDays: 5 }),
    "Hi Riza, system record update: You have logged 6 absences and 5 late arrivals for this period. You have reached the maximum attendance threshold. Please check your portal or contact HR today."
  );
});