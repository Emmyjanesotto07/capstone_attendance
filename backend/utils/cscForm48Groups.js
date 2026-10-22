const getRecordKey = (record) => record.id || [
  record.employeeBiometricId,
  record.attendanceDate,
  record.timeIn || "",
  record.timeOut || ""
].join("::");

export const buildCscForm48Groups = ({ employees, records, yearMonth }) => {
  const groupsByUserId = new Map();
  const groupsByBiometricId = new Map();

  employees.forEach((employee) => {
    const employeeId = Number(employee.id);
    const biometricId = String(employee.employeeBiometricId || "").trim();
    const employeeName = String(employee.employeeName || "").trim();
    const group = {
      employeeBiometricId: biometricId || null,
      employeeName: employeeName || (biometricId ? `ID ${biometricId}` : `ID ${employeeId}`),
      yearMonth,
      records: []
    };

    groupsByUserId.set(employeeId, group);

    if (biometricId) {
      groupsByBiometricId.set(biometricId, group);
    }
  });

  const unmatchedGroups = new Map();

  records.forEach((record) => {
    const userGroup = groupsByUserId.get(Number(record.matchedUserId));
    const biometricId = String(record.employeeBiometricId || "").trim();
    const biometricGroup = groupsByBiometricId.get(biometricId);
    const targetGroup = userGroup || biometricGroup;

    if (targetGroup) {
      targetGroup.records.push(record);
      return;
    }

    if (!biometricId) {
      return;
    }

    if (!unmatchedGroups.has(biometricId)) {
      unmatchedGroups.set(biometricId, {
        employeeBiometricId: biometricId,
        employeeName: String(record.employeeName || "").trim() || `ID ${biometricId}`,
        yearMonth,
        records: []
      });
    }

    unmatchedGroups.get(biometricId).records.push(record);
  });

  const uniqueRecords = (groupRecords) => Array.from(
    new Map(groupRecords.map((record) => [getRecordKey(record), record])).values()
  );

  const employeeGroups = Array.from(groupsByUserId.values()).map((group) => ({
    ...group,
    records: uniqueRecords(group.records)
  }));
  const unmatchedEmployeeGroups = Array.from(unmatchedGroups.values()).map((group) => ({
    ...group,
    records: uniqueRecords(group.records)
  }));

  return [...employeeGroups, ...unmatchedEmployeeGroups].filter((group) => group.records.length > 0);
};