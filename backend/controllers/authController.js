import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import crypto from "crypto";
import fs from "fs";
import path from "path";
import User from "../models/User.js";

const VALID_OFFICES = [
  "tourism",
  "mayor's office",
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
const VALID_ROLES = ["admin", "staff", "hr", "accounting"];
const STRONG_PASSWORD_REGEX = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z\d]).{8,}$/;

const normalizeValue = (value) => String(value || "").trim().toLowerCase().replace(/\s+/g, " ");

const normalizeDepartment = (value) => {
  const normalized = normalizeValue(value);

  if (normalized === "mayors office") {
    return "mayor's office";
  }

  return normalized;
};

const normalizeOffice = (value) => {
  const normalized = normalizeValue(value);

  return normalized;
};

const resolveDepartment = (body) => normalizeDepartment(body.departments ?? body.department ?? body.campus ?? "");
const resolveOffice = (body) => normalizeOffice(body.offices ?? body.office ?? body.college ?? body.departments ?? body.department ?? body.campus ?? "");

const buildPublicFileUrl = (req, filePath) => {
  if (!filePath) {
    return null;
  }

  const normalizedPath = String(filePath).replace(/\\/g, "/");
  return `${req.protocol}://${req.get("host")}/${normalizedPath}`;
};

export const register = async (req, res) => {

  try {

    const { email, password, CompleteName, completeName, departments, offices, role } = req.body;

    const normalizedName = (CompleteName || completeName || "").trim();
    const normalizedEmail = (email || "").trim().toLowerCase();
    const normalizedDepartments = resolveDepartment(req.body || {});
    const normalizedOffices = resolveOffice(req.body || {});
    const normalizedRole = role ? role.toLowerCase().trim() : "staff";
    const contactNumber = String(req.body.contactNumber || "").trim();
    const emergencyContact = String(req.body.emergencyContact || "").trim();
    const department = String(req.body.department || "").trim();
    const position = String(req.body.position || "").trim();
    const employeeCategory = String(req.body.employeeCategory || "").trim().toLowerCase();
    const shiftSchedule = String(req.body.shiftSchedule || "").trim();

    if (!normalizedEmail || !password || !normalizedName || !normalizedOffices) {
      return res.status(400).json({ message: "CompleteName, email, office, and password are required." });
    }

    if (!contactNumber || !emergencyContact || !department || !position || !shiftSchedule) {
      return res.status(400).json({ message: "Contact and employment details are required." });
    }

    if (!["regular", "cos", "job_order"].includes(employeeCategory)) {
      return res.status(400).json({ message: "Select a valid employee category." });
    }

    if (!VALID_OFFICES.includes(normalizedOffices)) {
      return res.status(400).json({ message: "Invalid office. Please select a valid office." });
    }

    if (!VALID_ROLES.includes(normalizedRole)) {
      return res.status(400).json({ message: "Invalid role. Allowed: admin, campus-admin, staff, hr, accounting." });
    }

    const existingUser = await User.findOne({ where: { email: normalizedEmail } });

    if (existingUser) {
      return res.status(409).json({ message: "Email already registered." });
    }

    const hash = await bcrypt.hash(password, 10);

    const user = await User.create({
      CompleteName: normalizedName,
      email: normalizedEmail,
      campus: normalizedOffices,
      college: normalizedOffices,
      role: normalizedRole,
      password: hash,
      contactNumber,
      emergencyContact,
      department,
      position,
      employeeCategory,
      shiftSchedule
    });

    res.json({
      id: user.id,
      email: user.email,
      role: user.role,
      departments: user.campus,
      offices: user.college,
      campus: user.campus,
      college: user.college,
      message: "Registration successful"
    });

  } catch (err) {

    res.status(500).json({ error: err.message });

  }

};

export const login = async (req, res) => {

  try {

    const { email, password } = req.body;

    const user = await User.findOne({
      where: { email }
    });

    if (!user) {
      return res.status(401).json({ message: "Invalid credentials" });
    }

    if (user.isBanned) {
      return res.status(403).json({ message: "Your account is banned. Please contact admin." });
    }

    const valid = await bcrypt.compare(password, user.password);

    if (!valid) {
      return res.status(401).json({ message: "Invalid credentials" });
    }

    const token = jwt.sign(
      { id: user.id, email: user.email, role: user.role, departments: user.campus, offices: user.college, campus: user.campus, college: user.college },
      process.env.JWT_SECRET,
      { expiresIn: "1h" }
    );

    res.json({
      token,
      role: user.role,
      email: user.email,
      departments: user.campus,
      offices: user.college,
      campus: user.campus,
      college: user.college
    });

  } catch (err) {

    res.status(500).json({ error: err.message });

  }

};

export const forgotPassword = async (req, res) => {

  try {

    const { email } = req.body;

    if (!email) {
      return res.status(400).json({ message: "Email is required." });
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

    if (!emailRegex.test(email)) {
      return res.status(400).json({ message: "Please provide a valid email." });
    }

    const user = await User.findOne({ where: { email } });

    if (!user) {
      return res.status(404).json({ message: "No account found with this email." });
    }

    const resetToken = crypto.randomBytes(24).toString("hex");

    user.token = resetToken;
    await user.save();

    res.json({
      message: "Password reset request submitted.",
      resetToken
    });

  } catch (err) {

    res.status(500).json({ error: err.message });

  }

};

export const updateAccount = async (req, res) => {

  try {

    const body = req.body && typeof req.body === "object" ? req.body : {};
    const normalizedName = String(body.CompleteName || body.completeName || "").trim();
    const normalizedEmail = String(body.email || "").trim().toLowerCase();
    const normalizedDepartments = resolveDepartment(body);
    const normalizedOffices = resolveOffice(body);

    if (!normalizedName || !normalizedEmail || !normalizedOffices) {
      return res.status(400).json({ message: "CompleteName, email, and office are required." });
    }

    if (!VALID_OFFICES.includes(normalizedOffices)) {
      return res.status(400).json({ message: "Invalid office. Please select a valid office." });
    }

    const user = await User.findByPk(req.user.id);

    if (!user) {
      return res.status(404).json({ message: "User not found." });
    }

    if (user.email !== normalizedEmail) {
      const existingUser = await User.findOne({ where: { email: normalizedEmail } });

      if (existingUser && existingUser.id !== user.id) {
        return res.status(409).json({ message: "Email already in use." });
      }
    }

    user.CompleteName = normalizedName;
    user.email = normalizedEmail;
    user.campus = normalizedOffices;
    user.college = normalizedOffices;

    if (req.file) {
      if (user.profilePicturePath) {
        const previousAbsolutePath = path.resolve(process.cwd(), user.profilePicturePath);

        if (fs.existsSync(previousAbsolutePath)) {
          fs.unlinkSync(previousAbsolutePath);
        }
      }

      user.profilePicturePath = path.join("uploads", "profiles", req.file.filename).replace(/\\/g, "/");
    }

    await user.save();

    res.json({
      message: "Account updated successfully.",
      user: {
        id: user.id,
        email: user.email,
        CompleteName: user.CompleteName,
        departments: user.campus,
        offices: user.college,
        campus: user.campus,
        college: user.college,
        role: user.role,
        profilePictureUrl: buildPublicFileUrl(req, user.profilePicturePath)
      }
    });

  } catch (err) {

    res.status(500).json({ error: err.message });

  }

};

export const changePassword = async (req, res) => {

  try {

    const { currentPassword, newPassword } = req.body;

    if (!currentPassword || !newPassword) {
      return res.status(400).json({ message: "Current password and new password are required." });
    }

    if (!STRONG_PASSWORD_REGEX.test(newPassword)) {
      return res.status(400).json({ message: "New password must be at least 8 characters and include uppercase, lowercase, number, and special character." });
    }

    const user = await User.findByPk(req.user.id);

    if (!user) {
      return res.status(404).json({ message: "User not found." });
    }

    const isCurrentPasswordValid = await bcrypt.compare(currentPassword, user.password);

    if (!isCurrentPasswordValid) {
      return res.status(401).json({ message: "Current password is incorrect." });
    }

    const hash = await bcrypt.hash(newPassword, 10);
    user.password = hash;
    await user.save();

    res.json({ message: "Password changed successfully." });

  } catch (err) {

    res.status(500).json({ error: err.message });

  }

};

export const getProfile = async (req, res) => {

  try {

    const user = await User.findByPk(req.user.id, {
      attributes: ["id", "email", "CompleteName", "campus", "college", "role", "profilePicturePath"]
    });

    if (!user) {
      return res.status(404).json({ message: "User not found." });
    }

    res.json({
      user: {
        ...user.toJSON(),
        departments: user.campus,
        offices: user.college,
        profilePictureUrl: buildPublicFileUrl(req, user.profilePicturePath)
      }
    });

  } catch (err) {

    res.status(500).json({ error: err.message });

  }

};