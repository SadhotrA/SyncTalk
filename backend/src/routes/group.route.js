import express from "express";
import { protectRoute } from "../middleware/auth.middleware.js";
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
router.get("/:conversationId", protectRoute, getConversation);
router.put("/:conversationId/add-members", protectRoute, addMembers);
router.delete("/:conversationId/members/:memberId", protectRoute, removeMember);
router.delete("/:conversationId/leave", protectRoute, leaveGroup);
router.put("/:conversationId", protectRoute, updateGroup);
router.put("/:conversationId/make-admin/:memberId", protectRoute, makeAdmin);
router.get("/:conversationId/info", protectRoute, getGroupInfo);

export default router;