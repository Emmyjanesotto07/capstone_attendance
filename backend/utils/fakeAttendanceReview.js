const PUNCH_FIELDS = ["amTimeIn", "amTimeOut", "noonTimeOut", "noonTimeIn", "pmTimeIn", "pmTimeOut", "timeIn", "timeOut"];
const MIN_MATCHING_EMPLOYEES = 5;

const getIdentity = (record) => {
  const matchedUserId = Number(record.matchedUserId);

  if (Number.isFinite(matchedUserId) && matchedUserId > 0) {
    return `user:${matchedUserId}`;
  }

  const biometricId = String(record.employeeBiometricId || "").trim();
  return biometricId ? `biometric:${biometricId}` : null;
};

const getPunchSignature = (record) => {
  const punches = PUNCH_FIELDS.map((field) => String(record[field] || "").trim());

  if (punches.filter(Boolean).length < 2) {
    return null;
  }

  return JSON.stringify([String(record.attendanceDate || "").slice(0, 10), ...punches]);
};

export const detectSharedPunchPatterns = (targetRecords, comparisonRecords) => {
  const identitiesBySignature = new Map();

  comparisonRecords.forEach((record) => {
    const signature = getPunchSignature(record);
    const identity = getIdentity(record);

    if (!signature || !identity) {
      return;
    }

    if (!identitiesBySignature.has(signature)) {
      identitiesBySignature.set(signature, new Set());
    }

    identitiesBySignature.get(signature).add(identity);
  });

  return targetRecords.map((record) => {
    const signature = getPunchSignature(record);
    const matchingEmployees = signature ? identitiesBySignature.get(signature)?.size || 0 : 0;
    const flagged = matchingEmployees >= MIN_MATCHING_EMPLOYEES;

    return {
      recordId: record.id,
      flagged,
      matchingEmployees,
      reason: flagged
        ? `Same complete punch pattern appears for ${matchingEmployees} employees on this date. Review the source attendance data.`
        : null
    };
  });
};