import fs from "fs";
import PDFDocument from "pdfkit";
import { Op, fn, col, where } from "sequelize";
import AttendanceRecord from "../models/AttendanceRecord.js";
import StaffNotification from "../models/StaffNotification.js";
import User from "../models/User.js";
import { buildAttendanceSummary, FLEXI_TIME_GRACE_MINUTES } from "../utils/attendanceSummary.js";
import { resolveEmployeeMatch } from "../utils/employeeIdentity.js";
import { detectAttendanceAnomaly } from "../utils/anomalyDetection.js";
import { buildAbsenceAlertMessage, hasExceededAbsenceLimit } from "../utils/absenceAlert.js";
import { detectSuspiciousTimeIn } from "../utils/suspiciousTimeIn.js";
import { buildCscForm48Groups } from "../utils/cscForm48Groups.js";
import { detectRepeatedLatePattern } from "../utils/repeatedLatePattern.js";
import { detectSharedPunchPatterns } from "../utils/fakeAttendanceReview.js";
import { detectSuddenScheduleInconsistencies } from "../utils/scheduleInconsistency.js";
import { buildPossibleTimeTheftReview } from "../utils/possibleTimeTheftReview.js";

const REQUIRED_HEADERS = {
  employeeBiometricId: ["employee_id", "employeeid", "biometric_id", "biometricid", "id", "enroll_id", "enrollid"],
  employeeName: ["employee", "employee_name", "name", "complete_name", "completename"],
  attendanceDate: ["date", "attendance_date", "day"],
  timeIn: ["timein", "time_in", "in", "arrival"],
  timeOut: ["timeout", "time_out", "out", "departure"],
  remarks: ["remarks", "remark", "note", "notes"]
};

const normalizeHeader = (header) => String(header || "").trim().toLowerCase().replace(/\s+/g, "_");

const parseCsvLine = (line) => {
  const cells = [];
  let current = "";
  let inQuotes = false;

  for (let index = 0; index < line.length; index += 1) {
    const character = line[index];
    const nextCharacter = line[index + 1];

    if (character === '"') {
      if (inQuotes && nextCharacter === '"') {
        current += '"';
        index += 1;
      } else {
        inQuotes = !inQuotes;
      }
      continue;
    }

    if (character === "," && !inQuotes) {
      cells.push(current.trim());
      current = "";
      continue;
    }

    current += character;
  }

  cells.push(current.trim());
  return cells;
};

const detectDelimiter = (line) => {
  const candidates = [",", "\t", ";", "|"];
  const scored = candidates.map((candidate) => ({
    delimiter: candidate,
    count: line.split(candidate).length - 1
  }));

  scored.sort((left, right) => right.count - left.count);

  if (scored[0]?.count > 0) {
    return scored[0].delimiter;
  }

  return ",";
};

const parseDelimitedLine = (line, delimiter) => {
  if (delimiter === ",") {
    return parseCsvLine(line);
  }

  return String(line || "")
    .split(delimiter)
    .map((cell) => String(cell || "").trim());
};

const resolveHeaderIndexes = (headerCells) => {
  const normalizedHeaders = headerCells.map(normalizeHeader);
  const resolved = {};

  Object.entries(REQUIRED_HEADERS).forEach(([field, aliases]) => {
    const matchIndex = normalizedHeaders.findIndex((header) => aliases.includes(header));
    resolved[field] = matchIndex;
  });

  return resolved;
};

const hasHeaderRow = (headerCells) => {
  const normalizedHeaders = headerCells.map(normalizeHeader);

  return normalizedHeaders.some((header) =>
    Object.values(REQUIRED_HEADERS).some((aliases) => aliases.includes(header))
  );
};

const looksLikeDateTime = (value) => {
  const text = String(value || "").trim();

  if (!text) {
    return false;
  }

  const explicitDateTimePattern = /\d{4}[-/]\d{1,2}[-/]\d{1,2}\s+\d{1,2}:\d{2}(?::\d{2})?/;

  if (explicitDateTimePattern.test(text)) {
    return true;
  }

  const parsedDate = new Date(text);

  if (Number.isNaN(parsedDate.getTime())) {
    return false;
  }

  return text.includes(":") || text.toLowerCase().includes("am") || text.toLowerCase().includes("pm");
};

const resolveDateTimeColumnIndex = (cells) => {
  const matchedIndex = (cells || []).findIndex((cell) => looksLikeDateTime(cell));
  return matchedIndex >= 0 ? matchedIndex : 1;
};

const toDateOnly = (value) => {
  const parsedDate = new Date(String(value || "").trim());

  if (Number.isNaN(parsedDate.getTime())) {
    return null;
  }

  return parsedDate.toISOString().slice(0, 10);
};

const toTimeMinutes = (value) => {
  const textValue = String(value || "").trim();

  if (!textValue) {
    return null;
  }

  const parsedDate = new Date(textValue);

  if (!Number.isNaN(parsedDate.getTime())) {
    return parsedDate.getHours() * 60 + parsedDate.getMinutes();
  }

  const match = textValue.match(/(\d{1,2}):(\d{2})(?::\d{2})?\s*(AM|PM)?/i);

  if (!match) {
    return null;
  }

  let hour = Number(match[1]);
  const minute = Number(match[2]);
  const meridiem = String(match[3] || "").toUpperCase();

  if (!Number.isFinite(hour) || !Number.isFinite(minute) || hour < 0 || hour > 23 || minute < 0 || minute > 59) {
    return null;
  }

  if (meridiem === "AM") {
    if (hour === 12) {
      hour = 0;
    }
  } else if (meridiem === "PM") {
    if (hour < 12) {
      hour += 12;
    }
  }

  return hour * 60 + minute;
};

const toTimeSeconds = (value) => {
  const textValue = String(value || "").trim();

  if (!textValue) {
    return null;
  }

  const parsedDate = new Date(textValue);

  if (!Number.isNaN(parsedDate.getTime())) {
    return parsedDate.getHours() * 3600 + parsedDate.getMinutes() * 60 + parsedDate.getSeconds();
  }

  const match = textValue.match(/(\d{1,2}):(\d{2})(?::(\d{2}))?\s*(AM|PM)?/i);

  if (!match) {
    return null;
  }

  let hour = Number(match[1]);
  const minute = Number(match[2]);
  const second = Number(match[3] || 0);
  const meridiem = String(match[4] || "").toUpperCase();

  if (
    !Number.isFinite(hour) ||
    !Number.isFinite(minute) ||
    !Number.isFinite(second) ||
    hour < 0 ||
    hour > 23 ||
    minute < 0 ||
    minute > 59 ||
    second < 0 ||
    second > 59
  ) {
    return null;
  }

  if (meridiem === "AM") {
    if (hour === 12) {
      hour = 0;
    }
  } else if (meridiem === "PM") {
    if (hour < 12) {
      hour += 12;
    }
  }

  return hour * 3600 + minute * 60 + second;
};

const formatSecondsTo24Hour = (seconds) => {
  if (!Number.isFinite(seconds)) {
    return null;
  }

  const safeSeconds = Math.max(0, Math.min(24 * 3600 - 1, Number(seconds)));
  const hour = Math.floor(safeSeconds / 3600);
  const minute = Math.floor((safeSeconds % 3600) / 60);
  const second = safeSeconds % 60;

  return `${String(hour).padStart(2, "0")}:${String(minute).padStart(2, "0")}:${String(second).padStart(2, "0")}`;
};

const extractDateAndTimeFromDateTime = (value) => {
  const textValue = String(value || "").trim();

  if (!textValue) {
    return { dateOnly: null, timeOnly: null, seconds: null };
  }

  const explicitMatch = textValue.match(/^(\d{4}-\d{2}-\d{2})[ T](\d{2}:\d{2}(?::\d{2})?)/);

  if (explicitMatch) {
    const dateOnly = explicitMatch[1];
    const seconds = toTimeSeconds(explicitMatch[2]);

    return {
      dateOnly,
      timeOnly: formatSecondsTo24Hour(seconds),
      seconds
    };
  }

  const parsedDate = new Date(textValue);

  if (!Number.isNaN(parsedDate.getTime())) {
    const dateOnly = parsedDate.toISOString().slice(0, 10);
    const seconds = parsedDate.getHours() * 3600 + parsedDate.getMinutes() * 60 + parsedDate.getSeconds();

    return {
      dateOnly,
      timeOnly: formatSecondsTo24Hour(seconds),
      seconds
    };
  }

  const seconds = toTimeSeconds(textValue);

  return {
    dateOnly: null,
    timeOnly: formatSecondsTo24Hour(seconds),
    seconds
  };
};

const formatMinutesTo12Hour = (minutes) => {
  if (!Number.isFinite(minutes)) {
    return null;
  }

  const normalizedMinutes = Math.max(0, Math.min(23 * 60 + 59, Number(minutes)));
  const hour24 = Math.floor(normalizedMinutes / 60);
  const minute = normalizedMinutes % 60;
  const meridiem = hour24 >= 12 ? "PM" : "AM";
  const hour12 = hour24 % 12 === 0 ? 12 : hour24 % 12;

  return `${String(hour12).padStart(2, "0")}:${String(minute).padStart(2, "0")} ${meridiem}`;
};

const extractDateTimeParts = (value) => {
  const textValue = String(value || "").trim();

  if (!textValue) {
    return { dateOnly: null, timeText: null, minutes: null };
  }

  const parsedDate = new Date(textValue);

  if (!Number.isNaN(parsedDate.getTime())) {
    const dateOnly = parsedDate.toISOString().slice(0, 10);
    const minutes = parsedDate.getHours() * 60 + parsedDate.getMinutes();

    return {
      dateOnly,
      timeText: formatMinutesTo12Hour(minutes),
      minutes
    };
  }

  const minutes = toTimeMinutes(textValue);

  return {
    dateOnly: null,
    timeText: Number.isFinite(minutes) ? formatMinutesTo12Hour(minutes) : null,
    minutes: Number.isFinite(minutes) ? minutes : null
  };
};

const assignDailyTimeSlots = (rawTimeValues) => {
  // Convert all punches to comparable seconds, de-duplicate, and sort chronologically.
  const uniqueSortedSeconds = Array.from(
    new Set((rawTimeValues || []).map(toTimeSeconds).filter((seconds) => Number.isFinite(seconds)))
  ).sort((left, right) => left - right);

  if (uniqueSortedSeconds.length === 0) {
    return {
      amTimeIn: null,
      amTimeOut: null,
      noonTimeOut: null,
      pmTimeIn: null,
      noonTimeIn: null,
      pmTimeOut: null,
      timeIn: null,
      timeOut: null
    };
  }

  const ELEVEN_AM = 11 * 3600;
  const ONE_PM = 13 * 3600;

  let amTimeIn = null;
  let amTimeOut = null;
  let noonTimeOut = null;
  let pmTimeIn = null;
  let noonTimeIn = null;
  let pmTimeOut = null;

  if (uniqueSortedSeconds.length >= 4) {
    const first = uniqueSortedSeconds[0];
    const second = uniqueSortedSeconds[1];
    const third = uniqueSortedSeconds[2];
    const fourth = uniqueSortedSeconds[3];

    amTimeIn = formatSecondsTo24Hour(first);
    amTimeOut = formatSecondsTo24Hour(second);
    noonTimeOut = amTimeOut;
    pmTimeIn = formatSecondsTo24Hour(third);
    noonTimeIn = pmTimeIn;
    pmTimeOut = formatSecondsTo24Hour(fourth);
  } else if (uniqueSortedSeconds.length === 3) {
    const first = uniqueSortedSeconds[0];
    const second = uniqueSortedSeconds[1];
    const third = uniqueSortedSeconds[2];

    if (first < ELEVEN_AM) {
      amTimeIn = formatSecondsTo24Hour(first);

      if (second > ELEVEN_AM && second <= ONE_PM) {
        amTimeOut = formatSecondsTo24Hour(second);
        noonTimeOut = amTimeOut;
        pmTimeIn = formatSecondsTo24Hour(second);
        noonTimeIn = pmTimeIn;
      } else if (second <= ELEVEN_AM) {
        amTimeOut = formatSecondsTo24Hour(second);
        noonTimeOut = amTimeOut;
      } else {
        pmTimeIn = formatSecondsTo24Hour(second);
        noonTimeIn = pmTimeIn;
      }

      pmTimeOut = formatSecondsTo24Hour(third);
    } else if (first > ELEVEN_AM && first <= ONE_PM) {
      amTimeOut = formatSecondsTo24Hour(first);
      noonTimeOut = amTimeOut;
      pmTimeIn = formatSecondsTo24Hour(second);
      noonTimeIn = pmTimeIn;
      pmTimeOut = formatSecondsTo24Hour(third);
    } else {
      pmTimeIn = formatSecondsTo24Hour(second);
      noonTimeIn = pmTimeIn;
      pmTimeOut = formatSecondsTo24Hour(third);
    }
  } else if (uniqueSortedSeconds.length === 2) {
    const first = uniqueSortedSeconds[0];
    const second = uniqueSortedSeconds[1];

    if (first < ELEVEN_AM && second > ELEVEN_AM && second <= ONE_PM) {
      amTimeIn = formatSecondsTo24Hour(first);
      amTimeOut = formatSecondsTo24Hour(second);
      noonTimeOut = amTimeOut;
      pmTimeIn = formatSecondsTo24Hour(second);
      noonTimeIn = pmTimeIn;
    } else if (first < ELEVEN_AM) {
      amTimeIn = formatSecondsTo24Hour(first);
      pmTimeOut = formatSecondsTo24Hour(second);
    } else if (first > ELEVEN_AM && first <= ONE_PM) {
      amTimeOut = formatSecondsTo24Hour(first);
      noonTimeOut = amTimeOut;
      pmTimeIn = formatSecondsTo24Hour(first);
      noonTimeIn = pmTimeIn;
      pmTimeOut = formatSecondsTo24Hour(second);
    } else {
      pmTimeIn = formatSecondsTo24Hour(first);
      noonTimeIn = pmTimeIn;
      pmTimeOut = formatSecondsTo24Hour(second);
    }
  } else {
    const only = uniqueSortedSeconds[0];

    if (only < ELEVEN_AM) {
      amTimeIn = formatSecondsTo24Hour(only);
    } else if (only <= ONE_PM) {
      amTimeOut = formatSecondsTo24Hour(only);
      noonTimeOut = amTimeOut;
      pmTimeIn = formatSecondsTo24Hour(only);
      noonTimeIn = pmTimeIn;
    } else {
      pmTimeOut = formatSecondsTo24Hour(only);
    }
  }

  const timeIn = amTimeIn || pmTimeIn || formatSecondsTo24Hour(uniqueSortedSeconds[0]);
  const timeOut = pmTimeOut || amTimeOut || null;

  return {
    amTimeIn,
    amTimeOut,
    noonTimeOut,
    pmTimeIn,
    noonTimeIn,
    pmTimeOut,
    timeIn,
    timeOut
  };
};

const MONTH_LABELS = [
  "JANUARY",
  "FEBRUARY",
  "MARCH",
  "APRIL",
  "MAY",
  "JUNE",
  "JULY",
  "AUGUST",
  "SEPTEMBER",
  "OCTOBER",
  "NOVEMBER",
  "DECEMBER"
];

const getMonthLabel = (yearMonth) => {
  const [year, month] = String(yearMonth || "").split("-");
  const monthIndex = Math.max(1, Math.min(12, Number(month || 1))) - 1;
  return `${MONTH_LABELS[monthIndex]} ${year || ""}`.trim();
};

const buildDayRows = (records, yearMonth) => {
  const [year, month] = String(yearMonth).split("-").map((value) => Number(value));
  const daysInMonth = new Date(year, month, 0).getDate();

  const rows = Array.from({ length: 31 }, (_, index) => {
    const dayNumber = index + 1;

    return {
      day: dayNumber,
      amArrival: "",
      amDeparture: "",
      pmArrival: "",
      pmDeparture: "",
      undertimeHours: "",
      undertimeMinutes: "",
      __mins: {
        amArrival: null,
        amDeparture: null,
        pmArrival: null,
        pmDeparture: null
      }
    };
  });

  const applySlotMin = (row, key, rawValue) => {
    const minutes = toTimeMinutes(rawValue);

    if (!Number.isFinite(minutes)) {
      return;
    }

    const current = row.__mins[key];

    if (!Number.isFinite(current) || minutes < current) {
      row.__mins[key] = minutes;
      row[key] = formatMinutesTo12Hour(minutes);
    }
  };

  const applySlotMax = (row, key, rawValue) => {
    const minutes = toTimeMinutes(rawValue);

    if (!Number.isFinite(minutes)) {
      return;
    }

    const current = row.__mins[key];

    if (!Number.isFinite(current) || minutes > current) {
      row.__mins[key] = minutes;
      row[key] = formatMinutesTo12Hour(minutes);
    }
  };

  records.forEach((record) => {
    const dayNumber = Number(String(record.attendanceDate || "").slice(-2));

    if (!Number.isFinite(dayNumber) || dayNumber < 1 || dayNumber > 31) {
      return;
    }

    const row = rows[dayNumber - 1];
    const remarkText = String(record.remarks || "").toUpperCase();

    if (remarkText.includes("HOLI")) {
      row.amArrival = "HOLI";
      row.amDeparture = "DAY";
      row.pmArrival = "";
      row.pmDeparture = "";
      return;
    }

    if (
      record.amTimeIn ||
      record.amTimeOut ||
      record.noonTimeOut ||
      record.pmTimeIn ||
      record.noonTimeIn ||
      record.pmTimeOut
    ) {
      const resolvedAmTimeOut = record.noonTimeOut || record.amTimeOut;
      const resolvedPmTimeIn = record.noonTimeIn || record.pmTimeIn;

      applySlotMin(row, "amArrival", record.amTimeIn);
      applySlotMax(row, "amDeparture", resolvedAmTimeOut);
      applySlotMin(row, "pmArrival", resolvedPmTimeIn);
      applySlotMax(row, "pmDeparture", record.pmTimeOut);

      return;
    }

    if (record.timeIn) {
      const timeInText = String(record.timeIn);
      const timeInMinutes = toTimeMinutes(timeInText);

      if (Number.isFinite(timeInMinutes) && timeInMinutes >= 12 * 60) {
        applySlotMin(row, "pmArrival", timeInText);
      } else {
        applySlotMin(row, "amArrival", timeInText);
      }
    }

    if (record.timeOut) {
      const timeOutText = String(record.timeOut);
      const timeOutMinutes = toTimeMinutes(timeOutText);

      if (Number.isFinite(timeOutMinutes) && timeOutMinutes < 13 * 60) {
        applySlotMax(row, "amDeparture", timeOutText);
      } else {
        applySlotMax(row, "pmDeparture", timeOutText);
      }
    }
  });

  rows.forEach((row) => {
    delete row.__mins;
  });

  return rows;
};

const drawTextInCell = (doc, text, x, y, width, height, options = {}) => {
  const value = String(text == null ? "" : text);
  const { size = 7, bold = false, align = "center" } = options;
  doc.font(bold ? "Helvetica-Bold" : "Helvetica").fontSize(size);
  doc.text(value, x + 1, y + ((height - size) / 2) - 1, { width: width - 2, align });
};

const drawCscForm48 = (doc, {
  x,
  y,
  width,
  employeeName,
  employeeBiometricId,
  monthLabel,
  rows
}) => {
  const name = employeeName || `ID ${employeeBiometricId}`;
  const left = x;
  const right = x + width;

  doc.font("Helvetica-Oblique").fontSize(8);
  doc.text("Civil Service Form No. 48", left + 8, y, { width: width - 16, align: "left" });

  doc.font("Helvetica-Bold").fontSize(12);
  doc.text("DAILY TIME RECORD", left, y + 18, { width, align: "center" });
  doc.font("Helvetica").fontSize(8);
  doc.text("-----o0o-----", left, y + 32, { width, align: "center" });

  const nameTop = y + 50;
  doc.moveTo(left, nameTop + 15).lineTo(right, nameTop + 15).stroke();
  doc.font("Helvetica-Bold").fontSize(9);
  doc.text(name, left, nameTop + 4, { width, align: "center" });
  doc.font("Helvetica").fontSize(7);
  doc.text("(Name)", left, nameTop + 17, { width, align: "center" });

  doc.font("Helvetica-Oblique").fontSize(7);
  doc.text("For the month of", left + 6, nameTop + 34, { width: 72, align: "left" });
  doc.font("Helvetica").fontSize(8);
  doc.text(monthLabel, left + 92, nameTop + 34, { width: width - 100, align: "left" });
  doc.moveTo(left + 88, nameTop + 46).lineTo(right, nameTop + 46).stroke();

  doc.font("Helvetica-Oblique").fontSize(7);
  doc.text("Official hours for arrival", left + 6, nameTop + 50, { width: 110, align: "left" });
  doc.text("Regular days", left + width - 118, nameTop + 50, { width: 60, align: "left" });
  doc.text("and departure", left + 6, nameTop + 58, { width: 110, align: "left" });
  doc.text("Saturdays", left + width - 118, nameTop + 58, { width: 60, align: "left" });
  doc.moveTo(left + width - 58, nameTop + 56).lineTo(right, nameTop + 56).stroke();
  doc.moveTo(left + width - 58, nameTop + 64).lineTo(right, nameTop + 64).stroke();

  const tableTop = nameTop + 74;
  const colWidths = [24, 33, 33, 33, 33, 30, 30];
  const rowHeight = 12;
  let cursorX = left;

  const headerHeightTop = 12;
  const headerHeightBottom = 12;

  doc.rect(left, tableTop, width, headerHeightTop + headerHeightBottom).stroke();

  doc.moveTo(cursorX + colWidths[0], tableTop).lineTo(cursorX + colWidths[0], tableTop + headerHeightTop + headerHeightBottom).stroke();
  drawTextInCell(doc, "Day", cursorX, tableTop, colWidths[0], headerHeightTop + headerHeightBottom, { size: 7, bold: true });
  cursorX += colWidths[0];

  const amGroupWidth = colWidths[1] + colWidths[2];
  doc.rect(cursorX, tableTop, amGroupWidth, headerHeightTop).stroke();
  drawTextInCell(doc, "A.M.", cursorX, tableTop, amGroupWidth, headerHeightTop, { size: 7, bold: true });
  drawTextInCell(doc, "Arrival", cursorX, tableTop + headerHeightTop, colWidths[1], headerHeightBottom, { size: 6, bold: true });
  drawTextInCell(doc, "Departure", cursorX + colWidths[1], tableTop + headerHeightTop, colWidths[2], headerHeightBottom, { size: 6, bold: true });
  doc.moveTo(cursorX + colWidths[1], tableTop + headerHeightTop).lineTo(cursorX + colWidths[1], tableTop + headerHeightTop + headerHeightBottom).stroke();
  cursorX += amGroupWidth;

  const pmGroupWidth = colWidths[3] + colWidths[4];
  doc.rect(cursorX, tableTop, pmGroupWidth, headerHeightTop).stroke();
  drawTextInCell(doc, "P.M.", cursorX, tableTop, pmGroupWidth, headerHeightTop, { size: 7, bold: true });
  drawTextInCell(doc, "Arrival", cursorX, tableTop + headerHeightTop, colWidths[3], headerHeightBottom, { size: 6, bold: true });
  drawTextInCell(doc, "Departure", cursorX + colWidths[3], tableTop + headerHeightTop, colWidths[4], headerHeightBottom, { size: 6, bold: true });
  doc.moveTo(cursorX + colWidths[3], tableTop + headerHeightTop).lineTo(cursorX + colWidths[3], tableTop + headerHeightTop + headerHeightBottom).stroke();
  cursorX += pmGroupWidth;

  const undGroupWidth = colWidths[5] + colWidths[6];
  doc.rect(cursorX, tableTop, undGroupWidth, headerHeightTop).stroke();
  drawTextInCell(doc, "Undertime", cursorX, tableTop, undGroupWidth, headerHeightTop, { size: 7, bold: true });
  drawTextInCell(doc, "Hours", cursorX, tableTop + headerHeightTop, colWidths[5], headerHeightBottom, { size: 6, bold: true });
  drawTextInCell(doc, "Minutes", cursorX + colWidths[5], tableTop + headerHeightTop, colWidths[6], headerHeightBottom, { size: 6, bold: true });
  doc.moveTo(cursorX + colWidths[5], tableTop + headerHeightTop).lineTo(cursorX + colWidths[5], tableTop + headerHeightTop + headerHeightBottom).stroke();

  let rowY = tableTop + headerHeightTop + headerHeightBottom;

  rows.forEach((row) => {
    let rowX = left;
    const values = [
      row.day,
      row.amArrival,
      row.amDeparture,
      row.pmArrival,
      row.pmDeparture,
      row.undertimeHours,
      row.undertimeMinutes
    ];

    colWidths.forEach((columnWidth, columnIndex) => {
      doc.rect(rowX, rowY, columnWidth, rowHeight).stroke();
      drawTextInCell(doc, values[columnIndex], rowX, rowY, columnWidth, rowHeight, { size: 7, bold: columnIndex === 0 });
      rowX += columnWidth;
    });

    rowY += rowHeight;
  });

  let totalX = left;
  colWidths.forEach((columnWidth, columnIndex) => {
    doc.rect(totalX, rowY, columnWidth, rowHeight).stroke();
    if (columnIndex === 1) {
      drawTextInCell(doc, "Total", totalX, rowY, colWidths[1] + colWidths[2] + colWidths[3] + colWidths[4], rowHeight, { size: 8, align: "right" });
    }
    totalX += columnWidth;
  });

  const statementTop = rowY + 18;
  doc.font("Helvetica-Oblique").fontSize(6.5);
  doc.text("I certify on my honor that the above is a true and correct report of the", left + 6, statementTop, { width: width - 12, align: "left" });
  doc.text("hours of work performed, record of which was made daily at the time", left + 6, statementTop + 8, { width: width - 12, align: "left" });
  doc.text("of arrival and departure from office.", left + 6, statementTop + 16, { width: width - 12, align: "left" });

  doc.moveTo(left + 12, statementTop + 36).lineTo(right - 12, statementTop + 36).stroke();
  doc.font("Helvetica-Bold").fontSize(8.5);
  doc.text(name, left + 12, statementTop + 28, { width: width - 24, align: "center" });

  doc.font("Helvetica-Oblique").fontSize(7);
  doc.text("VERIFIED as to the prescribed office hours:", left + 6, statementTop + 50, { width: width - 12, align: "left" });

  doc.moveTo(left + 12, statementTop + 74).lineTo(right - 12, statementTop + 74).stroke();
  doc.font("Helvetica-Bold").fontSize(8);
  doc.text("HR OFFICER", left + 12, statementTop + 66, { width: width - 24, align: "center" });
  doc.font("Helvetica-Oblique").fontSize(7);
  doc.text("In Charge", left + 12, statementTop + 76, { width: width - 24, align: "center" });

  doc.font("Helvetica-Bold").fontSize(7);
  doc.text("(SEE INSTRUCTION ON BACK)", left + 12, statementTop + 90, { width: width - 24, align: "center" });
};

const getRequesterCampusScope = async (requesterId) => {
  const requester = await User.findByPk(requesterId, {
    attributes: ["id", "role", "campus"]
  });

  if (!requester) {
    return { requester: null, isHr: false, campus: "" };
  }

  const requesterRole = String(requester.role || "").trim().toLowerCase();
  const requesterCampus = String(requester.campus || "").trim().toLowerCase();

  return {
    requester,
    isHr: requesterRole === "hr",
    campus: requesterCampus
  };
};

export const uploadAttendanceRecords = async (req, res) => {
  try {
    const requesterScope = await getRequesterCampusScope(req.user.id);

    if (!requesterScope.requester) {
      return res.status(401).json({ message: "Unauthorized request." });
    }

    if (!req.file) {
      return res.status(400).json({ message: "Attendance CSV file is required." });
    }

    const csvContent = fs.readFileSync(req.file.path, "utf8");
    const lines = csvContent
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter((line) => line.length > 0);

    if (lines.length < 1) {
      return res.status(400).json({ message: "Attendance file must include at least one row." });
    }

    const delimiter = detectDelimiter(lines[0]);
    const firstLineCells = parseDelimitedLine(lines[0], delimiter);
    const includesHeader = hasHeaderRow(firstLineCells);

    const headerIndexes = includesHeader ? resolveHeaderIndexes(firstLineCells) : {};
    const indexes = {
      employeeBiometricId: includesHeader
        ? (headerIndexes.employeeBiometricId >= 0 ? headerIndexes.employeeBiometricId : 0)
        : 0,
      employeeName: includesHeader ? headerIndexes.employeeName : -1,
      attendanceDate: includesHeader
        ? (headerIndexes.attendanceDate >= 0 ? headerIndexes.attendanceDate : 1)
        : 1,
      timeIn: includesHeader ? headerIndexes.timeIn : 2,
      timeOut: includesHeader ? headerIndexes.timeOut : -1,
      remarks: includesHeader ? headerIndexes.remarks : -1
    };

    if (indexes.attendanceDate < 0) {
      return res.status(400).json({
        message: "Unable to resolve attendance date column. Expected date in the second column or a date header."
      });
    }

    if (includesHeader && indexes.employeeBiometricId !== 0) {
      return res.status(400).json({
        message: "Invalid file format. The first column must be the biometric employee ID."
      });
    }

    const parsedRows = [];
    let skippedRows = 0;
    const startRowIndex = includesHeader ? 1 : 0;

    for (let rowIndex = startRowIndex; rowIndex < lines.length; rowIndex += 1) {
      const rowCells = parseDelimitedLine(lines[rowIndex], delimiter);
      const employeeBiometricId = String(rowCells[indexes.employeeBiometricId] || "").trim();
      const employeeName = indexes.employeeName >= 0 ? String(rowCells[indexes.employeeName] || "").trim() : "";
      const rawDateValue = String(rowCells[indexes.attendanceDate] || "").trim();
      const rawTimeIn = indexes.timeIn >= 0 ? String(rowCells[indexes.timeIn] || "").trim() : "";
      const rawTimeOut = indexes.timeOut >= 0 ? String(rowCells[indexes.timeOut] || "").trim() : "";

      const rawDateTimeValue = includesHeader
        ? `${rawDateValue} ${rawTimeIn}`.trim()
        : String(rowCells[1] || "").trim();

      const combinedDateTime = extractDateAndTimeFromDateTime(rawDateTimeValue);
      const dateColumnParts = extractDateTimeParts(rawDateValue);
      const timeInParts = extractDateTimeParts(rawTimeIn);
      const timeOutParts = extractDateTimeParts(rawTimeOut);

      const attendanceDate =
        combinedDateTime.dateOnly ||
        dateColumnParts.dateOnly ||
        (includesHeader ? timeInParts.dateOnly : null) ||
        (includesHeader ? timeOutParts.dateOnly : null) ||
        toDateOnly(rawDateValue) ||
        (includesHeader ? toDateOnly(rawTimeIn) : null) ||
        (includesHeader ? toDateOnly(rawTimeOut) : null);

      if (!employeeBiometricId || !attendanceDate) {
        skippedRows += 1;
        continue;
      }

      parsedRows.push({
        employeeBiometricId,
        employeeNameFromFile: employeeName || null,
        attendanceDate,
        timeIn: rawTimeIn || null,
        timeOut: rawTimeOut || null,
        timeCandidates: [
          combinedDateTime.timeOnly,
          includesHeader ? dateColumnParts.timeText : null,
          includesHeader ? timeInParts.timeText : null,
          includesHeader ? timeOutParts.timeText : null
        ].filter((value) => String(value || "").trim().length > 0),
        remarks: indexes.remarks >= 0 ? String(rowCells[indexes.remarks] || "").trim() : null,
        sourceFileName: req.file.originalname,
        uploadedBy: req.user.id
      });
    }

    if (parsedRows.length === 0) {
      return res.status(400).json({ message: "No valid attendance rows found in uploaded file." });
    }

    const uniqueBiometricIds = Array.from(new Set(parsedRows.map((row) => row.employeeBiometricId)));

    const userWhere = {
      employeeBiometricId: {
        [Op.in]: uniqueBiometricIds
      }
    };

    if (requesterScope.isHr) {
      userWhere.campus = requesterScope.campus;
    }

    let users = await User.findAll({
      where: userWhere,
      attributes: ["id", "employeeBiometricId", "CompleteName"]
    });

    const needsIdentityFallback = parsedRows.some((row) => {
      const hasExactBiometricMatch = users.some((user) =>
        String(user.employeeBiometricId || "").trim() === row.employeeBiometricId
      );

      return !hasExactBiometricMatch && (
        Boolean(row.employeeNameFromFile) || /^\d+$/.test(row.employeeBiometricId)
      );
    });

    if (needsIdentityFallback) {
      const fallbackWhere = { role: { [Op.ne]: "admin" } };

      if (requesterScope.isHr) {
        fallbackWhere.campus = requesterScope.campus;
      }

      const nameMatchUsers = await User.findAll({
        where: fallbackWhere,
        attributes: ["id", "employeeBiometricId", "CompleteName"]
      });
      const uniqueUsers = new Map(users.concat(nameMatchUsers).map((user) => [Number(user.id), user]));
      users = Array.from(uniqueUsers.values());
    }

    const userByBiometricId = new Map(
      users.map((user) => [String(user.employeeBiometricId).trim(), user])
    );

    const consolidatedRows = new Map();
    const unmatchedBiometricIds = new Set();

    parsedRows.forEach((row) => {
      const matchedUser = userByBiometricId.get(row.employeeBiometricId)
        || resolveEmployeeMatch({
          candidateBiometricId: row.employeeBiometricId,
          candidateName: row.employeeNameFromFile,
          users
        });

      if (!matchedUser) {
        unmatchedBiometricIds.add(row.employeeBiometricId);
      }

      const key = `${row.employeeBiometricId}::${row.attendanceDate}`;

      if (!consolidatedRows.has(key)) {
        consolidatedRows.set(key, {
          employeeBiometricId: row.employeeBiometricId,
          employeeName: matchedUser?.CompleteName || row.employeeNameFromFile || `ID ${row.employeeBiometricId}`,
          attendanceDate: row.attendanceDate,
          remarks: row.remarks,
          sourceFileName: row.sourceFileName,
          matchedUserId: matchedUser?.id || null,
          uploadedBy: row.uploadedBy,
          timeCandidates: []
        });
      }

      const consolidated = consolidatedRows.get(key);

      if (!consolidated.remarks && row.remarks) {
        consolidated.remarks = row.remarks;
      }

      consolidated.timeCandidates.push(...(row.timeCandidates || []));
    });

    const rowsToUpsert = Array.from(consolidatedRows.values()).map((row) => {
      const slots = assignDailyTimeSlots(row.timeCandidates);

      return {
        employeeBiometricId: row.employeeBiometricId,
        employeeName: row.employeeName,
        attendanceDate: row.attendanceDate,
        amTimeIn: slots.amTimeIn,
        amTimeOut: slots.amTimeOut,
        noonTimeOut: slots.noonTimeOut,
        pmTimeIn: slots.pmTimeIn,
        noonTimeIn: slots.noonTimeIn,
        pmTimeOut: slots.pmTimeOut,
        timeIn: slots.timeIn,
        timeOut: slots.timeOut,
        remarks: row.remarks,
        sourceFileName: row.sourceFileName,
        matchedUserId: row.matchedUserId,
        uploadedBy: row.uploadedBy
      };
    });

    if (rowsToUpsert.length === 0) {
      return res.status(400).json({ message: "No valid attendance rows found in uploaded file." });
    }

    const existingRecords = await AttendanceRecord.findAll({
      where: {
        [Op.or]: rowsToUpsert.map((row) => ({
          employeeBiometricId: row.employeeBiometricId,
          attendanceDate: row.attendanceDate
        }))
      }
    });

    const existingByKey = new Map();

    existingRecords.forEach((record) => {
      const key = `${record.employeeBiometricId}::${record.attendanceDate}`;

      if (!existingByKey.has(key)) {
        existingByKey.set(key, record);
      }
    });

    let insertedCount = 0;
    let updatedCount = 0;
    let duplicateCount = 0;

    for (const row of rowsToUpsert) {
      const key = `${row.employeeBiometricId}::${row.attendanceDate}`;
      const existing = existingByKey.get(key);

      if (existing) {
        const existingTimeCandidates = [
          existing.amTimeIn,
          existing.amTimeOut,
          existing.noonTimeOut,
          existing.pmTimeIn,
          existing.noonTimeIn,
          existing.pmTimeOut,
          existing.timeIn,
          existing.timeOut
        ].filter(Boolean);
        const incomingTimeCandidates = [
          row.amTimeIn,
          row.amTimeOut,
          row.noonTimeOut,
          row.pmTimeIn,
          row.noonTimeIn,
          row.pmTimeOut,
          row.timeIn,
          row.timeOut
        ].filter(Boolean);
        const mergedSlots = assignDailyTimeSlots([...existingTimeCandidates, ...incomingTimeCandidates]);
        const existingSlots = [
          existing.amTimeIn,
          existing.amTimeOut,
          existing.noonTimeOut,
          existing.pmTimeIn,
          existing.noonTimeIn,
          existing.pmTimeOut,
          existing.timeIn,
          existing.timeOut
        ];
        const mergedSlotValues = [
          mergedSlots.amTimeIn,
          mergedSlots.amTimeOut,
          mergedSlots.noonTimeOut,
          mergedSlots.pmTimeIn,
          mergedSlots.noonTimeIn,
          mergedSlots.pmTimeOut,
          mergedSlots.timeIn,
          mergedSlots.timeOut
        ];
        const shouldUpdate = existing.matchedUserId !== (row.matchedUserId || existing.matchedUserId)
          || mergedSlotValues.some((value, index) => value !== existingSlots[index])
          || (!existing.remarks && row.remarks);

        if (shouldUpdate) {
          await existing.update({
            ...mergedSlots,
            employeeName: row.matchedUserId ? row.employeeName : existing.employeeName || row.employeeName,
            matchedUserId: row.matchedUserId || existing.matchedUserId,
            remarks: existing.remarks || row.remarks,
            sourceFileName: row.sourceFileName,
            uploadedBy: row.uploadedBy
          });
          updatedCount += 1;
        } else {
          duplicateCount += 1;
        }

        continue;
      }

      await AttendanceRecord.create(row);
      insertedCount += 1;
    }

    res.json({
      message: "Attendance records uploaded successfully.",
      importedCount: insertedCount + updatedCount,
      insertedCount,
      updatedCount,
      duplicateCount,
      skippedCount: skippedRows,
      unmatchedBiometricIds: Array.from(unmatchedBiometricIds)
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

const LATE_THRESHOLD_MINUTES = 8 * 60 + 15;

const countBusinessDaysInRange = (startDate, endDate) => {
  if (!(startDate instanceof Date) || Number.isNaN(startDate.getTime())) {
    return 0;
  }

  if (!(endDate instanceof Date) || Number.isNaN(endDate.getTime())) {
    return 0;
  }

  if (endDate < startDate) {
    return 0;
  }

  let count = 0;
  const cursor = new Date(startDate.getFullYear(), startDate.getMonth(), startDate.getDate());

  while (cursor <= endDate) {
    const day = cursor.getDay();

    if (day !== 0 && day !== 6) {
      count += 1;
    }

    cursor.setDate(cursor.getDate() + 1);
  }

  return count;
};

const toPercent = (value, total) => {
  if (!Number.isFinite(value) || !Number.isFinite(total) || total <= 0) {
    return 0;
  }

  return Number(((value / total) * 100).toFixed(1));
};

const isLateRecord = (record) => {
  const remarks = String(record?.remarks || "").trim().toLowerCase();

  if (remarks.includes("late")) {
    return true;
  }

  const candidateTime = record?.amTimeIn || record?.timeIn || record?.noonTimeIn || record?.pmTimeIn || null;
  const minutes = toTimeMinutes(candidateTime);

  return minutes !== null && minutes > LATE_THRESHOLD_MINUTES;
};

export const getMyAttendanceSummary = async (req, res) => {
  try {
    const requesterId = Number(req.user?.id);

    if (!Number.isFinite(requesterId) || requesterId <= 0) {
      return res.status(401).json({ message: "Unauthorized request." });
    }

    const user = await User.findByPk(requesterId, {
      attributes: ["id", "CompleteName", "employeeBiometricId", "createdAt", "role", "shiftSchedule", "flexiTime"]
    });

    if (!user) {
      return res.status(404).json({ message: "User account not found." });
    }

    const now = new Date();
    const monthRaw = Array.isArray(req.query.month) ? req.query.month[0] : req.query.month;
    const yearRaw = Array.isArray(req.query.year) ? req.query.year[0] : req.query.year;

    const month = monthRaw !== undefined ? Number(monthRaw) : now.getMonth() + 1;
    const year = yearRaw !== undefined ? Number(yearRaw) : now.getFullYear();

    const hasValidMonth = Number.isInteger(month) && month >= 1 && month <= 12;
    const hasValidYear = Number.isInteger(year) && year >= 1900 && year <= 9999;

    if (!hasValidMonth || !hasValidYear) {
      return res.status(400).json({ message: "Please provide valid month (1-12) and year (YYYY)." });
    }

    const monthStart = new Date(year, month - 1, 1);
    const monthEnd = new Date(year, month, 0);
    const monthEndLimit = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const rangeEnd = monthStart.getTime() <= monthEndLimit.getTime() ? new Date(Math.min(monthEnd.getTime(), monthEndLimit.getTime())) : monthEnd;

    const whereConditions = [{ matchedUserId: requesterId }];
    const normalizedBiometricId = String(user.employeeBiometricId || "").trim();

    if (normalizedBiometricId) {
      whereConditions.push({ employeeBiometricId: normalizedBiometricId });
    }

    const records = await AttendanceRecord.findAll({
      where: {
        [Op.and]: [
          {
            attendanceDate: {
              [Op.between]: [
                monthStart.toISOString().slice(0, 10),
                rangeEnd.toISOString().slice(0, 10)
              ]
            }
          },
          {
            [Op.or]: whereConditions
          }
        ]
      },
      attributes: ["attendanceDate", "remarks", "amTimeIn", "timeIn", "noonTimeIn", "pmTimeIn"]
    });

    const workDays = countBusinessDaysInRange(monthStart, rangeEnd);
    const summaryCounts = buildAttendanceSummary({
      userCreatedAt: user.createdAt,
      records,
      monthStart,
      rangeEnd,
      workDays,
      flexiTime: user.flexiTime,
      shiftSchedule: user.shiftSchedule
    });
    const repeatedLatePattern = detectRepeatedLatePattern({ lateDays: summaryCounts.lateDays });

    if (String(user.role || "").toLowerCase() === "staff" && repeatedLatePattern.detected) {
      const deduplicationKey = `repeated-late:${requesterId}:${year}-${String(month).padStart(2, "0")}`;
      const [notification] = await StaffNotification.findOrCreate({
        where: { deduplicationKey },
        defaults: {
          userId: requesterId,
          type: "repeated_late",
          title: "Repeated late arrivals detected",
          message: repeatedLatePattern.message,
          deduplicationKey
        }
      });

      await notification.update({ message: repeatedLatePattern.message });
    }

    if (
      String(user.role || "").toLowerCase() === "staff" &&
      hasExceededAbsenceLimit({
        absentDays: summaryCounts.absentDays,
        expectedWorkDays: workDays
      })
    ) {
      const deduplicationKey = `absence-limit:${requesterId}:${year}-${String(month).padStart(2, "0")}`;
      const notificationMessage = buildAbsenceAlertMessage({
        completeName: user.CompleteName,
        absentDays: summaryCounts.absentDays,
        lateDays: summaryCounts.lateDays
      });

      const [notification] = await StaffNotification.findOrCreate({
        where: { deduplicationKey },
        defaults: {
          userId: requesterId,
          type: "absence_limit",
          title: "Attendance absence limit reached",
          message: notificationMessage,
          deduplicationKey
        }
      });

      await notification.update({ message: notificationMessage });
    }

    return res.json({
      summary: {
        month,
        year,
        monthLabel: monthStart.toLocaleString("en-US", { month: "long", year: "numeric" }),
        flexiTime: Boolean(user.flexiTime),
        shiftSchedule: user.shiftSchedule || "",
        lateGraceMinutes: FLEXI_TIME_GRACE_MINUTES,
        expectedWorkDays: workDays,
        presentDays: summaryCounts.presentDays,
        onTimeDays: summaryCounts.onTimeDays,
        lateDays: summaryCounts.lateDays,
        repeatedLatePattern,
        absentDays: summaryCounts.absentDays,
        presentPercent: toPercent(summaryCounts.presentDays, workDays),
        onTimePercent: toPercent(summaryCounts.onTimeDays, workDays),
        latePercent: toPercent(summaryCounts.lateDays, workDays),
        absentPercent: toPercent(summaryCounts.absentDays, workDays)
      }
    });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
};

export const getMyAttendanceNotifications = async (req, res) => {
  try {
    const userId = Number(req.user?.id);

    if (!Number.isFinite(userId) || userId <= 0) {
      return res.status(401).json({ message: "Unauthorized request." });
    }

    const notifications = await StaffNotification.findAll({
      where: { userId },
      attributes: ["id", "type", "title", "message", "isRead", "createdAt"],
      order: [["createdAt", "DESC"]],
      limit: 30
    });
    const unreadCount = notifications.filter((notification) => !notification.isRead).length;

    return res.json({ notifications, unreadCount });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
};

export const markAttendanceNotificationRead = async (req, res) => {
  try {
    const userId = Number(req.user?.id);
    const notificationId = Number(req.params.notificationId);

    if (!Number.isFinite(userId) || userId <= 0) {
      return res.status(401).json({ message: "Unauthorized request." });
    }

    const notification = await StaffNotification.findOne({
      where: { id: notificationId, userId }
    });

    if (!notification) {
      return res.status(404).json({ message: "Notification not found." });
    }

    await notification.update({ isRead: true });
    return res.json({ message: "Notification marked as read." });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
};

export const getAttendanceEmployees = async (req, res) => {
  try {
    const requesterScope = await getRequesterCampusScope(req.user.id);

    if (!requesterScope.requester) {
      return res.status(401).json({ message: "Unauthorized request." });
    }

    res.set("Cache-Control", "no-store, no-cache, must-revalidate, proxy-revalidate");
    res.set("Pragma", "no-cache");
    res.set("Expires", "0");

    const usersWhere = {
      role: {
        [Op.ne]: "admin"
      }
    };

    if (requesterScope.isHr) {
      usersWhere.campus = requesterScope.campus;
    }

    const users = await User.findAll({
      where: usersWhere,
      attributes: ["id", "CompleteName", "email", "role", "employeeBiometricId"],
      order: [["CompleteName", "ASC"]]
    });

    const scopedUserIds = users.map((user) => Number(user.id)).filter((id) => Number.isFinite(id));
    const scopedBiometricIds = users
      .map((user) => String(user.employeeBiometricId || "").trim())
      .filter((id) => id.length > 0);

    let attendanceSummaries = [];

    if (!requesterScope.isHr || scopedUserIds.length > 0) {
      attendanceSummaries = await AttendanceRecord.findAll({
        where: requesterScope.isHr
          ? {
            matchedUserId: {
              [Op.in]: scopedUserIds
            }
          }
          : {
            matchedUserId: {
              [Op.ne]: null
            }
          },
        attributes: [
          "matchedUserId",
          [fn("COUNT", col("id")), "recordCount"],
          [fn("MAX", col("attendanceDate")), "latestAttendanceDate"]
        ],
        group: ["matchedUserId"]
      });
    }

    let biometricSummaries = [];

    if (!requesterScope.isHr || scopedBiometricIds.length > 0) {
      biometricSummaries = await AttendanceRecord.findAll({
        where: requesterScope.isHr
          ? {
            matchedUserId: null,
            employeeBiometricId: {
              [Op.in]: scopedBiometricIds
            }
          }
          : {
            matchedUserId: null,
            employeeBiometricId: {
              [Op.ne]: null
            }
          },
        attributes: [
          "employeeBiometricId",
          [fn("COUNT", col("id")), "recordCount"],
          [fn("MAX", col("attendanceDate")), "latestAttendanceDate"]
        ],
        group: ["employeeBiometricId"]
      });
    }

    const summaryByUserId = new Map(
      attendanceSummaries.map((item) => [
        Number(item.matchedUserId),
        {
          recordCount: Number(item.get("recordCount")) || 0,
          latestAttendanceDate: item.get("latestAttendanceDate") || null
        }
      ])
    );

    const summaryByBiometricId = new Map(
      biometricSummaries.map((item) => [
        String(item.employeeBiometricId || "").trim(),
        {
          recordCount: Number(item.get("recordCount")) || 0,
          latestAttendanceDate: item.get("latestAttendanceDate") || null
        }
      ])
    );

    const employees = users.map((user) => {
      const matchedSummary = summaryByUserId.get(Number(user.id));
      const biometricSummary = summaryByBiometricId.get(String(user.employeeBiometricId || "").trim());
      const latestAttendanceDate = [matchedSummary?.latestAttendanceDate, biometricSummary?.latestAttendanceDate]
        .filter(Boolean)
        .map((date) => String(date).slice(0, 10))
        .sort()
        .at(-1) || null;
      const recordCount = (matchedSummary?.recordCount || 0) + (biometricSummary?.recordCount || 0);

      return {
        id: user.id,
        completeName: user.CompleteName,
        email: user.email,
        role: user.role,
        employeeBiometricId: user.employeeBiometricId,
        recordCount,
        latestAttendanceDate
      };
    });

    res.json({ employees });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

export const getAttendanceByEmployee = async (req, res) => {
  try {
    const requesterScope = await getRequesterCampusScope(req.user.id);

    if (!requesterScope.requester) {
      return res.status(401).json({ message: "Unauthorized request." });
    }

    res.set("Cache-Control", "no-store, no-cache, must-revalidate, proxy-revalidate");
    res.set("Pragma", "no-cache");
    res.set("Expires", "0");

    const userId = Number(req.params.userId);

    if (!Number.isFinite(userId) || userId <= 0) {
      return res.status(400).json({ message: "Invalid employee ID." });
    }

    const user = await User.findByPk(userId, {
      attributes: ["id", "CompleteName", "email", "role", "employeeBiometricId", "campus", "shiftSchedule", "flexiTime"]
    });

    if (!user) {
      return res.status(404).json({ message: "Employee not found." });
    }

    if (requesterScope.isHr) {
      const employeeCampus = String(user.campus || "").trim().toLowerCase();

      if (!employeeCampus || employeeCampus !== requesterScope.campus) {
        return res.status(403).json({ message: "You can only view attendance within your assigned campus." });
      }
    }

    const whereConditions = [
      {
        matchedUserId: user.id
      }
    ];

    const normalizedBiometricId = String(user.employeeBiometricId || "").trim();

    if (normalizedBiometricId) {
      whereConditions.push({
        employeeBiometricId: normalizedBiometricId
      });
    }

    const records = await AttendanceRecord.findAll({
      where: {
        [Op.or]: whereConditions
      },
      attributes: [
        "id",
        "attendanceDate",
        "amTimeIn",
        "amTimeOut",
        "noonTimeOut",
        "pmTimeIn",
        "noonTimeIn",
        "pmTimeOut",
        "timeIn",
        "timeOut",
        "remarks",
        "sourceFileName"
      ],
      order: [["attendanceDate", "DESC"]]
    });

    const attendanceDatesForReview = Array.from(new Set(
      records.map((record) => String(record.attendanceDate || "").slice(0, 10)).filter(Boolean)
    ));
    let comparisonRecords = [];

    if (attendanceDatesForReview.length > 0) {
      let comparisonScope = {};

      if (requesterScope.isHr) {
        const campusUsers = await User.findAll({
          where: {
            campus: user.campus,
            role: { [Op.ne]: "admin" }
          },
          attributes: ["id", "employeeBiometricId"]
        });
        const campusUserIds = campusUsers.map((campusUser) => Number(campusUser.id));
        const campusBiometricIds = campusUsers
          .map((campusUser) => String(campusUser.employeeBiometricId || "").trim())
          .filter(Boolean);
        const campusRecordFilters = [];

        if (campusUserIds.length > 0) {
          campusRecordFilters.push({ matchedUserId: { [Op.in]: campusUserIds } });
        }

        if (campusBiometricIds.length > 0) {
          campusRecordFilters.push({ employeeBiometricId: { [Op.in]: campusBiometricIds } });
        }

        comparisonScope = campusRecordFilters.length > 0 ? { [Op.or]: campusRecordFilters } : null;
      }

      if (comparisonScope !== null) {
        comparisonRecords = await AttendanceRecord.findAll({
          where: {
            [Op.and]: [
              { attendanceDate: { [Op.in]: attendanceDatesForReview } },
              ...(requesterScope.isHr ? [comparisonScope] : [])
            ]
          },
          attributes: [
            "id", "matchedUserId", "employeeBiometricId", "attendanceDate", "amTimeIn", "amTimeOut",
            "noonTimeOut", "noonTimeIn", "pmTimeIn", "pmTimeOut", "timeIn", "timeOut"
          ]
        });
      }
    }

    const fakeAttendanceChecks = detectSharedPunchPatterns(records, comparisonRecords);
    const fakeAttendanceCheckByRecordId = new Map(
      fakeAttendanceChecks.map((check) => [Number(check.recordId), check])
    );
    const scheduleInconsistencies = detectSuddenScheduleInconsistencies(records);

    const recordsWithTimeInChecks = records.map((record) => {
      const plainRecord = record.toJSON();
      const timeInCheck = detectSuspiciousTimeIn({
        timeIn: plainRecord.amTimeIn || plainRecord.timeIn,
        shiftSchedule: user.shiftSchedule
      });
      const suddenScheduleInconsistency = scheduleInconsistencies.get(Number(plainRecord.id)) || {
        detected: false,
        baselineTimeIn: null,
        actualTimeIn: null,
        deviationMinutes: null,
        reason: null
      };
      const fakeAttendanceReview = fakeAttendanceCheckByRecordId.get(Number(plainRecord.id)) || {
        flagged: false,
        matchingEmployees: 0,
        reason: null
      };

      return {
        ...plainRecord,
        suspiciousTimeIn: timeInCheck,
        suddenScheduleInconsistency,
        fakeAttendanceReview,
        possibleTimeTheftReview: buildPossibleTimeTheftReview({
          suspiciousTimeIn: timeInCheck,
          suddenScheduleInconsistency,
          fakeAttendanceReview,
          flexiTime: user.flexiTime
        })
      };
    });

    const analysisEndUtc = new Date();
    analysisEndUtc.setUTCHours(0, 0, 0, 0);
    const analysisStartUtc = new Date(analysisEndUtc.getTime());
    analysisStartUtc.setUTCDate(analysisStartUtc.getUTCDate() - 29);
    const attendanceDates = records.map((record) => record.attendanceDate);

    res.json({
      employee: {
        id: user.id,
        completeName: user.CompleteName,
        email: user.email,
        role: user.role,
        employeeBiometricId: user.employeeBiometricId,
        shiftSchedule: user.shiftSchedule,
        flexiTime: Boolean(user.flexiTime)
      },
      records: recordsWithTimeInChecks,
      aiInsight: detectAttendanceAnomaly({ attendanceDates, analysisStartUtc, analysisEndUtc })
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

export const exportCscForm48 = async (req, res) => {
  try {
    const requesterScope = await getRequesterCampusScope(req.user.id);

    if (!requesterScope.requester) {
      return res.status(401).json({ message: "Unauthorized request." });
    }

    const monthRaw = Array.isArray(req.query.month) ? req.query.month[0] : req.query.month;
    const yearRaw = Array.isArray(req.query.year) ? req.query.year[0] : req.query.year;

    if (monthRaw === undefined || yearRaw === undefined) {
      return res.status(400).json({ message: "Month and year are required for export." });
    }

    const requestedMonth = Number(monthRaw);
    const requestedYear = Number(yearRaw);

    const hasValidMonth = Number.isInteger(requestedMonth) && requestedMonth >= 1 && requestedMonth <= 12;
    const hasValidYear = Number.isInteger(requestedYear) && requestedYear >= 1900 && requestedYear <= 9999;

    if (!hasValidMonth || !hasValidYear) {
      return res.status(400).json({ message: "Please provide valid month (1-12) and year (YYYY)." });
    }

    const monthText = String(requestedMonth).padStart(2, "0");
    const targetYearMonth = `${requestedYear}-${monthText}`;

    const usersWhere = {
      role: {
        [Op.ne]: "admin"
      }
    };

    if (requesterScope.isHr) {
      usersWhere.campus = requesterScope.campus;
    }

    const users = await User.findAll({
      where: usersWhere,
      attributes: ["id", "employeeBiometricId", "CompleteName"],
      order: [["CompleteName", "ASC"]]
    });

    const excludedEmployeeNames = new Set([
      "xian ca",
      "christian i cabrera",
      "xian cabrera"
    ]);

    const filteredUsers = users.filter((user) => {
      const normalizedName = String(user.CompleteName || "").trim().toLowerCase();

      return !excludedEmployeeNames.has(normalizedName);
    });

    const userIds = filteredUsers.map((user) => Number(user.id)).filter((id) => Number.isFinite(id));
    const biometricIds = filteredUsers
      .map((user) => String(user.employeeBiometricId || "").trim())
      .filter((id) => id.length > 0);

    const scopedFilters = [];

    if (userIds.length > 0) {
      scopedFilters.push({
        matchedUserId: {
          [Op.in]: userIds
        }
      });
    }

    if (biometricIds.length > 0) {
      scopedFilters.push({
        employeeBiometricId: {
          [Op.in]: biometricIds
        }
      });
    }

    const monthYearCondition = {
      [Op.and]: [
        where(fn("YEAR", col("attendanceDate")), requestedYear),
        where(fn("MONTH", col("attendanceDate")), requestedMonth)
      ]
    };

    const attendanceRecordConditions = [monthYearCondition];

    if (requesterScope.isHr && scopedFilters.length > 0) {
      attendanceRecordConditions.push({ [Op.or]: scopedFilters });
    }

    const attendanceRecords = !requesterScope.isHr || scopedFilters.length > 0
      ? await AttendanceRecord.findAll({
        where: { [Op.and]: attendanceRecordConditions },
        order: [
          ["employeeName", "ASC"],
          ["attendanceDate", "ASC"],
          ["employeeBiometricId", "ASC"]
        ]
      })
      : [];
    const monthlyRecords = attendanceRecords.filter((record) => String(record.attendanceDate || "").slice(0, 7) === targetYearMonth);
    const exportEmployees = filteredUsers.map((user) => ({
      id: user.id,
      employeeBiometricId: user.employeeBiometricId,
      employeeName: user.CompleteName
    }));
    const registeredBiometricIds = new Set(
      exportEmployees
        .map((employee) => String(employee.employeeBiometricId || "").trim())
        .filter(Boolean)
    );
    const idOnlyRecords = monthlyRecords.filter((record) => {
      const biometricId = String(record.employeeBiometricId || "").trim();
      return biometricId && !registeredBiometricIds.has(biometricId) && !Number(record.matchedUserId);
    });
    const groups = buildCscForm48Groups({
      employees: exportEmployees,
      records: [...monthlyRecords, ...idOnlyRecords],
      yearMonth: targetYearMonth
    });

    if (groups.length === 0) {
      return res.status(404).json({
        message: `No attendance records found for ${targetYearMonth}. Choose the month containing the uploaded records.`
      });
    }

    const fileName = `csc-form-48-${targetYearMonth}.pdf`;
    res.setHeader("Cache-Control", "no-store, no-cache, must-revalidate, proxy-revalidate");
    res.setHeader("Pragma", "no-cache");
    res.setHeader("Expires", "0");
    res.setHeader("Content-Type", "application/pdf");
    res.setHeader("Content-Disposition", `attachment; filename="${fileName}"`);

    const doc = new PDFDocument({ size: "A4", margin: 32 });
    doc.pipe(res);

    for (let index = 0; index < groups.length; index += 2) {
      if (index > 0) {
        doc.addPage();
      }

      const leftGroup = groups[index];
      const rightGroup = groups[index + 1];
      const pageWidth = doc.page.width;
      const margin = doc.page.margins.left;
      const gap = 24;
      const formWidth = (pageWidth - margin * 2 - gap) / 2;
      const formY = doc.page.margins.top;

      if (leftGroup) {
        const leftRows = buildDayRows(leftGroup.records, leftGroup.yearMonth);
        const leftMonthLabel = getMonthLabel(leftGroup.yearMonth);

        drawCscForm48(doc, {
          x: margin,
          y: formY,
          width: formWidth,
          employeeName: leftGroup.employeeName,
          employeeBiometricId: leftGroup.employeeBiometricId,
          monthLabel: leftMonthLabel,
          rows: leftRows
        });
      }

      if (rightGroup) {
        const rightRows = buildDayRows(rightGroup.records, rightGroup.yearMonth);
        const rightMonthLabel = getMonthLabel(rightGroup.yearMonth);

        drawCscForm48(doc, {
          x: margin + formWidth + gap,
          y: formY,
          width: formWidth,
          employeeName: rightGroup.employeeName,
          employeeBiometricId: rightGroup.employeeBiometricId,
          monthLabel: rightMonthLabel,
          rows: rightRows
        });
      }
    }

    doc.end();
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};
