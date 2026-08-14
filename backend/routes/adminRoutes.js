import express from "express";
import auth from "../middleware/authMiddleware.js";
import adminOnly from "../middleware/adminOnly.js";
import adminOrHrOnly from "../middleware/adminOrHrOnly.js";
import { uploadUsersCsvFile } from "../middleware/upload.js";
import {
  getAllUsers,
  banUser,
  unbanUser,
  sendMessageToUser,
  toggleUserRole,
  toggleUserVerification,
  updateUserBiometricId,
  getNextAbsenceForecast,
  importUsersFromCsv
} from "../controllers/adminController.js";

const router = express.Router();

router.use(auth);

router.get("/users", adminOrHrOnly, getAllUsers);
router.post("/users/import-csv", adminOrHrOnly, uploadUsersCsvFile.single("usersCsvFile"), importUsersFromCsv);
router.put("/users/:id/ban", adminOrHrOnly, banUser);
router.put("/users/:id/unban", adminOrHrOnly, unbanUser);
router.put("/users/:id/toggle-verify", adminOrHrOnly, toggleUserVerification);
router.put("/users/:id/biometric-id", adminOrHrOnly, updateUserBiometricId);

router.use(adminOnly);

router.get("/forecasting/next-absence", getNextAbsenceForecast);
router.put("/users/:id/message", sendMessageToUser);
router.put("/users/:id/toggle-role", toggleUserRole);

export default router;
