import express from "express";
import { protectRoute } from "../middleware/auth.middleware.js";
import {
  getConversationsForSidebar,
  getOrCreateConversation,
  getMessages,
  sendMessage,
  addReaction,
  editMessage,
  deleteMessage,
  markAsSeen,
  searchMessages,
  getMedia,
  clearChat,
  toggleMuteConversation,
  forwardMessage
} from "../controllers/message.controller.js";

const router = express.Router();

router.get("/conversations", protectRoute, getConversationsForSidebar);
router.post("/conversation/:userId", protectRoute, getOrCreateConversation);
router.get("/:conversationId", protectRoute, getMessages);
router.post("/:conversationId", protectRoute, sendMessage);
router.put("/reaction/:messageId", protectRoute, addReaction);
router.put("/edit/:messageId", protectRoute, editMessage);
router.delete("/:messageId", protectRoute, deleteMessage);
router.put("/seen/:conversationId", protectRoute, markAsSeen);
router.get("/search/:conversationId", protectRoute, searchMessages);
router.get("/media/:conversationId", protectRoute, getMedia);
router.delete("/clear/:conversationId", protectRoute, clearChat);
router.put("/mute/:conversationId", protectRoute, toggleMuteConversation);
router.post("/forward/:messageId", protectRoute, forwardMessage);

export default router;