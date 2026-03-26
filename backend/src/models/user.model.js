import mongoose from "mongoose";

const userSchema = new mongoose.Schema(
  {
    email: {
      type: String,
      required: true,
      unique: true,
    },
    fullName: {
      type: String,
      required: true,
    },
    password: {
      type: String,
      required: true,
      minlength: 6,
    },
    profilePic: {
      type: String,
      default: "",
    },
    friends: [{
      type: mongoose.Schema.Types.ObjectId,
      ref: "User"
    }],
    blockedUsers: [{
      type: mongoose.Schema.Types.ObjectId,
      ref: "User"
    }],
    privacySettings: {
      lastSeenVisibility: {
        type: String,
        enum: ['everyone', 'friends', 'none'],
        default: 'friends'
      },
      profileVisibility: {
        type: String,
        enum: ['everyone', 'friends', 'none'],
        default: 'friends'
      },
      readReceipts: {
        type: Boolean,
        default: true
      },
      typingIndicators: {
        type: Boolean,
        default: true
      }
    },
    twoFactorEnabled: {
      type: Boolean,
      default: false
    },
    twoFactorSecret: {
      type: String,
      default: null
    },
    lastSeen: {
      type: Date,
      default: Date.now
    }
  },
  { timestamps: true }
);

const User = mongoose.model("User", userSchema);

export default User;