import express from "express";
import { checkAuth, login, logout, signup, updateProfile, updatePrivacySettings, updateNotificationSettings, updateChatSettings, setup2FA, verify2FA, verify2FALogin, disable2FA, changePassword, exportData } from "../controllers/auth.controller.js";
import { protectRoute } from "../middleware/auth.middleware.js";
import { signupValidation, loginValidation } from "../middleware/validation.middleware.js";

const router = express.Router();

router.post("/signup", signupValidation, signup);
router.post("/login", loginValidation, login);
router.post("/verify-2fa-login", verify2FALogin);
router.post("/logout", logout);

router.put("/update-profile", protectRoute, updateProfile);
router.put("/privacy-settings", protectRoute, updatePrivacySettings);
router.put("/notification-settings", protectRoute, updateNotificationSettings);
router.put("/chat-settings", protectRoute, updateChatSettings);
router.put("/change-password", protectRoute, changePassword);
router.get("/export-data", protectRoute, exportData);
router.post("/2fa/setup", protectRoute, setup2FA);
router.post("/2fa/verify", protectRoute, verify2FA);
router.post("/2fa/disable", protectRoute, disable2FA);

router.get("/check", protectRoute, checkAuth);

export default router;