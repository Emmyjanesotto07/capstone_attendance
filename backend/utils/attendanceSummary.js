const toTimeMinutes = (value) => {
  if (!value) {
    return null;
  }

  const text = String(value).trim();

  if (!text) {
    return null;
  }

  const match = text.match(/^(\d{1,2}):(\d{2})(?::\d{2})?\s*(AM|PM)?$/i);

  if (!match) {
    return null;
  }

  let hours = Number(match[1]);
  const minutes = Number(match[2]);
  const meridiem = String(match[3] || "").toUpperCase();

  if (!Number.isFinite(hours) || !Number.isFinite(minutes) || hours > 23 || minutes > 59) {
    return null;
  }

  if (meridiem === "AM" && hours === 12) {
    hours = 0;
  } else if (meridiem === "PM" && hours < 12) {
    hours += 12;
  }

  return hours * 60 + minutes;
};

const LATE_THRESHOLD_MINUTES = 8 * 60 + 15;
export const FLEXI_TIME_GRACE_MINUTES = 1;

export const getShiftStartMinutes = (shiftSchedule) => {
  const match = String(shiftSchedule || "").match(/(\d{1,2}:\d{2}(?::\d{2})?\s*(?:AM|PM)?)/i);
  return match ? toTimeMinutes(match[1]) : null;
};

const isLateRecord = (record, { flexiTime, shiftSchedule }) => {
  if (flexiTime) {
    const scheduledStartMinutes = getShiftStartMinutes(shiftSchedule);
    const candidateTime = record?.amTimeIn || record?.timeIn || record?.noonTimeIn || record?.pmTimeIn || null;
    const minutes = toTimeMinutes(candidateTime);

    if (scheduledStartMinutes !== null && minutes !== null) {
      return minutes > scheduledStartMinutes + FLEXI_TIME_GRACE_MINUTES;
    }
  }

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

export const buildAttendanceSummary = ({
  userCreatedAt,
  records,
  monthStart,
  rangeEnd,
  workDays,
  flexiTime = false,
  shiftSchedule = ""
}) => {
  const dailyPresence = new Map();

  records.forEach((record) => {
    const dateKey = String(record.attendanceDate || "").slice(0, 10);

    if (!dateKey) {
      return;
    }

    const lateDetected = isLateRecord(record, { flexiTime, shiftSchedule });
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
