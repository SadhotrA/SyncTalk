import User from "../models/user.model.js";
import FriendRequest from "../models/friendRequest.model.js";
import { getReceiverSocketId, io } from "../lib/socket.js";

export const searchUsers = async (req, res) => {
  try {
    const { query } = req.query;
    const currentUserId = req.user._id;

    if (!query || query.length < 2) {
      return res.status(400).json({ message: "Search query must be at least 2 characters" });
    }

    const users = await User.find({
      _id: { $ne: currentUserId },
      $or: [
        { fullName: { $regex: query, $options: 'i' } },
        { email: { $regex: query, $options: 'i' } }
      ]
    }).select("-password");

    const usersWithStatus = await Promise.all(users.map(async (user) => {
      const currentUser = await User.findById(currentUserId);
      const isFriend = currentUser.friends.includes(user._id);
      const isBlocked = currentUser.blockedUsers.includes(user._id);
      const pendingRequest = await FriendRequest.findOne({
        $or: [
          { sender: currentUserId, receiver: user._id },
          { sender: user._id, receiver: currentUserId }
        ],
        status: 'pending'
      });

      return {
        ...user.toObject(),
        isFriend,
        isBlocked,
        requestStatus: pendingRequest ? pendingRequest.status : null,
        requestSent: pendingRequest?.sender?.toString() === currentUserId.toString()
      };
    }));

    res.status(200).json(usersWithStatus);
  } catch (error) {
    console.error("Error in searchUsers: ", error);
    res.status(500).json({ message: "Internal server error" });
  }
};

export const sendFriendRequest = async (req, res) => {
  try {
    const { userId } = req.params;
    const senderId = req.user._id;

    if (userId === senderId.toString()) {
      return res.status(400).json({ message: "You cannot send friend request to yourself" });
    }

    const receiver = await User.findById(userId);
    if (!receiver) {
      return res.status(404).json({ message: "User not found" });
    }

    const sender = await User.findById(senderId);
    if (sender.blockedUsers.includes(userId)) {
      return res.status(400).json({ message: "You have blocked this user" });
    }
    if (receiver.blockedUsers.includes(senderId)) {
      return res.status(400).json({ message: "You are blocked by this user" });
    }
    if (sender.friends.includes(userId)) {
      return res.status(400).json({ message: "User is already your friend" });
    }

    const existingRequest = await FriendRequest.findOne({
      $or: [
        { sender: senderId, receiver: userId },
        { sender: userId, receiver: senderId }
      ]
    });

    if (existingRequest) {
      if (existingRequest.status === 'pending') {
        return res.status(400).json({ message: "Friend request already exists" });
      }
      if (existingRequest.status === 'accepted') {
        return res.status(400).json({ message: "You are already friends" });
      }
      if (existingRequest.status === 'rejected') {
        existingRequest.status = 'pending';
        existingRequest.sender = senderId;
        existingRequest.receiver = userId;
        await existingRequest.save();
      }
    } else {
      const newRequest = new FriendRequest({
        sender: senderId,
        receiver: userId
      });
      await newRequest.save();
    }

    const receiverSocketId = getReceiverSocketId(userId);
    if (receiverSocketId) {
      io.to(receiverSocketId).emit("friendRequestReceived", { senderId });
    }

    res.status(200).json({ message: "Friend request sent" });
  } catch (error) {
    console.error("Error in sendFriendRequest: ", error);
    res.status(500).json({ message: "Internal server error" });
  }
};

export const acceptFriendRequest = async (req, res) => {
  try {
    const { requestId } = req.params;
    const userId = req.user._id;

    const request = await FriendRequest.findById(requestId);
    if (!request) {
      return res.status(404).json({ message: "Friend request not found" });
    }

    if (request.receiver.toString() !== userId.toString()) {
      return res.status(403).json({ message: "Not authorized to accept this request" });
    }

    if (request.status !== 'pending') {
      return res.status(400).json({ message: "Request is not pending" });
    }

    request.status = 'accepted';
    await request.save();

    await User.findByIdAndUpdate(request.sender, { $addToSet: { friends: request.receiver } });
    await User.findByIdAndUpdate(request.receiver, { $addToSet: { friends: request.sender } });

    const senderSocketId = getReceiverSocketId(request.sender);
    if (senderSocketId) {
      io.to(senderSocketId).emit("friendRequestAccepted", { userId: request.receiver });
    }

    res.status(200).json({ message: "Friend request accepted" });
  } catch (error) {
    console.error("Error in acceptFriendRequest: ", error);
    res.status(500).json({ message: "Internal server error" });
  }
};

export const rejectFriendRequest = async (req, res) => {
  try {
    const { requestId } = req.params;
    const userId = req.user._id;

    const request = await FriendRequest.findById(requestId);
    if (!request) {
      return res.status(404).json({ message: "Friend request not found" });
    }

    if (request.receiver.toString() !== userId.toString()) {
      return res.status(403).json({ message: "Not authorized to reject this request" });
    }

    request.status = 'rejected';
    await request.save();

    res.status(200).json({ message: "Friend request rejected" });
  } catch (error) {
    console.error("Error in rejectFriendRequest: ", error);
    res.status(500).json({ message: "Internal server error" });
  }
};

export const getFriendRequests = async (req, res) => {
  try {
    const userId = req.user._id;

    const requests = await FriendRequest.find({
      receiver: userId,
      status: 'pending'
    }).populate('sender', 'fullName email profilePic').sort({ createdAt: -1 });

    res.status(200).json(requests);
  } catch (error) {
    console.error("Error in getFriendRequests: ", error);
    res.status(500).json({ message: "Internal server error" });
  }
};

export const getFriends = async (req, res) => {
  try {
    const userId = req.user._id;
    const user = await User.findById(userId).populate('friends', 'fullName email profilePic lastSeen');

    res.status(200).json(user.friends);
  } catch (error) {
    console.error("Error in getFriends: ", error);
    res.status(500).json({ message: "Internal server error" });
  }
};

export const removeFriend = async (req, res) => {
  try {
    const { friendId } = req.params;
    const userId = req.user._id;

    await User.findByIdAndUpdate(userId, { $pull: { friends: friendId } });
    await User.findByIdAndUpdate(friendId, { $pull: { friends: userId } });

    await FriendRequest.deleteOne({
      $or: [
        { sender: userId, receiver: friendId },
        { sender: friendId, receiver: userId }
      ]
    });

    res.status(200).json({ message: "Friend removed" });
  } catch (error) {
    console.error("Error in removeFriend: ", error);
    res.status(500).json({ message: "Internal server error" });
  }
};

export const blockUser = async (req, res) => {
  try {
    const { userId } = req.params;
    const currentUserId = req.user._id;

    if (userId === currentUserId.toString()) {
      return res.status(400).json({ message: "You cannot block yourself" });
    }

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    await User.findByIdAndUpdate(currentUserId, {
      $addToSet: { blockedUsers: userId },
      $pull: { friends: userId }
    });

    await User.findByIdAndUpdate(userId, { $pull: { friends: currentUserId } });

    await FriendRequest.deleteOne({
      $or: [
        { sender: currentUserId, receiver: userId },
        { sender: userId, receiver: currentUserId }
      ]
    });

    res.status(200).json({ message: "User blocked" });
  } catch (error) {
    console.error("Error in blockUser: ", error);
    res.status(500).json({ message: "Internal server error" });
  }
};

export const unblockUser = async (req, res) => {
  try {
    const { userId } = req.params;
    const currentUserId = req.user._id;

    await User.findByIdAndUpdate(currentUserId, { $pull: { blockedUsers: userId } });

    res.status(200).json({ message: "User unblocked" });
  } catch (error) {
    console.error("Error in unblockUser: ", error);
    res.status(500).json({ message: "Internal server error" });
  }
};

export const getBlockedUsers = async (req, res) => {
  try {
    const user = await User.findById(req.user._id).populate('blockedUsers', 'fullName email profilePic');
    res.status(200).json(user.blockedUsers);
  } catch (error) {
    console.error("Error in getBlockedUsers: ", error);
    res.status(500).json({ message: "Internal server error" });
  }
};

export const cancelFriendRequest = async (req, res) => {
  try {
    const { userId } = req.params;
    const currentUserId = req.user._id;

    await FriendRequest.findOneAndDelete({
      sender: currentUserId,
      receiver: userId,
      status: 'pending'
    });

    res.status(200).json({ message: "Friend request cancelled" });
  } catch (error) {
    console.error("Error in cancelFriendRequest: ", error);
    res.status(500).json({ message: "Internal server error" });
  }
};

export const checkBlockedStatus = async (req, res) => {
  try {
    const { userId } = req.params;
    const currentUserId = req.user._id;

    const currentUser = await User.findById(currentUserId);
    const isBlocked = currentUser.blockedUsers.includes(userId);
    
    const otherUser = await User.findById(userId);
    const amIBlocked = otherUser?.blockedUsers.includes(currentUserId);

    res.status(200).json({ 
      isBlocked, 
      amIBlocked 
    });
  } catch (error) {
    console.error("Error in checkBlockedStatus: ", error);
    res.status(500).json({ message: "Internal server error" });
  }
};