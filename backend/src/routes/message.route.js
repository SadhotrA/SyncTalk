import express from "express";
import { protectRoute } from "../middleware/auth.middleware.js";
import {
  conversationIdValidation,
  userIdValidation,
  messageIdValidation,
  messageValidation,
  searchValidation
} from "../middleware/validation.middleware.js";
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
router.post("/conversation/:userId", protectRoute, userIdValidation, getOrCreateConversation);
router.get("/:conversationId", protectRoute, conversationIdValidation, getMessages);
router.post("/:conversationId", protectRoute, conversationIdValidation, messageValidation, sendMessage);
router.put("/reaction/:messageId", protectRoute, messageIdValidation, addReaction);
router.put("/edit/:messageId", protectRoute, messageIdValidation, messageValidation, editMessage);
router.delete("/:messageId", protectRoute, messageIdValidation, deleteMessage);
router.put("/seen/:conversationId", protectRoute, conversationIdValidation, markAsSeen);
router.get("/search/:conversationId", protectRoute, conversationIdValidation, searchValidation, searchMessages);
router.get("/media/:conversationId", protectRoute, conversationIdValidation, getMedia);
router.delete("/clear/:conversationId", protectRoute, conversationIdValidation, clearChat);
router.put("/mute/:conversationId", protectRoute, conversationIdValidation, toggleMuteConversation);
router.post("/forward/:messageId", protectRoute, messageIdValidation, forwardMessage);

export default router;
