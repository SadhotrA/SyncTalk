import Conversation from "../models/conversation.model.js";
import User from "../models/user.model.js";
import Message from "../models/message.model.js";
import { getReceiverSocketId, io } from "../lib/socket.js";
import cloudinary from "../lib/cloudinary.js";

export const createGroup = async (req, res) => {
  try {
    const { name, avatar, memberIds } = req.body;
    const creatorId = req.user._id;

    if (!name || !memberIds || memberIds.length < 2) {
      return res.status(400).json({ message: "Group name and at least 2 members are required" });
    }

    if (memberIds.length > 100) {
      return res.status(400).json({ message: "Group cannot have more than 100 members" });
    }

    const allMembers = [...new Set([...memberIds, creatorId.toString()])];

    const validMembers = await User.find({ _id: { $in: allMembers } });
    if (validMembers.length !== allMembers.length) {
      return res.status(400).json({ message: "Some users do not exist" });
    }

    let avatarUrl = "";
    if (avatar) {
      const uploadResponse = await cloudinary.uploader.upload(avatar, {
        folder: "group_avatars",
        resource_type: "auto"
      });
      avatarUrl = uploadResponse.secure_url;
    }

    const group = new Conversation({
      name,
      avatar: avatarUrl,
      type: 'group',
      participants: allMembers.map(id => id),
      admin: [creatorId],
      unreadCount: allMembers.map(id => ({ user: id, count: 0 }))
    });

    await group.save();
    await group.populate('participants', 'fullName email profilePic');
    await group.populate('admin', 'fullName email profilePic');

    allMembers.forEach(memberId => {
      const socketId = getReceiverSocketId(memberId);
      if (socketId) {
        io.to(socketId).emit("groupCreated", group);
      }
    });

    res.status(201).json(group);
  } catch (error) {
    console.error("Error in createGroup: ", error);
    res.status(500).json({ message: "Internal server error" });
  }
};

export const getConversations = async (req, res) => {
  try {
    const userId = req.user._id;

    const conversations = await Conversation.find({
      participants: userId
    }).populate('participants', 'fullName email profilePic lastSeen')
      .populate('admin', 'fullName email profilePic')
      .sort({ updatedAt: -1 });

    const conversationsWithUnread = conversations.map(conv => {
      const unreadData = conv.unreadCount.find(u => u.user.toString() === userId.toString());
      return {
        ...conv.toObject(),
        unreadCount: unreadData ? unreadData.count : 0
      };
    });

    res.status(200).json(conversationsWithUnread);
  } catch (error) {
    console.error("Error in getConversations: ", error);
    res.status(500).json({ message: "Internal server error" });
  }
};

export const getConversation = async (req, res) => {
  try {
    const { conversationId } = req.params;
    const userId = req.user._id;

    const conversation = await Conversation.findById(conversationId)
      .populate('participants', 'fullName email profilePic lastSeen')
      .populate('admin', 'fullName email profilePic');

    if (!conversation) {
      return res.status(404).json({ message: "Conversation not found" });
    }

    if (!conversation.participants.some(p => p._id.toString() === userId.toString())) {
      return res.status(403).json({ message: "Not authorized to view this conversation" });
    }

    res.status(200).json(conversation);
  } catch (error) {
    console.error("Error in getConversation: ", error);
    res.status(500).json({ message: "Internal server error" });
  }
};

export const addMembers = async (req, res) => {
  try {
    const { conversationId } = req.params;
    const { memberIds } = req.body;
    const userId = req.user._id;

    const conversation = await Conversation.findById(conversationId);
    if (!conversation) {
      return res.status(404).json({ message: "Conversation not found" });
    }

    if (!conversation.admin.some(a => a.toString() === userId.toString())) {
      return res.status(403).json({ message: "Only admins can add members" });
    }

    if (conversation.type !== 'group') {
      return res.status(400).json({ message: "Cannot add members to direct conversation" });
    }

    const newMembers = memberIds.filter(id => !conversation.participants.includes(id));
    if (newMembers.length === 0) {
      return res.status(400).json({ message: "All members already in group" });
    }

    const validUsers = await User.find({ _id: { $in: newMembers } });
    if (validUsers.length !== newMembers.length) {
      return res.status(400).json({ message: "Some users do not exist" });
    }

    conversation.participants.push(...newMembers);
    conversation.unreadCount.push(...newMembers.map(id => ({ user: id, count: 0 })));
    await conversation.save();

    await conversation.populate('participants', 'fullName email profilePic');

    conversation.participants.forEach(member => {
      const socketId = getReceiverSocketId(member._id.toString());
      if (socketId) {
        io.to(socketId).emit("membersAdded", { conversationId, newMembers: validUsers });
      }
    });

    res.status(200).json({ message: "Members added successfully", conversation });
  } catch (error) {
    console.error("Error in addMembers: ", error);
    res.status(500).json({ message: "Internal server error" });
  }
};

export const removeMember = async (req, res) => {
  try {
    const { conversationId, memberId } = req.params;
    const userId = req.user._id;

    const conversation = await Conversation.findById(conversationId);
    if (!conversation) {
      return res.status(404).json({ message: "Conversation not found" });
    }

    const isAdmin = conversation.admin.some(a => a.toString() === userId.toString());
    const isSelf = memberId === userId.toString();

    if (!isAdmin && !isSelf) {
      return res.status(403).json({ message: "Not authorized to remove this member" });
    }

    if (conversation.type !== 'group') {
      return res.status(400).json({ message: "Cannot remove members from direct conversation" });
    }

    if (conversation.admin.includes(memberId) && !isSelf) {
      return res.status(400).json({ message: "Cannot remove an admin" });
    }

    conversation.participants = conversation.participants.filter(p => p.toString() !== memberId);
    conversation.unreadCount = conversation.unreadCount.filter(u => u.user.toString() !== memberId);
    await conversation.save();

    const socketId = getReceiverSocketId(memberId);
    if (socketId) {
      io.to(socketId).emit("removedFromGroup", { conversationId });
    }

    res.status(200).json({ message: "Member removed" });
  } catch (error) {
    console.error("Error in removeMember: ", error);
    res.status(500).json({ message: "Internal server error" });
  }
};

export const leaveGroup = async (req, res) => {
  try {
    const { conversationId } = req.params;
    const userId = req.user._id;

    const conversation = await Conversation.findById(conversationId);
    if (!conversation) {
      return res.status(404).json({ message: "Conversation not found" });
    }

    if (!conversation.participants.includes(userId)) {
      return res.status(400).json({ message: "You are not a member of this group" });
    }

    if (conversation.type !== 'group') {
      return res.status(400).json({ message: "Cannot leave direct conversation" });
    }

    conversation.participants = conversation.participants.filter(p => p.toString() !== userId.toString());
    conversation.unreadCount = conversation.unreadCount.filter(u => u.user.toString() !== userId.toString());
    
    if (conversation.admin.includes(userId)) {
      conversation.admin = conversation.admin.filter(a => a.toString() !== userId.toString());
      if (conversation.admin.length === 0 && conversation.participants.length > 0) {
        conversation.admin = [conversation.participants[0]];
      }
    }

    await conversation.save();

    const remainingParticipants = await User.find({ _id: { $in: conversation.participants } });
    remainingParticipants.forEach(member => {
      const socketId = getReceiverSocketId(member._id.toString());
      if (socketId) {
        io.to(socketId).emit("memberLeft", { conversationId, userId });
      }
    });

    res.status(200).json({ message: "Left the group" });
  } catch (error) {
    console.error("Error in leaveGroup: ", error);
    res.status(500).json({ message: "Internal server error" });
  }
};

export const updateGroup = async (req, res) => {
  try {
    const { conversationId } = req.params;
    const { name, avatar } = req.body;
    const userId = req.user._id;

    const conversation = await Conversation.findById(conversationId);
    if (!conversation) {
      return res.status(404).json({ message: "Conversation not found" });
    }

    if (!conversation.admin.some(a => a.toString() === userId.toString())) {
      return res.status(403).json({ message: "Only admins can update group" });
    }

    if (name) conversation.name = name;
    
    if (avatar) {
      const uploadResponse = await cloudinary.uploader.upload(avatar, {
        folder: "group_avatars",
        resource_type: "auto"
      });
      conversation.avatar = uploadResponse.secure_url;
    }

    await conversation.save();
    await conversation.populate('participants', 'fullName email profilePic');

    conversation.participants.forEach(member => {
      const socketId = getReceiverSocketId(member._id.toString());
      if (socketId) {
        io.to(socketId).emit("groupUpdated", conversation);
      }
    });

    res.status(200).json(conversation);
  } catch (error) {
    console.error("Error in updateGroup: ", error);
    res.status(500).json({ message: "Internal server error" });
  }
};

export const makeAdmin = async (req, res) => {
  try {
    const { conversationId, memberId } = req.params;
    const userId = req.user._id;

    const conversation = await Conversation.findById(conversationId);
    if (!conversation) {
      return res.status(404).json({ message: "Conversation not found" });
    }

    if (!conversation.admin.some(a => a.toString() === userId.toString())) {
      return res.status(403).json({ message: "Only admins can promote members" });
    }

    if (!conversation.participants.includes(memberId)) {
      return res.status(400).json({ message: "User is not a member of this group" });
    }

    if (conversation.admin.includes(memberId)) {
      return res.status(400).json({ message: "User is already an admin" });
    }

    conversation.admin.push(memberId);
    await conversation.save();

    await conversation.populate('participants', 'fullName email profilePic');

    const memberSocketId = getReceiverSocketId(memberId);
    if (memberSocketId) {
      io.to(memberSocketId).emit("madeAdmin", { conversationId });
    }

    res.status(200).json({ message: "User promoted to admin" });
  } catch (error) {
    console.error("Error in makeAdmin: ", error);
    res.status(500).json({ message: "Internal server error" });
  }
};

export const getGroupInfo = async (req, res) => {
  try {
    const { conversationId } = req.params;
    const userId = req.user._id;

    const conversation = await Conversation.findById(conversationId)
      .populate('participants', 'fullName email profilePic lastSeen')
      .populate('admin', 'fullName email profilePic');

    if (!conversation) {
      return res.status(404).json({ message: "Conversation not found" });
    }

    if (!conversation.participants.some(p => p._id.toString() === userId.toString())) {
      return res.status(403).json({ message: "Not authorized to view this group" });
    }

    const messagesCount = await Message.countDocuments({ conversationId });
    
    res.status(200).json({
      ...conversation.toObject(),
      messagesCount
    });
  } catch (error) {
    console.error("Error in getGroupInfo: ", error);
    res.status(500).json({ message: "Internal server error" });
  }
};