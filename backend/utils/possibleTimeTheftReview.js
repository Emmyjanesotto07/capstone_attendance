export const buildPossibleTimeTheftReview = ({
  suspiciousTimeIn,
  suddenScheduleInconsistency,
  fakeAttendanceReview,
  flexiTime = false
}) => {
  const reasons = [];

  if (fakeAttendanceReview?.flagged) {
    reasons.push(fakeAttendanceReview.reason || "This punch pattern matches multiple employees.");
  }

  if (!flexiTime && suspiciousTimeIn?.isSuspicious && Number(suspiciousTimeIn.deviationMinutes) < 0) {
    reasons.push(suspiciousTimeIn.reason || "Time-in is unusually early compared with the scheduled shift.");
  }

  if (!flexiTime && suddenScheduleInconsistency?.detected) {
    reasons.push(
      suddenScheduleInconsistency.reason || "Time-in differs significantly from this employee's previous pattern."
    );
  }

  return {
    flagged: reasons.length > 0,
    reasons
  };
};
