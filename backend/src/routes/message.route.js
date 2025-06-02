import express from "express";
import { protectRoute } from "../middleware/auth.middleware.js";
import { getMessages, getUsersForSidebar, sendMessage } from "../controllers/message.controller.js";

const router = express.Router();

// More specific routes first
router.get("/users", protectRoute, getUsersForSidebar);
router.post("/send/:receiverId", protectRoute, sendMessage);

// Messages route with a more specific prefix
router.get("/chat/:userId", protectRoute, getMessages);

export default router;