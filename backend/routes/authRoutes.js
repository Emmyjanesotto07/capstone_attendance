import express from "express";
import { register, login, forgotPassword, updateAccount, changePassword, getProfile } from "../controllers/authController.js";
import auth from "../middleware/authMiddleware.js";
import { uploadProfilePicture } from "../middleware/upload.js";

const router = express.Router();

router.post("/register", register);
router.post("/login", login);
router.post("/forgot-password", forgotPassword);
router.put("/update-account", auth, uploadProfilePicture.single("profilePicture"), updateAccount);
router.put("/change-password", auth, changePassword);

router.get("/profile", auth, getProfile);

export default router;