import express from "express";
import { protectRoute } from "../middleware/auth.middleware.js";
import {
  userIdValidation,
  requestIdValidation,
  searchValidation
} from "../middleware/validation.middleware.js";
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

router.get("/search", protectRoute, searchValidation, searchUsers);
router.post("/request/:userId", protectRoute, userIdValidation, sendFriendRequest);
router.post("/accept/:requestId", protectRoute, requestIdValidation, acceptFriendRequest);
router.post("/reject/:requestId", protectRoute, requestIdValidation, rejectFriendRequest);
router.delete("/request/:userId", protectRoute, userIdValidation, cancelFriendRequest);
router.get("/requests", protectRoute, getFriendRequests);
router.get("/", protectRoute, getFriends);
router.delete("/:friendId", protectRoute, userIdValidation, removeFriend);
router.post("/block/:userId", protectRoute, userIdValidation, blockUser);
router.delete("/block/:userId", protectRoute, userIdValidation, unblockUser);
router.get("/blocked", protectRoute, getBlockedUsers);
router.get("/blocked/:userId", protectRoute, userIdValidation, checkBlockedStatus);

export default router;
