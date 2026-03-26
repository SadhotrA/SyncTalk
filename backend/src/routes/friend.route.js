import express from "express";
import { protectRoute } from "../middleware/auth.middleware.js";
import {
  searchUsers,
  sendFriendRequest,
  acceptFriendRequest,
  rejectFriendRequest,
  getFriendRequests,
  getFriends,
  removeFriend,
  blockUser,
  unblockUser,
  getBlockedUsers,
  cancelFriendRequest,
  checkBlockedStatus
} from "../controllers/friend.controller.js";

const router = express.Router();

router.get("/search", protectRoute, searchUsers);
router.post("/request/:userId", protectRoute, sendFriendRequest);
router.post("/accept/:requestId", protectRoute, acceptFriendRequest);
router.post("/reject/:requestId", protectRoute, rejectFriendRequest);
router.delete("/request/:userId", protectRoute, cancelFriendRequest);
router.get("/requests", protectRoute, getFriendRequests);
router.get("/", protectRoute, getFriends);
router.delete("/:friendId", protectRoute, removeFriend);
router.post("/block/:userId", protectRoute, blockUser);
router.delete("/block/:userId", protectRoute, unblockUser);
router.get("/blocked", protectRoute, getBlockedUsers);
router.get("/blocked/:userId", protectRoute, checkBlockedStatus);

export default router;