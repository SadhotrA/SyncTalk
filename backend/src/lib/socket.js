import { Server } from "socket.io";
import http from "http";
import express from "express";

const app = express();
const server = http.createServer(app);

const getAllowedOrigins = () => {
  const origins = [
    "http://localhost:5173",
    "http://localhost:3000",
    "http://127.0.0.1:5173",
    "http://127.0.0.1:3000"
  ];
  if (process.env.FRONTEND_URL) {
    origins.push(process.env.FRONTEND_URL);
  }
  return origins;
};

const io = new Server(server, {
  cors: {
    origin: function(origin, callback) {
      const allowedOrigins = getAllowedOrigins();
      
      if (!origin) {
        return callback(null, true);
      }
      
      if (allowedOrigins.includes(origin) || origin.match(/^http:\/\/192\.168\.\d+\.\d+:\d+$/)) {
        callback(null, true);
      } else {
        callback(new Error('Not allowed by CORS'));
      }
    },
    credentials: true,
    methods: ["GET", "POST"]
  },
  pingTimeout: 60000,
  pingInterval: 25000,
  connectTimeout: 10000,
});

export function getReceiverSocketId(userId) {
  return userSocketMap[userId];
}

const userSocketMap = {};

const cleanupStaleConnections = () => {
  const now = Date.now();
  Object.entries(userSocketMap).forEach(([userId, socketId]) => {
    const socket = io.sockets.sockets.get(socketId);
    if (!socket || !socket.connected) {
      delete userSocketMap[userId];
    }
  });
  io.emit("getOnlineUsers", Object.keys(userSocketMap));
};

setInterval(cleanupStaleConnections, 5 * 60 * 1000);

io.on("connection", (socket) => {
  console.log("A user connected", socket.id);

  const userId = socket.handshake.query.userId;
  if (!userId) {
    console.warn("Connection attempt without userId");
    socket.disconnect();
    return;
  }

  if (userSocketMap[userId]) {
    console.log(`User ${userId} reconnected`);
    const oldSocketId = userSocketMap[userId];
    const oldSocket = io.sockets.sockets.get(oldSocketId);
    if (oldSocket) {
      oldSocket.disconnect();
    }
  }

  userSocketMap[userId] = socket.id;
  io.emit("getOnlineUsers", Object.keys(userSocketMap));

  socket.on("joinConversation", (conversationId) => {
    socket.join(`conversation:${conversationId}`);
  });

  socket.on("leaveConversation", (conversationId) => {
    socket.leave(`conversation:${conversationId}`);
  });

  socket.on("typing", ({ conversationId, userId }) => {
    socket.to(`conversation:${conversationId}`).emit("userTyping", { conversationId, userId });
  });

  socket.on("stopTyping", ({ conversationId, userId }) => {
    socket.to(`conversation:${conversationId}`).emit("userStoppedTyping", { conversationId, userId });
  });

  socket.on("markSeen", ({ conversationId, userId }) => {
    socket.to(`conversation:${conversationId}`).emit("messageSeen", { conversationId, userId });
  });

  socket.on("callUser", ({ from, to, callType }) => {
    const receiverSocketId = userSocketMap[to];
    if (receiverSocketId) {
      io.to(receiverSocketId).emit("incomingCall", { from, callType });
    }
  });

  socket.on("answerCall", ({ from, to, callType }) => {
    const receiverSocketId = userSocketMap[from];
    if (receiverSocketId) {
      io.to(receiverSocketId).emit("callAccepted", { callType });
    }
  });

  socket.on("rejectCall", ({ from, to }) => {
    const receiverSocketId = userSocketMap[from];
    if (receiverSocketId) {
      io.to(receiverSocketId).emit("callRejected");
    }
  });

  socket.on("endCall", ({ from, to }) => {
    const receiverSocketId = userSocketMap[to];
    if (receiverSocketId) {
      io.to(receiverSocketId).emit("callEnded");
    }
  });

  socket.on("iceCandidate", ({ from, to, candidate }) => {
    const receiverSocketId = userSocketMap[to];
    if (receiverSocketId) {
      io.to(receiverSocketId).emit("iceCandidate", { from, candidate });
    }
  });

  socket.on("offer", ({ from, to, offer }) => {
    const receiverSocketId = userSocketMap[to];
    if (receiverSocketId) {
      io.to(receiverSocketId).emit("offer", { from, offer });
    }
  });

  socket.on("answer", ({ from, to, answer }) => {
    const receiverSocketId = userSocketMap[to];
    if (receiverSocketId) {
      io.to(receiverSocketId).emit("answer", { from, answer });
    }
  });

  socket.on("error", (error) => {
    console.error("Socket error:", error);
  });

  socket.on("disconnect", (reason) => {
    console.log(`User ${userId} disconnected. Reason: ${reason}`);
    delete userSocketMap[userId];
    io.emit("getOnlineUsers", Object.keys(userSocketMap));
  });
});

server.on("error", (error) => {
  console.error("Server error:", error);
});

export { io, app, server };