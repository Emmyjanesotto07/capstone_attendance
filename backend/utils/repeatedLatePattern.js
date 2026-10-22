export const DEFAULT_REPEATED_LATE_THRESHOLD = 3;

export const detectRepeatedLatePattern = ({
  lateDays,
  threshold = DEFAULT_REPEATED_LATE_THRESHOLD
}) => {
  const validLateDays = Number.isFinite(Number(lateDays)) ? Math.max(0, Number(lateDays)) : 0;
  const validThreshold = Number.isFinite(Number(threshold)) && Number(threshold) >= 1
    ? Math.floor(Number(threshold))
    : DEFAULT_REPEATED_LATE_THRESHOLD;
  const detected = validLateDays >= validThreshold;

  return {
    detected,
    lateDays: validLateDays,
    threshold: validThreshold,
    message: detected
      ? `Repeated late pattern detected: ${validLateDays} late arrivals this month, reaching the limit of ${validThreshold}.`
      : null
  };
};