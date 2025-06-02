import express from "express";
import { protectRoute } from "../middleware/auth.middleware.js";
import { getMessages, getUsersForSidebar, sendMessage } from "../controllers/message.controller.js";

const router = express.Router();

// More specific routes first
router.get("/users", protectRoute, getUsersForSidebar);
router.post("/send/:receiverId", protectRoute, sendMessage);

// Messages route
router.get("/conversation/:userId", protectRoute, getMessages);

export default router;