const toTimeMinutes = (value) => {
  if (!value) {
    return null;
  }

  const text = String(value).trim();

  if (!text) {
    return null;
  }

  const parts = text.split(":");

  if (parts.length < 2) {
    return null;
  }

  const hours = Number(parts[0]);
  const minutes = Number(parts[1]);

  if (!Number.isFinite(hours) || !Number.isFinite(minutes)) {
    return null;
  }

  return hours * 60 + minutes;
};

const LATE_THRESHOLD_MINUTES = 8 * 60 + 15;

const isLateRecord = (record) => {
  const remarks = String(record?.remarks || "").trim().toLowerCase();

  if (remarks.includes("late")) {
    return true;
  }

  const candidateTime = record?.amTimeIn || record?.timeIn || record?.noonTimeIn || record?.pmTimeIn || null;
  const minutes = toTimeMinutes(candidateTime);

  return minutes !== null && minutes > LATE_THRESHOLD_MINUTES;
};

const isNewUserInRange = (userCreatedAt, monthStart, rangeEnd) => {
  if (!userCreatedAt) {
    return false;
  }

  const createdAt = new Date(userCreatedAt);

  if (!Number.isFinite(createdAt.getTime())) {
    return false;
  }

  const startDate = new Date(monthStart.getFullYear(), monthStart.getMonth(), monthStart.getDate());
  const endDate = new Date(rangeEnd.getFullYear(), rangeEnd.getMonth(), rangeEnd.getDate());
  const createdDate = new Date(createdAt.getFullYear(), createdAt.getMonth(), createdAt.getDate());

  return createdDate >= startDate && createdDate <= endDate;
};

export const buildAttendanceSummary = ({ userCreatedAt, records, monthStart, rangeEnd, workDays }) => {
  const dailyPresence = new Map();

  records.forEach((record) => {
    const dateKey = String(record.attendanceDate || "").slice(0, 10);

    if (!dateKey) {
      return;
    }

    const lateDetected = isLateRecord(record);
    const current = dailyPresence.get(dateKey) || false;

    dailyPresence.set(dateKey, current || lateDetected);
  });

  const presentDays = dailyPresence.size;
  const lateDays = Array.from(dailyPresence.values()).filter(Boolean).length;
  const shouldIgnoreAbsenceForNewUser = isNewUserInRange(userCreatedAt, monthStart, rangeEnd) && presentDays === 0;
  const absentDays = shouldIgnoreAbsenceForNewUser ? 0 : Math.max(workDays - presentDays, 0);
  const onTimeDays = shouldIgnoreAbsenceForNewUser ? 0 : Math.max(presentDays - lateDays, 0);

  return {
    presentDays,
    lateDays,
    absentDays,
    onTimeDays
  };
};
