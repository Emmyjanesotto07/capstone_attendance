import test from "node:test";
import assert from "node:assert/strict";
import { normalizeEmployeeNameKey, resolveEmployeeMatch } from "../utils/employeeIdentity.js";

test("normalizes employee names without punctuation and extra spaces", () => {
  assert.equal(normalizeEmployeeNameKey("Riza F. Sotto"), "riza f sotto");
  assert.equal(normalizeEmployeeNameKey("  Riza   Sotto  "), "riza sotto");
});

test("matches by name when biometric ID is missing or not available", () => {
  const users = [
    { id: 7, employeeBiometricId: "", CompleteName: "Riza F. Sotto" },
    { id: 3, employeeBiometricId: "123", CompleteName: "Maria Santos" }
  ];

  const match = resolveEmployeeMatch({
    candidateBiometricId: "",
    candidateName: "Riza Sotto",
    users
  });

  assert.ok(match);
  assert.equal(match.id, 7);
});

test("matches a numeric biometric ID despite leading zeros", () => {
  const users = [
    { id: 12, employeeBiometricId: "12", CompleteName: "Riza M. Sotto" }
  ];

  const match = resolveEmployeeMatch({
    candidateBiometricId: "0012",
    users
  });

  assert.ok(match);
  assert.equal(match.id, 12);
});

test("does not match by name when a supplied biometric ID is unknown", () => {
  const users = [
    { id: 12, employeeBiometricId: "12", CompleteName: "Riza M. Sotto" }
  ];

  const match = resolveEmployeeMatch({
    candidateBiometricId: "999",
    candidateName: "Riza M. Sotto",
    users
  });

  assert.equal(match, null);
});

test("does not guess when multiple registered IDs normalize to the same biometric ID", () => {
  const users = [
    { id: 12, employeeBiometricId: "12", CompleteName: "Riza M. Sotto" },
    { id: 13, employeeBiometricId: "012", CompleteName: "Riza M. Sotto" }
  ];

  const match = resolveEmployeeMatch({
    candidateBiometricId: "0012",
    candidateName: "Riza M. Sotto",
    users
  });

  assert.equal(match, null);
});

test("does not choose between duplicate exact biometric IDs after trimming", () => {
  const users = [
    { id: 12, employeeBiometricId: "12", CompleteName: "Riza M. Sotto" },
    { id: 13, employeeBiometricId: " 12 ", CompleteName: "Riza M. Sotto" }
  ];

  const match = resolveEmployeeMatch({
    candidateBiometricId: "12",
    candidateName: "Riza M. Sotto",
    users
  });

  assert.equal(match, null);
});
