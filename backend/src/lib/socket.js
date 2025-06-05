import { Server } from "socket.io";
import http from "http";
import express from "express";

const app = express();
const server = http.createServer(app);

const io = new Server(server, {
  cors: {
    origin: process.env.FRONTEND_URL || "http://localhost:5173",
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

// used to store online users
const userSocketMap = {}; // {userId: socketId}

// Cleanup function to remove stale connections
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

// Run cleanup every 5 minutes
setInterval(cleanupStaleConnections, 5 * 60 * 1000);

io.on("connection", (socket) => {
  console.log("A user connected", socket.id);

  const userId = socket.handshake.query.userId;
  if (!userId) {
    console.warn("Connection attempt without userId");
    socket.disconnect();
    return;
  }

  // Handle reconnection
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

  // Handle errors
  socket.on("error", (error) => {
    console.error("Socket error:", error);
  });

  socket.on("disconnect", (reason) => {
    console.log(`User ${userId} disconnected. Reason: ${reason}`);
    delete userSocketMap[userId];
    io.emit("getOnlineUsers", Object.keys(userSocketMap));
  });
});

// Handle server errors
server.on("error", (error) => {
  console.error("Server error:", error);
});

export { io, app, server };