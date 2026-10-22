import test from "node:test";
import assert from "node:assert/strict";
import { buildCscForm48Groups } from "../utils/cscForm48Groups.js";

test("does not create a DTR for an employee with no monthly attendance records", () => {
  const groups = buildCscForm48Groups({
    employees: [{ id: 12, employeeBiometricId: "002", employeeName: "Riza F Sotto" }],
    records: [],
    yearMonth: "2026-04"
  });

  assert.deepEqual(groups, []);
});

test("creates an ID-labelled DTR for attendance with only an unmatched biometric ID", () => {
  const groups = buildCscForm48Groups({
    employees: [],
    records: [{ id: 3, employeeBiometricId: "002", attendanceDate: "2026-04-06", timeIn: "08:00" }],
    yearMonth: "2026-04"
  });

  assert.equal(groups.length, 1);
  assert.equal(groups[0].employeeName, "ID 002");
  assert.equal(groups[0].records.length, 1);
});

test("includes only employees with records when ID-only records are present", () => {
  const groups = buildCscForm48Groups({
    employees: [{ id: 12, employeeBiometricId: "002", employeeName: "Riza F Sotto" }],
    records: [
      { id: 3, employeeBiometricId: "002", matchedUserId: 12, attendanceDate: "2026-04-06" },
      { id: 4, employeeBiometricId: "999", attendanceDate: "2026-04-06" }
    ],
    yearMonth: "2026-04"
  });

  assert.equal(groups.length, 2);
  assert.equal(groups[0].records.length, 1);
  assert.equal(groups[1].employeeName, "ID 999");
});

test("omits registered employees with no records alongside employees with attendance", () => {
  const groups = buildCscForm48Groups({
    employees: [
      { id: 12, employeeBiometricId: "002", employeeName: "Riza F Sotto" },
      { id: 15, employeeBiometricId: "003", employeeName: "No Attendance" }
    ],
    records: [{ id: 3, employeeBiometricId: "002", matchedUserId: 12, attendanceDate: "2026-04-06" }],
    yearMonth: "2026-04"
  });

  assert.equal(groups.length, 1);
  assert.equal(groups[0].employeeName, "Riza F Sotto");
});