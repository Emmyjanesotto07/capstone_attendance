const MINIMUM_HISTORY_RECORDS = 5;
const SUDDEN_DEVIATION_MINUTES = 120;

const toTimeMinutes = (value) => {
  const match = String(value || "").match(/^\s*(\d{1,2}):(\d{2})(?::\d{2})?\s*(AM|PM)?\s*$/i);

  if (!match) {
    return null;
  }

  let hours = Number(match[1]);
  const minutes = Number(match[2]);
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

const getMedian = (values) => {
  const sorted = [...values].sort((left, right) => left - right);
  const middle = Math.floor(sorted.length / 2);

  return sorted.length % 2 === 0
    ? (sorted[middle - 1] + sorted[middle]) / 2
    : sorted[middle];
};

const formatTime = (minutes) => {
  const rounded = Math.round(minutes);
  return `${String(Math.floor(rounded / 60)).padStart(2, "0")}:${String(rounded % 60).padStart(2, "0")}`;
};

export const detectSuddenScheduleInconsistencies = (records) => {
  const sortedRecords = [...records].sort((left, right) =>
    String(left.attendanceDate || "").localeCompare(String(right.attendanceDate || ""))
  );
  const history = [];
  const results = new Map();

  sortedRecords.forEach((record) => {
    const timeIn = record.amTimeIn || record.timeIn;
    const actualMinutes = toTimeMinutes(timeIn);

    if (actualMinutes === null) {
      return;
    }

    if (history.length >= MINIMUM_HISTORY_RECORDS) {
      const baselineMinutes = getMedian(history);
      const deviationMinutes = actualMinutes - baselineMinutes;
      const isInconsistent = Math.abs(deviationMinutes) > SUDDEN_DEVIATION_MINUTES;
      const direction = deviationMinutes < 0 ? "earlier" : "later";

      results.set(Number(record.id), {
        detected: isInconsistent,
        baselineTimeIn: formatTime(baselineMinutes),
        actualTimeIn: formatTime(actualMinutes),
        deviationMinutes: Math.round(deviationMinutes),
        reason: isInconsistent
          ? `Time-in is ${Math.abs(Math.round(deviationMinutes))} minutes ${direction} than this employee's previous pattern (${formatTime(baselineMinutes)} median).`
          : null
      });
    } else {
      results.set(Number(record.id), {
        detected: false,
        baselineTimeIn: null,
        actualTimeIn: formatTime(actualMinutes),
        deviationMinutes: null,
        reason: null
      });
    }

    history.push(actualMinutes);
  });

  return results;
};