require("dotenv").config();
const express = require("express");
const helmet = require("helmet");
const cors = require("cors");
const rateLimit = require("express-rate-limit");

const authRoutes = require("./routes/auth.routes");
const itemsRoutes = require("./routes/items.routes");
const { notFound, errorHandler } = require("./middleware/error");

const app = express();

// Basic security headers
app.use(helmet());

// If your frontend runs on another port (e.g. 5500), allow it:
app.use(cors({ origin: true }));

// Rate limit (especially useful for auth)
app.use(
  rateLimit({
    windowMs: 60 * 1000,
    max: 120,
    standardHeaders: true,
    legacyHeaders: false,
  })
);

// Body parsing
app.use(express.json({ limit: "200kb" }));
app.use(express.urlencoded({ extended: true }));

// Health check
app.get("/health", (req, res) => res.json({ ok: true }));

// Routes
app.use("/api/auth", authRoutes);
app.use("/api/items", itemsRoutes);

// 404 + error
app.use(notFound);
app.use(errorHandler);

module.exports = app;