import { generateToken, generateTempToken } from "../lib/utils.js";
import User from "../models/user.model.js";
import bcrypt from "bcryptjs";
import cloudinary from "../lib/cloudinary.js";
import speakeasy from "speakeasy";
import QRCode from "qrcode";
import jwt from "jsonwebtoken";

export const signup = async (req, res) => {
  const { fullName, email, password } = req.body;
  try {
    if (!fullName || !email || !password) {
      return res.status(400).json({ message: "All fields are required" });
    }

    if (password.length < 6) {
      return res.status(400).json({ message: "Password must be at least 6 characters" });
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({ message: "Please enter a valid email address" });
    }

    if (fullName.length < 2) {
      return res.status(400).json({ message: "Name must be at least 2 characters" });
    }

    if (fullName.length > 50) {
      return res.status(400).json({ message: "Name must be less than 50 characters" });
    }

    const user = await User.findOne({ email: email.toLowerCase() });

    if (user) return res.status(400).json({ message: "Email already exists" });

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    const newUser = new User({
      fullName,
      email,
      password: hashedPassword,
    });

    if (newUser) {
      // generate jwt token here
      generateToken(newUser._id, res);
      await newUser.save();

      res.status(201).json({
        _id: newUser._id,
        fullName: newUser.fullName,
        email: newUser.email,
        profilePic: newUser.profilePic,
      });
    } else {
      res.status(400).json({ message: "Invalid user data" });
    }
  } catch (error) {
    console.log("Error in signup controller", error.message);
    res.status(500).json({ message: "Internal Server Error" });
  }
};

export const login = async (req, res) => {
  const { email, password } = req.body;
  try {
    const user = await User.findOne({ email: email.toLowerCase() });

    if (!user) {
      return res.status(400).json({ message: "Invalid credentials" });
    }

    const isPasswordCorrect = await bcrypt.compare(password, user.password);
    if (!isPasswordCorrect) {
      return res.status(400).json({ message: "Invalid credentials" });
    }

    if (user.twoFactorEnabled) {
      const tempToken = generateTempToken(user._id);
      return res.status(200).json({
        requires2FA: true,
        tempToken,
        user: {
          _id: user._id,
          fullName: user.fullName,
          email: user.email,
          profilePic: user.profilePic,
        },
      });
    }

    generateToken(user._id, res);

    res.status(200).json({
      _id: user._id,
      fullName: user.fullName,
      email: user.email,
      profilePic: user.profilePic,
    });
  } catch (error) {
    console.log("Error in login controller", error.message);
    res.status(500).json({ message: "Internal Server Error" });
  }
};

export const verify2FALogin = async (req, res) => {
  const { tempToken, token } = req.body;
  try {
    if (!tempToken || !token) {
      return res.status(400).json({ message: "Temp token and 2FA token are required" });
    }

    let decoded;
    try {
      decoded = jwt.verify(tempToken, process.env.JWT_SECRET);
    } catch (err) {
      return res.status(400).json({ message: "Invalid or expired temp token" });
    }

    if (decoded.purpose !== "2fa") {
      return res.status(400).json({ message: "Invalid token purpose" });
    }

    const user = await User.findById(decoded.userId);
    if (!user || !user.twoFactorEnabled || !user.twoFactorSecret) {
      return res.status(400).json({ message: "2FA is not enabled for this account" });
    }

    const verified = speakeasy.totp.verify({
      secret: user.twoFactorSecret,
      encoding: "base32",
      token: token,
      window: 1,
    });

    if (!verified) {
      return res.status(400).json({ message: "Invalid 2FA token" });
    }

    generateToken(user._id, res);

    res.status(200).json({
      _id: user._id,
      fullName: user.fullName,
      email: user.email,
      profilePic: user.profilePic,
    });
  } catch (error) {
    console.log("Error in verify2FALogin controller", error.message);
    res.status(500).json({ message: "Internal Server Error" });
  }
};

export const logout = (req, res) => {
  try {
    res.cookie("jwt", "", { maxAge: 0 });
    res.status(200).json({ message: "Logged out successfully" });
  } catch (error) {
    console.log("Error in logout controller", error.message);
    res.status(500).json({ message: "Internal Server Error" });
  }
};

export const updateProfile = async (req, res) => {
  try {
    const { profilePic } = req.body;
    const userId = req.user._id;

    if (!profilePic) {
      return res.status(400).json({ message: "Profile pic is required" });
    }

    const uploadResponse = await cloudinary.uploader.upload(profilePic);
    const updatedUser = await User.findByIdAndUpdate(
      userId,
      { profilePic: uploadResponse.secure_url },
      { new: true }
    );

    res.status(200).json(updatedUser);
  } catch (error) {
    console.log("error in update profile:", error);
    res.status(500).json({ message: "Internal server error" });
  }
};

export const checkAuth = (req, res) => {
  try {
    res.status(200).json(req.user);
  } catch (error) {
    console.log("Error in checkAuth controller", error.message);
    res.status(500).json({ message: "Internal Server Error" });
  }
};

export const updatePrivacySettings = async (req, res) => {
  try {
    const { lastSeenVisibility, profileVisibility, readReceipts, typingIndicators } = req.body;
    const userId = req.user._id;

    const updates = {};
    if (lastSeenVisibility) updates['privacySettings.lastSeenVisibility'] = lastSeenVisibility;
    if (profileVisibility) updates['privacySettings.profileVisibility'] = profileVisibility;
    if (typeof readReceipts === 'boolean') updates['privacySettings.readReceipts'] = readReceipts;
    if (typeof typingIndicators === 'boolean') updates['privacySettings.typingIndicators'] = typingIndicators;

    const user = await User.findByIdAndUpdate(
      userId,
      { $set: updates },
      { new: true }
    ).select("-password");

    res.status(200).json(user);
  } catch (error) {
    console.log("Error in updatePrivacySettings controller", error.message);
    res.status(500).json({ message: "Internal Server Error" });
  }
};

export const updateNotificationSettings = async (req, res) => {
  try {
    const { pushNotifications, messageSound, groupNotifications, typingIndicator } = req.body;
    const userId = req.user._id;

    const updates = {};
    if (typeof pushNotifications === 'boolean') updates['notificationSettings.pushNotifications'] = pushNotifications;
    if (typeof messageSound === 'boolean') updates['notificationSettings.messageSound'] = messageSound;
    if (typeof groupNotifications === 'boolean') updates['notificationSettings.groupNotifications'] = groupNotifications;
    if (typeof typingIndicator === 'boolean') updates['notificationSettings.typingIndicator'] = typingIndicator;

    const user = await User.findByIdAndUpdate(
      userId,
      { $set: updates },
      { new: true }
    ).select("-password");

    res.status(200).json(user);
  } catch (error) {
    console.log("Error in updateNotificationSettings controller", error.message);
    res.status(500).json({ message: "Internal Server Error" });
  }
};

export const updateChatSettings = async (req, res) => {
  try {
    const { fontSize, enterToSend } = req.body;
    const userId = req.user._id;

    const updates = {};
    if (fontSize) updates['chatSettings.fontSize'] = fontSize;
    if (typeof enterToSend === 'boolean') updates['chatSettings.enterToSend'] = enterToSend;

    const user = await User.findByIdAndUpdate(
      userId,
      { $set: updates },
      { new: true }
    ).select("-password");

    res.status(200).json(user);
  } catch (error) {
    console.log("Error in updateChatSettings controller", error.message);
    res.status(500).json({ message: "Internal Server Error" });
  }
};

export const setup2FA = async (req, res) => {
  try {
    const userId = req.user._id;
    const user = await User.findById(userId);

    if (user.twoFactorEnabled) {
      return res.status(400).json({ message: "2FA is already enabled" });
    }

    const secret = speakeasy.generateSecret({
      name: `SyncTalk (${user.email})`,
      length: 20
    });

    user.twoFactorSecret = secret.base32;
    await user.save();

    const qrCodeUrl = await QRCode.toDataURL(secret.otpauth_url);

    res.status(200).json({
      secret: secret.base32,
      qrCode: qrCodeUrl
    });
  } catch (error) {
    console.log("Error in setup2FA: ", error);
    res.status(500).json({ message: "Internal server error" });
  }
};

export const verify2FA = async (req, res) => {
  try {
    const { token } = req.body;
    const userId = req.user._id;
    const user = await User.findById(userId);

    if (!user.twoFactorSecret) {
      return res.status(400).json({ message: "2FA is not set up" });
    }

    const verified = speakeasy.totp.verify({
      secret: user.twoFactorSecret,
      encoding: "base32",
      token: token,
      window: 1
    });

    if (!verified) {
      return res.status(400).json({ message: "Invalid token" });
    }

    user.twoFactorEnabled = true;
    await user.save();

    res.status(200).json({ message: "2FA enabled successfully" });
  } catch (error) {
    console.log("Error in verify2FA: ", error);
    res.status(500).json({ message: "Internal server error" });
  }
};

export const disable2FA = async (req, res) => {
  try {
    const { token } = req.body;
    const userId = req.user._id;
    const user = await User.findById(userId);

    if (!user.twoFactorEnabled) {
      return res.status(400).json({ message: "2FA is not enabled" });
    }

    const verified = speakeasy.totp.verify({
      secret: user.twoFactorSecret,
      encoding: "base32",
      token: token,
      window: 1
    });

    if (!verified) {
      return res.status(400).json({ message: "Invalid token" });
    }

    user.twoFactorEnabled = false;
    user.twoFactorSecret = null;
    await user.save();

    res.status(200).json({ message: "2FA disabled successfully" });
  } catch (error) {
    console.log("Error in disable2FA: ", error);
    res.status(500).json({ message: "Internal server error" });
  }
};

export const changePassword = async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;
    const userId = req.user._id;
    const user = await User.findById(userId);

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    const isMatch = await bcrypt.compare(currentPassword, user.password);
    if (!isMatch) {
      return res.status(400).json({ message: "Current password is incorrect" });
    }

    if (newPassword.length < 6) {
      return res.status(400).json({ message: "New password must be at least 6 characters" });
    }

    const salt = await bcrypt.genSalt(10);
    user.password = await bcrypt.hash(newPassword, salt);
    await user.save();

    res.status(200).json({ message: "Password changed successfully" });
  } catch (error) {
    console.log("Error in changePassword: ", error);
    res.status(500).json({ message: "Internal server error" });
  }
};

export const exportData = async (req, res) => {
  try {
    const userId = req.user._id;
    const user = await User.findById(userId).select("-password");
    
    const Conversation = (await import("../models/conversation.model.js")).default;
    const Message = (await import("../models/message.model.js")).default;

    const conversations = await Conversation.find({ participants: userId });
    const messages = await Message.find({
      $or: [
        { senderId: userId },
        { conversationId: { $in: conversations.map(c => c._id) } }
      ]
    });

    const exportData = {
      user: user.toObject(),
      conversations: conversations.map(c => c.toObject()),
      messages: messages.map(m => m.toObject()),
      exportedAt: new Date()
    };

    const dataStr = JSON.stringify(exportData, null, 2);
    const buffer = Buffer.from(dataStr, 'utf-8');

    res.setHeader('Content-Type', 'application/json');
    res.setHeader('Content-Disposition', 'attachment; filename=synctalk-data.json');
    res.send(buffer);
  } catch (error) {
    console.log("Error in exportData: ", error);
    res.status(500).json({ message: "Internal server error" });
  }
};