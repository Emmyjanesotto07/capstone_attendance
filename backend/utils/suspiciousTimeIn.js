const SUSPICIOUS_DEVIATION_MINUTES = 120;

const parseTimeMinutes = (value) => {
  const match = String(value || "").match(/\b(\d{1,2})(?::(\d{2}))?\s*(AM|PM)?\b/i);

  if (!match) {
    return null;
  }

  let hours = Number(match[1]);
  const minutes = Number(match[2] || 0);
  const meridiem = String(match[3] || "").toUpperCase();

  if (minutes > 59) {
    return null;
  }

  if (meridiem) {
    if (hours < 1 || hours > 12) {
      return null;
    }

    hours = (hours % 12) + (meridiem === "PM" ? 12 : 0);
  } else if (hours > 23) {
    return null;
  }

  return hours * 60 + minutes;
};

const formatTime = (minutes) => {
  const hours = Math.floor(minutes / 60);
  const remainder = minutes % 60;
  return `${String(hours).padStart(2, "0")}:${String(remainder).padStart(2, "0")}`;
};

export const detectSuspiciousTimeIn = ({ timeIn, shiftSchedule }) => {
  const actualMinutes = parseTimeMinutes(timeIn);
  const scheduledMinutes = parseTimeMinutes(shiftSchedule);

  if (actualMinutes === null || scheduledMinutes === null) {
    return {
      isSuspicious: false,
      reason: null,
      scheduledStart: null,
      actualTimeIn: null,
      deviationMinutes: null
    };
  }

  const deviationMinutes = actualMinutes - scheduledMinutes;
  const isSuspicious = Math.abs(deviationMinutes) > SUSPICIOUS_DEVIATION_MINUTES;
  const direction = deviationMinutes < 0 ? "earlier" : "later";

  return {
    isSuspicious,
    reason: isSuspicious
      ? `Time-in is ${Math.abs(deviationMinutes)} minutes ${direction} than the scheduled shift start.`
      : null,
    scheduledStart: formatTime(scheduledMinutes),
    actualTimeIn: formatTime(actualMinutes),
    deviationMinutes
  };
};