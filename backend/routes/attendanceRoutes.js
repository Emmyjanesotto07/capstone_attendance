import express from "express";
import auth from "../middleware/authMiddleware.js";
import adminOrHrOnly from "../middleware/adminOrHrOnly.js";
import { uploadAttendanceFile } from "../middleware/upload.js";
import {
	uploadAttendanceRecords,
	exportCscForm48,
	getAttendanceEmployees,
	getAttendanceByEmployee,
	getMyAttendanceSummary,
	getMyAttendanceNotifications,
	markAttendanceNotificationRead
} from "../controllers/attendanceController.js";

const router = express.Router();

router.get("/my-summary", auth, getMyAttendanceSummary);
router.get("/my-notifications", auth, getMyAttendanceNotifications);
router.post("/my-notifications/:notificationId/read", auth, markAttendanceNotificationRead);

router.use(auth, adminOrHrOnly);

router.get("/employees", getAttendanceEmployees);
router.get("/employees/:userId", getAttendanceByEmployee);
router.post("/upload", uploadAttendanceFile.single("attendanceFile"), uploadAttendanceRecords);
router.get("/export/csc-form-48", exportCscForm48);

export default router;
