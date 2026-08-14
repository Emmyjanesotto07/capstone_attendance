import fs from "fs";
import path from "path";
import multer from "multer";

const uploadRoot = path.resolve(process.cwd(), "uploads");
const profilesDir = path.join(uploadRoot, "profiles");
const attendanceDir = path.join(uploadRoot, "attendance");

[uploadRoot, profilesDir, attendanceDir].forEach((directoryPath) => {
  if (!fs.existsSync(directoryPath)) {
    fs.mkdirSync(directoryPath, { recursive: true });
  }
});

const profileImageFilter = (req, file, cb) => {
  if (!file.mimetype.startsWith("image/")) {
    cb(new Error("Profile picture must be an image file."));
    return;
  }

  cb(null, true);
};

const attachmentFilter = (req, file, cb) => {
  const allowedMimeTypes = [
    "image/jpeg",
    "image/png",
    "image/webp",
    "image/gif",
    "application/pdf",
    "application/msword",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    "application/vnd.ms-excel",
    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    "application/vnd.ms-powerpoint",
    "application/vnd.openxmlformats-officedocument.presentationml.presentation",
    "text/plain"
  ];

  if (!allowedMimeTypes.includes(file.mimetype)) {
    cb(new Error("Unsupported attachment file type."));
    return;
  }

  cb(null, true);
};

const attendanceFileFilter = (req, file, cb) => {
  const allowedMimeTypes = [
    "text/csv",
    "application/csv",
    "application/vnd.ms-excel",
    "text/plain"
  ];

  const extension = path.extname(file.originalname || "").toLowerCase();
  const allowedExtensions = [".csv", ".dat", ".txt"];

  if (!allowedMimeTypes.includes(file.mimetype) && !allowedExtensions.includes(extension)) {
    cb(new Error("Attendance file must be CSV, DAT, or TXT."));
    return;
  }

  cb(null, true);
};

const profileStorage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, profilesDir),
  filename: (req, file, cb) => {
    const extension = path.extname(file.originalname);
    cb(null, `profile-${req.user?.id || "user"}-${Date.now()}${extension}`);
  }
});

const attendanceStorage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, attendanceDir),
  filename: (req, file, cb) => {
    const extension = path.extname(file.originalname || ".csv") || ".csv";
    cb(null, `attendance-${req.user?.id || "user"}-${Date.now()}${extension}`);
  }
});

export const uploadProfilePicture = multer({
  storage: profileStorage,
  limits: { fileSize: 2 * 1024 * 1024 },
  fileFilter: profileImageFilter
});

export const uploadAttendanceFile = multer({
  storage: attendanceStorage,
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter: attendanceFileFilter
});

export const uploadUsersCsvFile = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter: attendanceFileFilter
});
