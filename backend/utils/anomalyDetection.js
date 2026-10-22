const toDateKey = (value) => {
  const date = value instanceof Date ? value : new Date(value);

  if (Number.isNaN(date.getTime())) {
    return null;
  }

  return date.toISOString().slice(0, 10);
};

const countBusinessDays = (startDate, endDate) => {
  let count = 0;
  const cursor = new Date(startDate.getTime());

  while (cursor <= endDate) {
    const day = cursor.getUTCDay();

    if (day !== 0 && day !== 6) {
      count += 1;
    }

    cursor.setUTCDate(cursor.getUTCDate() + 1);
  }

  return count;
};

export const detectAttendanceAnomaly = ({ attendanceDates = [], analysisStartUtc, analysisEndUtc }) => {
  const start = new Date(analysisStartUtc);
  const end = new Date(analysisEndUtc);
  const validAttendanceDates = Array.isArray(attendanceDates)
    ? attendanceDates.map(toDateKey).filter(Boolean)
    : [];

  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime()) || start > end) {
    return {
      isAnomalous: false,
      severity: "insufficient",
      dataAvailable: false,
      score: 0,
      recentAbsenceRate: 0,
      baselineAbsenceRate: 0,
      reason: "Insufficient date range for analysis."
    };
  }

  if (validAttendanceDates.length === 0) {
    return {
      isAnomalous: false,
      severity: "insufficient",
      dataAvailable: false,
      score: 0,
      recentAbsenceRate: 0,
      baselineAbsenceRate: 0,
      reason: "No attendance records are available for analysis yet."
    };
  }

  const uniqueDates = new Set(
    validAttendanceDates
      .filter((date) => date && date >= toDateKey(start) && date <= toDateKey(end))
  );
  const businessDates = [...uniqueDates].filter((date) => {
    const day = new Date(`${date}T00:00:00.000Z`).getUTCDay();
    return day !== 0 && day !== 6;
  }).sort();
  const firstObservedDate = businessDates[0] ? new Date(`${businessDates[0]}T00:00:00.000Z`) : start;
  const lastObservedDate = businessDates.at(-1) ? new Date(`${businessDates.at(-1)}T00:00:00.000Z`) : end;
  const observedWorkDays = countBusinessDays(firstObservedDate, lastObservedDate);
  const missingWorkDays = Math.max(0, observedWorkDays - businessDates.length);
  const recentAbsenceRate = observedWorkDays ? missingWorkDays / observedWorkDays : 0;
  const baselineAbsenceRate = 0;
  const absenceSpike = recentAbsenceRate;
  const score = Math.max(0, Math.min(100, Math.round(recentAbsenceRate * 100)));
  const isAnomalous = observedWorkDays >= 5 && (missingWorkDays >= 3 || absenceSpike >= 0.35);
  const severity = isAnomalous && missingWorkDays >= 3 ? "high" : isAnomalous ? "medium" : "low";

  return {
    isAnomalous,
    severity,
    dataAvailable: true,
    score,
    recentAbsenceRate: Number(recentAbsenceRate.toFixed(2)),
    baselineAbsenceRate: Number(baselineAbsenceRate.toFixed(2)),
    reason: isAnomalous
      ? `Absence rate rose to ${Math.round(recentAbsenceRate * 100)}% in the latest period.`
      : "Attendance pattern is within the expected range."
  };
};