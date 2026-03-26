import User from "../models/user.model.js";
import Message from "../models/message.model.js";
import Conversation from "../models/conversation.model.js";
import cloudinary from "../lib/cloudinary.js";
import { getReceiverSocketId, io } from "../lib/socket.js";

export const getConversationsForSidebar = async (req, res) => {
  try {
    const userId = req.user._id;
    
    const conversations = await Conversation.find({
      participants: userId
    }).populate('participants', 'fullName email profilePic lastSeen')
      .sort({ updatedAt: -1 });

    const conversationData = await Promise.all(conversations.map(async (conv) => {
      let otherParticipant = null;
      
      if (conv.type === 'direct') {
        otherParticipant = conv.participants.find(
          p => p._id.toString() !== userId.toString()
        );
      }

      const lastMessage = await Message.findOne({
        conversationId: conv._id,
        deletedFor: { $ne: userId }
      }).sort({ createdAt: -1 });

      const unreadData = conv.unreadCount.find(
        u => u.user.toString() === userId.toString()
      );

      return {
        _id: conv._id,
        type: conv.type,
        name: conv.type === 'group' ? conv.name : (otherParticipant?.fullName || 'Unknown'),
        avatar: conv.type === 'group' ? conv.avatar : (otherParticipant?.profilePic || ''),
        participants: conv.participants,
        lastMessage: lastMessage ? {
          text: lastMessage.text,
          image: lastMessage.image,
          sender: lastMessage.senderId,
          createdAt: lastMessage.createdAt
        } : null,
        unreadCount: unreadData ? unreadData.count : 0,
        updatedAt: conv.updatedAt,
        mutedBy: conv.mutedBy
      };
    }));

    res.status(200).json(conversationData);
  } catch (error) {
    console.error("Error in getConversationsForSidebar: ", error);
    res.status(500).json({ error: "Internal server error" });
  }
};

export const getOrCreateConversation = async (req, res) => {
  try {
    const { userId } = req.params;
    const currentUserId = req.user._id;

    if (userId === currentUserId.toString()) {
      return res.status(400).json({ message: "Cannot create conversation with yourself" });
    }

    const receiver = await User.findById(userId);
    if (!receiver) {
      return res.status(404).json({ message: "User not found" });
    }

    let conversation = await Conversation.findOne({
      type: 'direct',
      participants: { $all: [currentUserId, userId] }
    }).populate('participants', 'fullName email profilePic lastSeen');

    if (!conversation) {
      conversation = new Conversation({
        type: 'direct',
        participants: [currentUserId, userId],
        unreadCount: [
          { user: currentUserId, count: 0 },
          { user: userId, count: 0 }
        ],
        mutedBy: []
      });
      await conversation.save();
      await conversation.populate('participants', 'fullName email profilePic lastSeen');
    }

    res.status(200).json({ ...conversation.toObject(), mutedBy: conversation.mutedBy });
  } catch (error) {
    console.error("Error in getOrCreateConversation: ", error);
    res.status(500).json({ error: "Internal server error" });
  }
};

export const getMessages = async (req, res) => {
  try {
    const { conversationId } = req.params;
    const userId = req.user._id;

    const conversation = await Conversation.findById(conversationId);
    if (!conversation) {
      return res.status(404).json({ message: "Conversation not found" });
    }

    if (!conversation.participants.includes(userId)) {
      return res.status(403).json({ message: "Not authorized" });
    }

    const messages = await Message.find({
      conversationId,
      deletedFor: { $ne: userId }
    })
    .populate('senderId', 'fullName email profilePic')
    .populate('replyTo')
    .sort({ createdAt: 1 });

    await Message.updateMany(
      { 
        conversationId, 
        'status': { $ne: 'seen' }
      },
      { 
        $set: { status: 'delivered' }
      }
    );

    const unseenMessages = messages.filter(
      m => m.senderId._id.toString() !== userId.toString() && m.status !== 'seen'
    );

    if (unseenMessages.length > 0) {
      await Message.updateMany(
        { 
          conversationId, 
          senderId: { $ne: userId },
          status: { $ne: 'seen' }
        },
        { $set: { status: 'delivered' } }
      );

      conversation.participants.forEach(participantId => {
        const socketId = getReceiverSocketId(participantId.toString());
        if (socketId && participantId.toString() !== userId.toString()) {
          io.to(socketId).emit("messagesDelivered", { conversationId });
        }
      });
    }

    res.status(200).json(messages);
  } catch (error) {
    console.error("Error in getMessages controller: ", error);
    res.status(500).json({ error: "Internal server error" });
  }
};

export const sendMessage = async (req, res) => {
  try {
    const { conversationId } = req.params;
    const { text, image, voiceMessage, file, replyTo } = req.body;
    const senderId = req.user._id;

    const conversation = await Conversation.findById(conversationId);
    if (!conversation) {
      return res.status(404).json({ message: "Conversation not found" });
    }

    if (!conversation.participants.includes(senderId)) {
      return res.status(403).json({ message: "Not authorized" });
    }

    let imageUrl = "";
    let voiceUrl = "";
    let fileData = null;

    if (image) {
      const uploadResponse = await cloudinary.uploader.upload(image, {
        folder: "chat_images",
        resource_type: "auto",
        max_size: 5242880
      });
      imageUrl = uploadResponse.secure_url;
    }

    if (voiceMessage) {
      const uploadResponse = await cloudinary.uploader.upload(voiceMessage, {
        folder: "voice_messages",
        resource_type: "video"
      });
      voiceUrl = uploadResponse.secure_url;
    }

    if (file) {
      const uploadResponse = await cloudinary.uploader.upload(file, {
        folder: "chat_files",
        resource_type: "auto",
        max_size: 10485760
      });
      fileData = {
        url: uploadResponse.secure_url,
        name: file.name || "file",
        size: file.size || 0,
        type: file.type || "application/octet-stream"
      };
    }

    const newMessage = new Message({
      conversationId,
      senderId,
      text: text || "",
      image: imageUrl,
      voiceMessage: voiceUrl,
      file: fileData,
      replyTo: replyTo || null
    });

    const savedMessage = await newMessage.save();
    await savedMessage.populate('senderId', 'fullName email profilePic');
    if (replyTo) {
      await savedMessage.populate('replyTo');
    }

    let lastMessageText = text;
    if (!lastMessageText && imageUrl) lastMessageText = "Image";
    if (!lastMessageText && voiceUrl) lastMessageText = "Voice message";
    if (!lastMessageText && fileData) lastMessageText = "File";
    
    conversation.lastMessage = {
      text: lastMessageText,
      sender: senderId,
      createdAt: new Date()
    };
    conversation.updatedAt = new Date();

    conversation.unreadCount.forEach(u => {
      if (u.user.toString() !== senderId.toString()) {
        u.count += 1;
      }
    });
    await conversation.save();

    conversation.participants.forEach(participantId => {
      const socketId = getReceiverSocketId(participantId.toString());
      if (socketId) {
        io.to(socketId).emit("newMessage", {
          message: savedMessage,
          conversationId
        });
      }
    });

    res.status(201).json(savedMessage);
  } catch (error) {
    console.error("Error in sendMessage controller: ", error);
    res.status(500).json({ error: "Internal server error" });
  }
};

export const addReaction = async (req, res) => {
  try {
    const { messageId } = req.params;
    const { emoji } = req.body;
    const userId = req.user._id;

    const message = await Message.findById(messageId);
    if (!message) {
      return res.status(404).json({ message: "Message not found" });
    }

    const existingReaction = message.reactions.find(
      r => r.user.toString() === userId.toString()
    );

    if (existingReaction) {
      if (existingReaction.emoji === emoji) {
        message.reactions = message.reactions.filter(r => r.user.toString() !== userId.toString());
      } else {
        existingReaction.emoji = emoji;
      }
    } else {
      message.reactions.push({ user: userId, emoji });
    }

    await message.save();
    await message.populate('reactions.user', 'fullName profilePic');

    const conversation = await Conversation.findById(message.conversationId);
    conversation.participants.forEach(participantId => {
      const socketId = getReceiverSocketId(participantId.toString());
      if (socketId) {
        io.to(socketId).emit("messageReaction", { messageId, reactions: message.reactions });
      }
    });

    res.status(200).json(message.reactions);
  } catch (error) {
    console.error("Error in addReaction: ", error);
    res.status(500).json({ message: "Internal server error" });
  }
};

export const editMessage = async (req, res) => {
  try {
    const { messageId } = req.params;
    const { text } = req.body;
    const userId = req.user._id;

    const message = await Message.findById(messageId);
    if (!message) {
      return res.status(404).json({ message: "Message not found" });
    }

    if (message.senderId.toString() !== userId.toString()) {
      return res.status(403).json({ message: "Not authorized to edit this message" });
    }

    const timeDiff = Date.now() - message.createdAt.getTime();
    if (timeDiff > 15 * 60 * 1000) {
      return res.status(400).json({ message: "Cannot edit message after 15 minutes" });
    }

    message.text = text;
    message.edited = true;
    message.editedAt = new Date();
    await message.save();
    await message.populate('senderId', 'fullName email profilePic');

    const conversation = await Conversation.findById(message.conversationId);
    conversation.participants.forEach(participantId => {
      const socketId = getReceiverSocketId(participantId.toString());
      if (socketId) {
        io.to(socketId).emit("messageEdited", message);
      }
    });

    res.status(200).json(message);
  } catch (error) {
    console.error("Error in editMessage: ", error);
    res.status(500).json({ message: "Internal server error" });
  }
};

export const deleteMessage = async (req, res) => {
  try {
    const { messageId } = req.params;
    const { deleteForEveryone } = req.body;
    const userId = req.user._id;

    const message = await Message.findById(messageId);
    if (!message) {
      return res.status(404).json({ message: "Message not found" });
    }

    if (deleteForEveryone) {
      if (message.senderId.toString() !== userId.toString()) {
        return res.status(403).json({ message: "Not authorized to delete this message" });
      }

      const timeDiff = Date.now() - message.createdAt.getTime();
      if (timeDiff > 15 * 60 * 1000) {
        return res.status(400).json({ message: "Cannot delete message after 15 minutes" });
      }

      message.text = "";
      message.image = "";
      message.voiceMessage = "";
      message.file = null;
      message.isDeleted = true;
      await message.save();
    } else {
      if (!message.deletedFor.includes(userId)) {
        message.deletedFor.push(userId);
        await message.save();
      }
    }

    const conversation = await Conversation.findById(message.conversationId);
    conversation.participants.forEach(participantId => {
      const socketId = getReceiverSocketId(participantId.toString());
      if (socketId) {
        io.to(socketId).emit("messageDeleted", { messageId, deleteForEveryone });
      }
    });

    res.status(200).json({ message: "Message deleted" });
  } catch (error) {
    console.error("Error in deleteMessage: ", error);
    res.status(500).json({ message: "Internal server error" });
  }
};

export const markAsSeen = async (req, res) => {
  try {
    const { conversationId } = req.params;
    const userId = req.user._id;

    const conversation = await Conversation.findById(conversationId);
    if (!conversation) {
      return res.status(404).json({ message: "Conversation not found" });
    }

    if (!conversation.participants.includes(userId)) {
      return res.status(403).json({ message: "Not authorized" });
    }

    await Message.updateMany(
      { 
        conversationId, 
        senderId: { $ne: userId },
        status: { $ne: 'seen' }
      },
      { $set: { status: 'seen' } }
    );

    const unreadData = conversation.unreadCount.find(
      u => u.user.toString() === userId.toString()
    );
    if (unreadData) {
      unreadData.count = 0;
      await conversation.save();
    }

    conversation.participants.forEach(participantId => {
      const socketId = getReceiverSocketId(participantId.toString());
      if (socketId && participantId.toString() !== userId.toString()) {
        io.to(socketId).emit("messagesSeen", { conversationId, userId });
      }
    });

    res.status(200).json({ message: "Marked as seen" });
  } catch (error) {
    console.error("Error in markAsSeen: ", error);
    res.status(500).json({ message: "Internal server error" });
  }
};

export const searchMessages = async (req, res) => {
  try {
    const { conversationId } = req.params;
    const { query } = req.query;
    const userId = req.user._id;

    const conversation = await Conversation.findById(conversationId);
    if (!conversation) {
      return res.status(404).json({ message: "Conversation not found" });
    }

    if (!conversation.participants.includes(userId)) {
      return res.status(403).json({ message: "Not authorized" });
    }

    const messages = await Message.find({
      conversationId,
      deletedFor: { $ne: userId },
      text: { $regex: query, $options: 'i' }
    })
    .populate('senderId', 'fullName profilePic')
    .sort({ createdAt: -1 })
    .limit(50);

    res.status(200).json(messages);
  } catch (error) {
    console.error("Error in searchMessages: ", error);
    res.status(500).json({ message: "Internal server error" });
  }
};

export const getMedia = async (req, res) => {
  try {
    const { conversationId } = req.params;
    const userId = req.user._id;

    const conversation = await Conversation.findById(conversationId);
    if (!conversation) {
      return res.status(404).json({ message: "Conversation not found" });
    }

    if (!conversation.participants.includes(userId)) {
      return res.status(403).json({ message: "Not authorized" });
    }

    const media = await Message.find({
      conversationId,
      deletedFor: { $ne: userId },
      $or: [{ image: { $exists: true, $ne: "" } }, { file: { $exists: true, $ne: null } }]
    })
    .select('image file createdAt senderId')
    .populate('senderId', 'fullName')
    .sort({ createdAt: -1 })
    .limit(100);

    res.status(200).json(media);
  } catch (error) {
    console.error("Error in getMedia: ", error);
    res.status(500).json({ message: "Internal server error" });
  }
};

export const clearChat = async (req, res) => {
  try {
    const { conversationId } = req.params;
    const userId = req.user._id;

    const conversation = await Conversation.findById(conversationId);
    if (!conversation) {
      return res.status(404).json({ message: "Conversation not found" });
    }

    if (!conversation.participants.includes(userId)) {
      return res.status(403).json({ message: "Not authorized" });
    }

    await Message.updateMany(
      { conversationId },
      { $addToSet: { deletedFor: userId } }
    );

    res.status(200).json({ message: "Chat cleared" });
  } catch (error) {
    console.error("Error in clearChat: ", error);
    res.status(500).json({ message: "Internal server error" });
  }
};

export const toggleMuteConversation = async (req, res) => {
  try {
    const { conversationId } = req.params;
    const { duration } = req.body;
    const userId = req.user._id;

    const conversation = await Conversation.findById(conversationId);
    if (!conversation) {
      return res.status(404).json({ message: "Conversation not found" });
    }

    if (!conversation.participants.includes(userId)) {
      return res.status(403).json({ message: "Not authorized" });
    }

    const existingMute = conversation.mutedBy.find(m => m.user.toString() === userId.toString());
    
    if (existingMute) {
      conversation.mutedBy = conversation.mutedBy.filter(m => m.user.toString() !== userId.toString());
      await conversation.save();
      res.status(200).json({ muted: false });
    } else {
      let until = null;
      if (duration === '1h') until = new Date(Date.now() + 60 * 60 * 1000);
      else if (duration === '24h') until = new Date(Date.now() + 24 * 60 * 60 * 1000);
      else if (duration === '7d') until = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
      
      conversation.mutedBy.push({ user: userId, until });
      await conversation.save();
      res.status(200).json({ muted: true, until });
    }
  } catch (error) {
    console.error("Error in toggleMuteConversation: ", error);
    res.status(500).json({ message: "Internal server error" });
  }
};

export const forwardMessage = async (req, res) => {
  try {
    const { messageId } = req.params;
    const { conversationIds } = req.body;
    const userId = req.user._id;

    const originalMessage = await Message.findById(messageId);
    if (!originalMessage) {
      return res.status(404).json({ message: "Message not found" });
    }

    const newMessages = [];
    for (const conversationId of conversationIds) {
      const conversation = await Conversation.findById(conversationId);
      if (!conversation || !conversation.participants.includes(userId)) continue;

      const newMessage = new Message({
        conversationId,
        senderId: userId,
        text: originalMessage.text,
        image: originalMessage.image,
        forwardFrom: messageId
      });

      await newMessage.save();
      newMessages.push(newMessage);

      conversation.lastMessage = {
        text: originalMessage.text || "Forwarded image",
        sender: userId,
        createdAt: new Date()
      };
      conversation.updatedAt = new Date();
      conversation.unreadCount.forEach(u => {
        if (u.user.toString() !== userId.toString()) u.count += 1;
      });
      await conversation.save();
    }

    res.status(201).json(newMessages);
  } catch (error) {
    console.error("Error in forwardMessage: ", error);
    res.status(500).json({ message: "Internal server error" });
  }
};