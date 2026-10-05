"use strict";

const express = require("express");
const cors = require("cors");
const path = require("node:path");

const requestLogger = require("./middleware/logger");
const { errorHandler, notFoundHandler } = require("./middleware/error");

const userRoutes = require("./routes/userRoutes");
const categoryRoutes = require("./routes/categoryRoutes");
const menuItemRoutes = require("./routes/menuItemRoutes");
const orderRoutes = require("./routes/orderRoutes");
const authRoutes = require("./routes/authRoutes");

const app = express();

app.disable("x-powered-by");

// Core middleware
app.use(cors());
app.use(express.json());
app.use(requestLogger);

// Serve Frontend Static Assets
const publicDir = path.resolve(__dirname, "../public");
app.use(express.static(publicDir));

// Health check
app.get("/health", (req, res) => {
  res.status(200).json({
    success: true,
    status: "ok",
    timestamp: new Date().toISOString(),
  });
});

// API Routes (Mounted under /api)
app.use("/api/users", userRoutes);
app.use("/api/categories", categoryRoutes);
app.use("/api/menu-items", menuItemRoutes);
app.use("/api/orders", orderRoutes);
app.use("/api/auth", authRoutes);

// Fallback aliases without /api prefix for convenience
app.use("/users", userRoutes);
app.use("/categories", categoryRoutes);
app.use("/menu-items", menuItemRoutes);
app.use("/orders", orderRoutes);

// Catch-all: serve index.html for client-side routes (History API)
app.get("*", (req, res, next) => {
  if (
    req.path.startsWith("/api") ||
    req.path.startsWith("/health") ||
    req.path.includes(".")
  ) {
    return next();
  }
  res.sendFile(path.resolve(publicDir, "index.html"));
});

// 404 & Error Handlers
app.use(notFoundHandler);
app.use(errorHandler);

module.exports = app;
