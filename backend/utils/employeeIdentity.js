export const normalizeEmployeeNameKey = (value) => {
  if (value === null || value === undefined) {
    return "";
  }

  return String(value)
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-zA-Z0-9]+/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase();
};

const normalizeNumericBiometricId = (value) => {
  const biometricId = String(value || "").trim();

  if (!/^\d+$/.test(biometricId)) {
    return "";
  }

  return biometricId.replace(/^0+(?=\d)/, "");
};

export const resolveEmployeeMatch = ({ candidateBiometricId, candidateName, users = [] }) => {
  if (!Array.isArray(users) || users.length === 0) {
    return null;
  }

  const normalizedBiometricId = String(candidateBiometricId || "").trim();

  if (normalizedBiometricId) {
    const exactMatches = users.filter((user) =>
      String(user.employeeBiometricId || "").trim() === normalizedBiometricId
    );

    if (exactMatches.length === 1) {
      return exactMatches[0];
    }

    if (exactMatches.length > 1) {
      return null;
    }

    const normalizedId = normalizeNumericBiometricId(normalizedBiometricId);

    if (normalizedId) {
      const normalizedMatches = users.filter((user) =>
        normalizeNumericBiometricId(user.employeeBiometricId) === normalizedId
      );

      if (normalizedMatches.length === 1) {
        return normalizedMatches[0];
      }
    }

    return null;
  }

  const normalizedCandidateName = normalizeEmployeeNameKey(candidateName);

  if (!normalizedCandidateName) {
    return null;
  }

  const candidateTokens = normalizedCandidateName.split(/\s+/).filter(Boolean);

  const scoredMatches = users
    .map((user) => {
      const storedName = String(user.CompleteName || user.completeName || user.name || "").trim();
      const normalizedStoredName = normalizeEmployeeNameKey(storedName);

      if (!normalizedStoredName) {
        return null;
      }

      const storedTokens = normalizedStoredName.split(/\s+/).filter(Boolean);
      const exactMatch = normalizedStoredName === normalizedCandidateName;
      const subsetMatch = candidateTokens.every((token) => storedTokens.includes(token));

      if (!exactMatch && !subsetMatch) {
        return null;
      }

      const overlapCount = candidateTokens.filter((token) => storedTokens.includes(token)).length;
      return {
        user,
        score: exactMatch ? 1000 : overlapCount + storedTokens.length
      };
    })
    .filter(Boolean)
    .sort((left, right) => right.score - left.score);

  return scoredMatches[0]?.user || null;
};
