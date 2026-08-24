import express from "express";
import { protectRoute } from "../middleware/auth.middleware.js";
import {
  conversationIdValidation,
  memberIdValidation
} from "../middleware/validation.middleware.js";
import {
  createGroup,
  getConversations,
  getConversation,
  addMembers,
  removeMember,
  leaveGroup,
  updateGroup,
  makeAdmin,
  getGroupInfo
} from "../controllers/group.controller.js";

const router = express.Router();

router.post("/create-group", protectRoute, createGroup);
router.get("/", protectRoute, getConversations);
router.get("/:conversationId", protectRoute, conversationIdValidation, getConversation);
router.put("/:conversationId/add-members", protectRoute, conversationIdValidation, addMembers);
router.delete("/:conversationId/members/:memberId", protectRoute, conversationIdValidation, memberIdValidation, removeMember);
router.delete("/:conversationId/leave", protectRoute, conversationIdValidation, leaveGroup);
router.put("/:conversationId", protectRoute, conversationIdValidation, updateGroup);
router.put("/:conversationId/make-admin/:memberId", protectRoute, conversationIdValidation, memberIdValidation, makeAdmin);
router.get("/:conversationId/info", protectRoute, conversationIdValidation, getGroupInfo);

export default router;
