import express from "express";
import dotenv from "dotenv";
import cookieParser from "cookie-parser";
import cors from "cors";
import fs from "fs";
import path from "path";
import helmet from "helmet";
import rateLimit from "express-rate-limit";
import { connectDB } from "./lib/db.js";
import authRoutes from "./routes/auth.route.js";
import messageRoutes from "./routes/message.route.js";
import friendRoutes from "./routes/friend.route.js";
import groupRoutes from "./routes/group.route.js";
import { app, server } from "./lib/socket.js";

// Load environment variables
dotenv.config();

// Validate required environment variables
const requiredEnvVars = ['PORT', 'MONGODB_URI', 'JWT_SECRET'];
const missingEnvVars = requiredEnvVars.filter(envVar => !process.env[envVar]);

if (missingEnvVars.length > 0) {
  console.error('Missing required environment variables:', missingEnvVars.join(', '));
  process.exit(1);
}

const PORT = process.env.PORT;
const __dirname = path.resolve();

// Trust proxy for rate limiter
app.set('trust proxy', 1);

// Security middleware
app.use(helmet());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));
app.use(cookieParser());

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // Limit each IP to 100 requests per windowMs
  message: 'Too many requests from this IP, please try again later.',
  standardHeaders: true, // Return rate limit info in the `RateLimit-*` headers
  legacyHeaders: false, // Disable the `X-RateLimit-*` headers
  trustProxy: true
});

// Apply rate limiting to API routes
app.use('/api/', limiter);

// CORS configuration
const corsOptions = {
  origin: function (origin, callback) {
    const allowedOrigins = [
      process.env.FRONTEND_URL || "http://localhost:5173",
      "http://localhost:5173",
      "http://localhost:3000",
      "http://127.0.0.1:5173",
      "http://127.0.0.1:3000",
      "https://synctalk-fnua.onrender.com",
      /\.onrender\.com$/
    ];
    
    // Allow requests with no origin (like mobile apps or curl) or in production
    if (!origin || process.env.NODE_ENV === "production") {
      return callback(null, true);
    }
    
    if (allowedOrigins.includes(origin) || origin.match(/^http:\/\/192\.168\.\d+\.\d+:\d+$/) || origin.match(/\.onrender\.com$/)) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
};

app.use(cors(corsOptions));

// API routes
app.use("/api/auth", authRoutes);
app.use("/api/messages", messageRoutes);
app.use("/api/friends", friendRoutes);
app.use("/api/groups", groupRoutes);

// Health check endpoint
app.get('/health', (req, res) => {
  res.status(200).json({ status: 'ok' });
});

// Serve frontend static files - works on both local and Render
let frontendDistPath;
if (process.env.RENDER || process.env.NODE_ENV === "production") {
  frontendDistPath = path.join(process.cwd(), "frontend/dist");
} else {
  frontendDistPath = path.join(__dirname, "../frontend/dist");
}

console.log("Frontend dist path:", frontendDistPath);
console.log("Current working directory:", process.cwd());

// Check if path exists, if not try alternative
if (!fs.existsSync(frontendDistPath)) {
  console.log("Path doesn't exist, trying alternative...");
  // Try alternative path for Render
  frontendDistPath = path.join(__dirname, "../../frontend/dist");
  console.log("Alternative path:", frontendDistPath);
}

// Serve static files with proper headers
app.use(express.static(frontendDistPath, {
  index: ['index.html'],
  setHeaders: (res, filePath) => {
    if (filePath.endsWith('.css')) {
      res.setHeader('Content-Type', 'text/css');
    }
    if (filePath.endsWith('.js')) {
      res.setHeader('Content-Type', 'application/javascript');
    }
  }
}));

// Explicitly handle assets to ensure correct MIME types
app.get('/assets/:filename', (req, res) => {
  const filename = req.params.filename;
  const filePath = path.join(frontendDistPath, 'assets', filename);
  
  if (filename.endsWith('.css')) {
    res.setHeader('Content-Type', 'text/css');
  } else if (filename.endsWith('.js')) {
    res.setHeader('Content-Type', 'application/javascript');
  }
  
  res.sendFile(filePath, (err) => {
    if (err) {
      console.error("Asset error:", err);
      res.status(404).send("Not found");
    }
  });
});

// Serve index.html for all non-API routes (SPA fallback)
app.get("*", (req, res, next) => {
  if (req.path.startsWith('/api/')) {
    return next();
  }
  const indexPath = path.join(frontendDistPath, "index.html");
  res.sendFile(indexPath, (err) => {
    if (err) {
      console.error("Error sending index.html:", err);
      next(err);
    }
  });
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ 
    error: 'Something went wrong!',
    message: process.env.NODE_ENV === 'development' ? err.message : undefined
  });
});

// Handle unhandled promise rejections
process.on('unhandledRejection', (err) => {
  console.error('Unhandled Promise Rejection:', err);
  // Don't crash the server, but log the error
});

// Handle uncaught exceptions
process.on('uncaughtException', (err) => {
  console.error('Uncaught Exception:', err);
  // Give the server time to log the error before crashing
  setTimeout(() => {
    process.exit(1);
  }, 1000);
});

// Connect to MongoDB before starting the server
connectDB().then(() => {
  server.listen(PORT, () => {
    console.log(`Server is running on PORT: ${PORT}`);
    console.log(`Environment: ${process.env.NODE_ENV || 'development'}`);
  });
}).catch(error => {
  console.error('Failed to start server:', error);
  process.exit(1);
});
