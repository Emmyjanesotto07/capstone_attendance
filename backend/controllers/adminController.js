import { fn, col, Op, where } from "sequelize";
import bcrypt from "bcryptjs";
import crypto from "crypto";
import User from "../models/User.js";
import Message from "../models/Message.js";
import AttendanceRecord from "../models/AttendanceRecord.js";
import { getShiftStartMinutes } from "../utils/attendanceSummary.js";

const ASSIGNABLE_ROLES = ["admin", "staff", "hr", "accounting"];
const WEEKDAY_LABELS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
const VALID_DEPARTMENTS = [
  "tourism",
  "mayor's office",
  "hrmo",
  "sb",
  "vice mayor office",
  "mpdo",
  "mswdo",
  "meo",
  "mao",
  "budget",
  "malasakit",
  "gad",
  "bac",
  "treasurer",
  "accounting",
  "masso",
  "gso",
  "mcr"
];
const VALID_COLLEGES = ["ccs", "cas", "cte", "ccje", "cbm"];

const parseDelimitedLine = (line, delimiter = ",") => {
  const values = [];
  let current = "";
  let inQuotes = false;

  for (let index = 0; index < line.length; index += 1) {
    const char = line[index];

    if (char === '"') {
      const nextChar = line[index + 1];

      if (inQuotes && nextChar === '"') {
        current += '"';
        index += 1;
        continue;
      }

      inQuotes = !inQuotes;
      continue;
    }

    if (char === delimiter && !inQuotes) {
      values.push(current.trim());
      current = "";
      continue;
    }

    current += char;
  }

  values.push(current.trim());
  return values;
};

const detectDelimiter = (line) => {
  const commaCount = (line.match(/,/g) || []).length;
  const semicolonCount = (line.match(/;/g) || []).length;
  return semicolonCount > commaCount ? ";" : ",";
};

const normalizeHeader = (value) => String(value || "").trim().toLowerCase().replace(/[^a-z0-9]+/g, "");

const buildHeaderIndexMap = (headers) => {
  const normalized = headers.map((item) => normalizeHeader(item));

  const findIndex = (aliases) => {
    for (const alias of aliases) {
      const idx = normalized.indexOf(normalizeHeader(alias));

      if (idx >= 0) {
        return idx;
      }
    }

    return -1;
  };

  return {
    biometricId: findIndex(["employeeid", "employeebiometricid", "empno", "empid", "id", "biometricid", "enrollid"]),
    email: findIndex(["email", "emailaddress"]),
    password: findIndex(["password", "pass"]),
    role: findIndex(["role", "usertype"]),
    campus: findIndex(["campus", "office"]),
    college: findIndex(["college", "department"]),
    fullName: findIndex(["completename", "fullname", "name"]),
    firstName: findIndex(["firstname", "fname", "givenname"]),
    middleName: findIndex(["middlename", "mname", "middleinitial"]),
    lastName: findIndex(["lastname", "lname", "surname"])
  };
};

const buildCompleteName = (row, indexMap) => {
  if (indexMap.fullName >= 0) {
    const fullName = String(row[indexMap.fullName] || "").trim();

    if (fullName) {
      return fullName;
    }
  }

  const first = indexMap.firstName >= 0 ? String(row[indexMap.firstName] || "").trim() : "";
  const middle = indexMap.middleName >= 0 ? String(row[indexMap.middleName] || "").trim() : "";
  const last = indexMap.lastName >= 0 ? String(row[indexMap.lastName] || "").trim() : "";

  return [first, middle, last].filter((part) => part.length > 0).join(" ");
};

const slugify = (value) => String(value || "").toLowerCase().replace(/[^a-z0-9]+/g, ".").replace(/^\.+|\.+$/g, "");

const normalizeRole = (value) => {
  const role = String(value || "").trim().toLowerCase();
  return ASSIGNABLE_ROLES.includes(role) ? role : "staff";
};

const normalizeCampus = (value) => {
  const campus = String(value || "").trim().toLowerCase();
  return VALID_DEPARTMENTS.includes(campus) ? campus : null;
};

const normalizeCollege = (value) => {
  const college = String(value || "").trim().toLowerCase();
  return VALID_COLLEGES.includes(college) ? college : null;
};

const generateTemporaryPassword = () => {
  return `Tmp#${crypto.randomBytes(5).toString("hex")}`;
};

const generateUniqueEmail = async (baseEmail, usedEmails) => {
  const safeBase = String(baseEmail || "").trim().toLowerCase();

  if (!safeBase) {
    return "";
  }

  const [localPartRaw, domainRaw] = safeBase.includes("@") ? safeBase.split("@") : [safeBase, "minsu.edu.ph"];
  const localPart = slugify(localPartRaw) || "employee";
  const domain = String(domainRaw || "minsu.edu.ph").trim().toLowerCase() || "minsu.edu.ph";

  let candidate = `${localPart}@${domain}`;
  let suffix = 1;

  while (usedEmails.has(candidate) || await User.findOne({ where: { email: candidate }, attributes: ["id"] })) {
    suffix += 1;
    candidate = `${localPart}${suffix}@${domain}`;
  }

  usedEmails.add(candidate);
  return candidate;
};

const parseDateOnlyToUtc = (value) => {
  const text = String(value || "").trim();
  const matched = text.match(/^(\d{4})-(\d{2})-(\d{2})$/);

  if (!matched) {
    return null;
  }

  const year = Number(matched[1]);
  const month = Number(matched[2]);
  const day = Number(matched[3]);

  return new Date(Date.UTC(year, month - 1, day));
};

const formatUtcDateOnly = (date) => {
  if (!(date instanceof Date) || Number.isNaN(date.getTime())) {
    return null;
  }

  return date.toISOString().slice(0, 10);
};

const addUtcDays = (date, days) => {
  const next = new Date(date.getTime());
  next.setUTCDate(next.getUTCDate() + days);
  return next;
};

const isWeekdayUtc = (date) => {
  const day = date.getUTCDay();
  return day >= 1 && day <= 5;
};

const sigmoid = (value) => 1 / (1 + Math.exp(-Math.max(-35, Math.min(35, value))));

const dotProduct = (left, right) => {
  let sum = 0;

  for (let index = 0; index < left.length; index += 1) {
    sum += Number(left[index] || 0) * Number(right[index] || 0);
  }

  return sum;
};

const buildAbsenceFeatures = (date, dayIndex, totalDays) => {
  const weekday = date.getUTCDay();
  const monthIndex = date.getUTCMonth();
  const weekdayOneHot = [0, 0, 0, 0, 0];

  if (weekday >= 1 && weekday <= 5) {
    weekdayOneHot[weekday - 1] = 1;
  }

  const monthAngle = (2 * Math.PI * monthIndex) / 12;
  const trend = totalDays > 1 ? dayIndex / (totalDays - 1) : 0;

  return [
    1,
    ...weekdayOneHot,
    Math.sin(monthAngle),
    Math.cos(monthAngle),
    trend
  ];
};

const trainAbsenceModel = (samples, labels) => {
  if (!samples.length || !labels.length || samples.length !== labels.length) {
    return null;
  }

  const featureCount = samples[0].length;
  const weights = Array.from({ length: featureCount }, () => 0);
  const learningRate = 0.25;
  const regularization = 0.001;
  const epochs = 250;

  for (let epoch = 0; epoch < epochs; epoch += 1) {
    const gradients = Array.from({ length: featureCount }, () => 0);

    for (let rowIndex = 0; rowIndex < samples.length; rowIndex += 1) {
      const row = samples[rowIndex];
      const target = Number(labels[rowIndex] || 0);
      const prediction = sigmoid(dotProduct(weights, row));
      const error = prediction - target;

      for (let featureIndex = 0; featureIndex < featureCount; featureIndex += 1) {
        gradients[featureIndex] += error * row[featureIndex];
      }
    }

    for (let featureIndex = 0; featureIndex < featureCount; featureIndex += 1) {
      const averageGradient = gradients[featureIndex] / samples.length;
      const l2Term = featureIndex === 0 ? 0 : regularization * weights[featureIndex];
      weights[featureIndex] -= learningRate * (averageGradient + l2Term);
    }
  }

  let correct = 0;

  for (let rowIndex = 0; rowIndex < samples.length; rowIndex += 1) {
    const predicted = sigmoid(dotProduct(weights, samples[rowIndex])) >= 0.5 ? 1 : 0;

    if (predicted === Number(labels[rowIndex] || 0)) {
      correct += 1;
    }
  }

  const trainingAccuracy = samples.length > 0 ? Number((correct / samples.length).toFixed(2)) : 0;

  return {
    weights,
    trainingAccuracy
  };
};

const withProfilePictureUrl = (req, user) => {
  const payload = user.toJSON ? user.toJSON() : user;

  return {
    ...payload,
    profilePictureUrl: payload.profilePicturePath
      ? `${req.protocol}://${req.get("host")}/${String(payload.profilePicturePath).replace(/\\/g, "/")}`
      : null
  };
};

const isHrCampusManagerForUser = (requester, targetUser) => {
  const requesterRole = String(requester?.role || "").trim().toLowerCase();
  const requesterCampus = String(requester?.campus || "").trim().toLowerCase();
  const targetCampus = String(targetUser?.campus || "").trim().toLowerCase();
  const targetRole = String(targetUser?.role || "").trim().toLowerCase();

  return requesterRole === "hr" && requesterCampus && requesterCampus === targetCampus && targetRole !== "admin";
};

const isAdminRequester = (requester) => {
  return String(requester?.role || "").trim().toLowerCase() === "admin";
};

const canManageUser = (requester, targetUser) => {
  if (isAdminRequester(requester)) {
    return true;
  }

  return isHrCampusManagerForUser(requester, targetUser);
};

export const getAllUsers = async (req, res) => {
  try {
    const requesterRole = String(req.user?.role || "").trim().toLowerCase();
    const requesterCampus = normalizeCampus(req.user?.campus);

    const unreadRows = await Message.findAll({
      where: {
        receiverId: req.user.id,
        isSeen: false
      },
      attributes: ["senderId", [fn("COUNT", col("id")), "unreadCount"]],
      group: ["senderId"]
    });

    const unreadMap = new Map();

    unreadRows.forEach((row) => {
      unreadMap.set(row.senderId, Number(row.get("unreadCount")) || 0);
    });

    const usersWhere = {};

    if (requesterRole === "hr") {
      usersWhere.role = {
        [Op.ne]: "admin"
      };

      if (requesterCampus) {
        usersWhere[Op.and] = [
          where(fn("LOWER", col("campus")), requesterCampus)
        ];
      } else {
        usersWhere[Op.and] = [where(fn("LOWER", col("campus")), "__invalid__")];
      }
    }

    const rawUsers = await User.findAll({
      where: usersWhere,
      attributes: [
        "id",
        "CompleteName",
        "employeeBiometricId",
        "flexiTime",
        "email",
        "campus",
        "college",
        "role",
        "verified",
        "isBanned",
        "banReason",
        "lastAdminMessage",
        "lastMessageAt",
        "profilePicturePath"
      ],
      order: [["id", "DESC"]]
    });

    const users = rawUsers.map((user) => ({
      ...withProfilePictureUrl(req, user),
      unreadCount: unreadMap.get(user.id) || 0
    }));

    res.json({ users });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

export const banUser = async (req, res) => {
  try {
    const { id } = req.params;
    const { reason } = req.body;

    const user = await User.findByPk(id);

    if (!user) {
      return res.status(404).json({ message: "User not found." });
    }

    if (user.id === req.user.id) {
      return res.status(400).json({ message: "You cannot ban your own account." });
    }

    if (!canManageUser(req.user, user)) {
      return res.status(403).json({ message: "You can only manage employees within your campus." });
    }

    user.isBanned = true;
    user.banReason = reason ? String(reason).trim() : "No reason provided.";
    await user.save();

    res.json({ message: "User banned successfully." });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

export const unbanUser = async (req, res) => {
  try {
    const { id } = req.params;

    const user = await User.findByPk(id);

    if (!user) {
      return res.status(404).json({ message: "User not found." });
    }

    if (!canManageUser(req.user, user)) {
      return res.status(403).json({ message: "You can only manage employees within your campus." });
    }

    user.isBanned = false;
    user.banReason = null;
    await user.save();

    res.json({ message: "User unbanned successfully." });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

export const sendMessageToUser = async (req, res) => {
  try {
    const { id } = req.params;
    const { message } = req.body;

    if (!message || !String(message).trim()) {
      return res.status(400).json({ message: "Message is required." });
    }

    const user = await User.findByPk(id);

    if (!user) {
      return res.status(404).json({ message: "User not found." });
    }

    const normalizedMessage = String(message).trim();

    await Message.create({
      senderId: req.user.id,
      receiverId: user.id,
      text: normalizedMessage,
      isSeen: false
    });

    user.lastAdminMessage = normalizedMessage;
    user.lastMessageAt = new Date();
    await user.save();

    res.json({ message: "Message sent successfully." });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

export const toggleUserRole = async (req, res) => {
  try {
    const { id } = req.params;

    const user = await User.findByPk(id);

    if (!user) {
      return res.status(404).json({ message: "User not found." });
    }

    if (user.id === req.user.id) {
      return res.status(400).json({ message: "You cannot change your own role." });
    }

    const currentRoleIndex = ASSIGNABLE_ROLES.indexOf(user.role);
    const normalizedCurrentIndex = currentRoleIndex >= 0 ? currentRoleIndex : 0;
    const nextRoleIndex = (normalizedCurrentIndex + 1) % ASSIGNABLE_ROLES.length;

    user.role = ASSIGNABLE_ROLES[nextRoleIndex];
    await user.save();

    res.json({ message: `Role changed to ${user.role}.` });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

export const toggleUserVerification = async (req, res) => {
  try {
    const { id } = req.params;

    const user = await User.findByPk(id);

    if (!user) {
      return res.status(404).json({ message: "User not found." });
    }

    if (!canManageUser(req.user, user)) {
      return res.status(403).json({ message: "You can only manage employees within your campus." });
    }

    user.verified = !user.verified;
    await user.save();

    res.json({ message: `User verification updated: ${user.verified ? "verified" : "unverified"}.` });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

export const updateUserBiometricId = async (req, res) => {
  try {
    const { id } = req.params;
    const rawBiometricId = req.body?.employeeBiometricId;
    const normalizedBiometricId = String(rawBiometricId || "").trim();
    const biometricIdOrNull = normalizedBiometricId || null;

    const user = await User.findByPk(id);

    if (!user) {
      return res.status(404).json({ message: "User not found." });
    }

    if (!canManageUser(req.user, user)) {
      return res.status(403).json({ message: "You can only manage employees within your campus." });
    }

    if (biometricIdOrNull) {
      const existing = await User.findOne({
        where: {
          employeeBiometricId: biometricIdOrNull,
          id: {
            [Op.ne]: user.id
          }
        }
      });

      if (existing) {
        return res.status(409).json({ message: "Biometric ID is already assigned to another user." });
      }
    }

    user.employeeBiometricId = biometricIdOrNull;
    await user.save();

    res.json({
      message: biometricIdOrNull
        ? `Biometric ID updated to ${biometricIdOrNull}.`
        : "Biometric ID cleared.",
      user: {
        id: user.id,
        employeeBiometricId: user.employeeBiometricId
      }
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

export const updateUserFlexiTime = async (req, res) => {
  try {
    const { id } = req.params;
    const flexiTime = req.body?.flexiTime;

    if (typeof flexiTime !== "boolean") {
      return res.status(400).json({ message: "Flexi-time must be enabled or disabled." });
    }

    const user = await User.findByPk(id);

    if (!user) {
      return res.status(404).json({ message: "User not found." });
    }

    if (!canManageUser(req.user, user)) {
      return res.status(403).json({ message: "You can only manage employees within your campus." });
    }

    if (flexiTime && getShiftStartMinutes(user.shiftSchedule) === null) {
      return res.status(400).json({
        message: "Set a valid shift start time on the employee profile before enabling flexi-time."
      });
    }

    user.flexiTime = flexiTime;
    await user.save();

    return res.json({
      message: `Flexi-time ${flexiTime ? "enabled" : "disabled"} for ${user.CompleteName}.`,
      user: {
        id: user.id,
        flexiTime: user.flexiTime
      }
    });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
};

export const importUsersFromCsv = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: "CSV file is required." });
    }

    const requesterRole = String(req.user?.role || "").trim().toLowerCase();
    const requesterCampus = normalizeCampus(req.user?.campus);
    const csvContent = req.file.buffer ? req.file.buffer.toString("utf8") : "";
    const lines = csvContent
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter((line) => line.length > 0);

    if (lines.length < 2) {
      return res.status(400).json({ message: "CSV must contain a header and at least one data row." });
    }

    const delimiter = detectDelimiter(lines[0]);
    const headers = parseDelimitedLine(lines[0], delimiter);
    const indexMap = buildHeaderIndexMap(headers);

    if (indexMap.biometricId < 0) {
      return res.status(400).json({ message: "CSV must include employee ID column (e.g., empno or employeeid)." });
    }

    if (indexMap.campus < 0) {
      return res.status(400).json({ message: "CSV must include campus column." });
    }

    const usedEmails = new Set();
    const processedBiometricIds = new Set();
    const createdUsers = [];
    const skippedBiometricIds = [];
    const duplicateBiometricIds = [];
    const invalidCampusBiometricIds = [];
    const campusMismatchBiometricIds = [];
    const temporaryCredentials = [];

    for (let lineIndex = 1; lineIndex < lines.length; lineIndex += 1) {
      const row = parseDelimitedLine(lines[lineIndex], delimiter);
      const biometricId = String(row[indexMap.biometricId] || "").trim();

      if (!biometricId) {
        continue;
      }

      if (processedBiometricIds.has(biometricId)) {
        skippedBiometricIds.push(biometricId);
        duplicateBiometricIds.push(biometricId);
        continue;
      }

      processedBiometricIds.add(biometricId);

      const existingByBiometric = await User.findOne({
        where: { employeeBiometricId: biometricId },
        attributes: ["id"]
      });

      if (existingByBiometric) {
        skippedBiometricIds.push(biometricId);
        duplicateBiometricIds.push(biometricId);
        continue;
      }

      const completeName = buildCompleteName(row, indexMap) || `Employee ${biometricId}`;
      const campusFromCsv = normalizeCampus(row[indexMap.campus]);
      const collegeFromCsv = indexMap.college >= 0 ? normalizeCollege(row[indexMap.college]) : null;
      const roleFromCsv = indexMap.role >= 0 ? normalizeRole(row[indexMap.role]) : "staff";
      const rawEmail = indexMap.email >= 0 ? String(row[indexMap.email] || "").trim().toLowerCase() : "";
      const rawPassword = indexMap.password >= 0 ? String(row[indexMap.password] || "").trim() : "";

      if (!campusFromCsv) {
        skippedBiometricIds.push(biometricId);
        invalidCampusBiometricIds.push(biometricId);
        continue;
      }

      if (requesterRole === "hr" && requesterCampus && campusFromCsv !== requesterCampus) {
        skippedBiometricIds.push(biometricId);
        campusMismatchBiometricIds.push(biometricId);
        continue;
      }

      const campus = requesterRole === "hr"
        ? (requesterCampus || campusFromCsv)
        : campusFromCsv;

      const college = collegeFromCsv || "ccs";
      const role = requesterRole === "hr" ? "staff" : roleFromCsv;

      const proposedEmail = rawEmail || `${slugify(completeName) || "employee"}.${biometricId}@minsu.edu.ph`;
      const email = await generateUniqueEmail(proposedEmail, usedEmails);

      const plainPassword = rawPassword || generateTemporaryPassword();
      const passwordHash = await bcrypt.hash(plainPassword, 10);

      const created = await User.create({
        CompleteName: completeName,
        employeeBiometricId: biometricId,
        email,
        campus,
        college,
        role,
        password: passwordHash,
        verified: true
      });

      createdUsers.push(created.id);

      if (!rawPassword || !rawEmail) {
        temporaryCredentials.push({
          employeeBiometricId: biometricId,
          completeName,
          email,
          password: plainPassword
        });
      }
    }

    return res.status(201).json({
      message: "Employee CSV import completed.",
      createdCount: createdUsers.length,
      skippedCount: skippedBiometricIds.length,
      skippedBiometricIds,
      duplicateBiometricIds,
      invalidCampusBiometricIds,
      campusMismatchBiometricIds,
      temporaryCredentials
    });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
};

export const getNextAbsenceForecast = async (req, res) => {
  try {
    const campusRaw = Array.isArray(req.query.campus) ? req.query.campus[0] : req.query.campus;
    const campusFilter = String(campusRaw || "").trim().toLowerCase();

    if (campusFilter && !VALID_DEPARTMENTS.includes(campusFilter)) {
      return res.status(400).json({ message: "Invalid office filter value." });
    }

    const userWhere = {
      role: {
        [Op.ne]: "admin"
      }
    };

    if (campusFilter) {
      userWhere.campus = campusFilter;
    }

    const users = await User.findAll({
      where: userWhere,
      attributes: ["id", "CompleteName", "email", "campus", "role", "employeeBiometricId"],
      order: [["CompleteName", "ASC"]]
    });

    if (users.length === 0) {
      return res.json({ forecasts: [], selectedCampus: campusFilter || "all", generatedAt: new Date().toISOString() });
    }

    const userIds = users.map((user) => Number(user.id)).filter((id) => Number.isFinite(id));
    const biometricIds = users
      .map((user) => String(user.employeeBiometricId || "").trim())
      .filter((id) => id.length > 0);

    const whereFilters = [];

    if (userIds.length > 0) {
      whereFilters.push({
        matchedUserId: {
          [Op.in]: userIds
        }
      });
    }

    if (biometricIds.length > 0) {
      whereFilters.push({
        employeeBiometricId: {
          [Op.in]: biometricIds
        }
      });
    }

    const attendanceRows = whereFilters.length > 0
      ? await AttendanceRecord.findAll({
        where: {
          [Op.or]: whereFilters
        },
        attributes: ["matchedUserId", "employeeBiometricId", "attendanceDate"],
        order: [["attendanceDate", "ASC"]]
      })
      : [];

    const userById = new Map(users.map((user) => [Number(user.id), user]));
    const userIdByBiometric = new Map(
      users
        .filter((user) => String(user.employeeBiometricId || "").trim().length > 0)
        .map((user) => [String(user.employeeBiometricId).trim(), Number(user.id)])
    );

    const attendanceByUserId = new Map();

    users.forEach((user) => {
      attendanceByUserId.set(Number(user.id), new Set());
    });

    attendanceRows.forEach((row) => {
      const matchedUserId = Number(row.matchedUserId);
      const biometricId = String(row.employeeBiometricId || "").trim();
      const attendanceDate = String(row.attendanceDate || "").slice(0, 10);

      if (!attendanceDate) {
        return;
      }

      let ownerUserId = null;

      if (Number.isFinite(matchedUserId) && userById.has(matchedUserId)) {
        ownerUserId = matchedUserId;
      } else if (biometricId && userIdByBiometric.has(biometricId)) {
        ownerUserId = userIdByBiometric.get(biometricId);
      }

      if (ownerUserId == null) {
        return;
      }

      attendanceByUserId.get(ownerUserId)?.add(attendanceDate);
    });

    const now = new Date();
    const todayUtc = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
    const yesterdayUtc = addUtcDays(todayUtc, -1);
    const analysisLookbackStartUtc = addUtcDays(todayUtc, -90);

    const forecasts = users.map((user) => {
      const userId = Number(user.id);
      const attendanceSet = attendanceByUserId.get(userId) || new Set();
      const attendanceDates = Array.from(attendanceSet).sort();

      if (attendanceDates.length === 0) {
        return {
          userId: user.id,
          completeName: user.CompleteName,
          email: user.email,
          campus: user.campus,
          role: user.role,
          employeeBiometricId: user.employeeBiometricId,
          lastAttendanceDate: null,
          predictedNextAbsentDate: null,
          dominantAbsentWeekday: null,
          absentRate: 0,
          absentDays: 0,
          expectedWorkdays: 0,
          note: "No attendance history"
        };
      }

      const firstAttendanceUtc = parseDateOnlyToUtc(attendanceDates[0]);
      const analysisStartUtc = firstAttendanceUtc && firstAttendanceUtc > analysisLookbackStartUtc
        ? firstAttendanceUtc
        : analysisLookbackStartUtc;

      if (!analysisStartUtc || analysisStartUtc > yesterdayUtc) {
        return {
          userId: user.id,
          completeName: user.CompleteName,
          email: user.email,
          campus: user.campus,
          role: user.role,
          employeeBiometricId: user.employeeBiometricId,
          lastAttendanceDate: attendanceDates[attendanceDates.length - 1],
          predictedNextAbsentDate: null,
          dominantAbsentWeekday: null,
          absentRate: 0,
          absentDays: 0,
          expectedWorkdays: 0,
          note: "Not enough days to analyze"
        };
      }

      const absentByWeekday = [0, 0, 0, 0, 0, 0, 0];
      let expectedWorkdays = 0;
      let absentDays = 0;
      const datesForTraining = [];
      const labelsForTraining = [];

      let dayCounter = 0;

      for (let cursor = new Date(analysisStartUtc.getTime()); cursor <= yesterdayUtc; cursor = addUtcDays(cursor, 1)) {
        if (!isWeekdayUtc(cursor)) {
          continue;
        }

        const dateOnly = formatUtcDateOnly(cursor);
        const weekday = cursor.getUTCDay();

        expectedWorkdays += 1;

        const isAbsent = !attendanceSet.has(dateOnly);

        if (isAbsent) {
          absentDays += 1;
          absentByWeekday[weekday] += 1;
        }

        datesForTraining.push(new Date(cursor.getTime()));
        labelsForTraining.push(isAbsent ? 1 : 0);
        dayCounter += 1;
      }

      const samples = datesForTraining.map((date, index) => buildAbsenceFeatures(date, index, dayCounter));
      const model = trainAbsenceModel(samples, labelsForTraining);

      let predictedNextAbsentDate = null;
      let dominantAbsentWeekday = null;
      let absentRate = 0;
      let forecastProbability = 0;

      if (expectedWorkdays > 0) {
        absentRate = Number((absentDays / expectedWorkdays).toFixed(2));
      }

      if (model && absentDays > 0) {
        let bestDate = null;
        let bestProbability = -1;

        let workdayIndex = dayCounter;

        for (let step = 1; step <= 30; step += 1) {
          const candidate = addUtcDays(todayUtc, step);

          if (!isWeekdayUtc(candidate)) {
            continue;
          }

          const feature = buildAbsenceFeatures(candidate, workdayIndex, dayCounter + 30);
          const probability = sigmoid(dotProduct(model.weights, feature));

          if (probability > bestProbability) {
            bestProbability = probability;
            bestDate = candidate;
          }

          workdayIndex += 1;
        }

        if (bestDate) {
          predictedNextAbsentDate = formatUtcDateOnly(bestDate);
          dominantAbsentWeekday = WEEKDAY_LABELS[bestDate.getUTCDay()];
          forecastProbability = Number(Math.max(0, Math.min(1, bestProbability)).toFixed(2));
        }
      }

      return {
        userId: user.id,
        completeName: user.CompleteName,
        email: user.email,
        campus: user.campus,
        role: user.role,
        employeeBiometricId: user.employeeBiometricId,
        lastAttendanceDate: attendanceDates[attendanceDates.length - 1],
        predictedNextAbsentDate,
        dominantAbsentWeekday,
        absentRate,
        absentDays,
        expectedWorkdays,
        forecastProbability,
        model: model
          ? {
            name: "logistic-regression",
            trainingAccuracy: model.trainingAccuracy
          }
          : null,
        note: absentDays > 0 ? null : "No absence pattern yet"
      };
    });

    forecasts.sort((left, right) => {
      const leftDate = left.predictedNextAbsentDate || "9999-12-31";
      const rightDate = right.predictedNextAbsentDate || "9999-12-31";

      if (leftDate !== rightDate) {
        return leftDate.localeCompare(rightDate);
      }

      return String(left.completeName || "").localeCompare(String(right.completeName || ""));
    });

    res.json({
      forecasts,
      selectedCampus: campusFilter || "all",
      generatedAt: new Date().toISOString()
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};
