export const ABSENCE_ALERT_MIN_WORK_DAYS = 5;
export const ABSENCE_ALERT_MIN_ABSENT_DAYS = 3;
export const ABSENCE_ALERT_RATE = 0.35;

export const buildAbsenceAlertMessage = ({ completeName, absentDays, lateDays }) => {
  const firstName = String(completeName || "Staff").trim().split(/\s+/)[0] || "Staff";

  return `Hi ${firstName}, system record update: You have logged ${absentDays} absences and ${lateDays} late arrivals for this period. You have reached the maximum attendance threshold. Please check your portal or contact HR today.`;
};

export const hasExceededAbsenceLimit = ({ absentDays, expectedWorkDays }) => {
  if (!Number.isFinite(absentDays) || !Number.isFinite(expectedWorkDays)) {
    return false;
  }

  if (expectedWorkDays < ABSENCE_ALERT_MIN_WORK_DAYS || expectedWorkDays <= 0) {
    return false;
  }

  return (
    absentDays >= ABSENCE_ALERT_MIN_ABSENT_DAYS ||
    absentDays / expectedWorkDays >= ABSENCE_ALERT_RATE
  );
};