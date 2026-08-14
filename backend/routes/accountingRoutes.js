import express from "express";
import auth from "../middleware/authMiddleware.js";
import accountingOrAdminOnly from "../middleware/accountingOrAdminOnly.js";
import {
  getAccountingEntries,
  createAccountingEntry,
  updateAccountingEntry,
  deleteAccountingEntry,
  getAccountingSummary,
  previewSalaryComputation,
  getSalaryRecords,
  createSalaryRecord,
  updateSalaryRecord,
  deleteSalaryRecord,
  getSalaryProfiles,
  createSalaryProfile,
  updateSalaryProfile,
  deleteSalaryProfile,
  autofillSalaryFromAttendance
} from "../controllers/accountingController.js";

const router = express.Router();

router.use(auth, accountingOrAdminOnly);

router.get("/entries", getAccountingEntries);
router.post("/entries", createAccountingEntry);
router.put("/entries/:id", updateAccountingEntry);
router.delete("/entries/:id", deleteAccountingEntry);
router.get("/summary", getAccountingSummary);
router.post("/salaries/compute", previewSalaryComputation);
router.post("/salaries/autofill", autofillSalaryFromAttendance);
router.get("/salaries", getSalaryRecords);
router.post("/salaries", createSalaryRecord);
router.put("/salaries/:id", updateSalaryRecord);
router.delete("/salaries/:id", deleteSalaryRecord);
router.get("/salary-profiles", getSalaryProfiles);
router.post("/salary-profiles", createSalaryProfile);
router.put("/salary-profiles/:id", updateSalaryProfile);
router.delete("/salary-profiles/:id", deleteSalaryProfile);

export default router;
