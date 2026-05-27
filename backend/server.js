require("dotenv").config();

const path = require("path");
const fs = require("fs");
const express = require("express");
const cors = require("cors");
const { connectDB } = require("./config/db");
const authRoutes = require("./routes/authRoutes");
const documentRoutes = require("./routes/documentRoutes");
const chatRoutes = require("./routes/chatRoutes");
const { errorHandler } = require("./middleware/errorHandler");

const app = express();

// Ensure uploads folder exists (binary storage for Phase 1).
const uploadsDir = path.join(__dirname, "uploads");
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

// Local dev: allow both localhost and 127.0.0.1 so CORS matches however you open Vite.
const fromEnv = (process.env.FRONTEND_URL || "")
  .split(",")
  .map((s) => s.trim())
  .filter(Boolean);
const allowedOrigins = [...new Set([...fromEnv, "http://localhost:5173", "http://127.0.0.1:5173"])];

app.use(
  cors({
    origin: allowedOrigins,
    credentials: true,
  })
);

app.use(express.json({ limit: "2mb" }));

// Basic request logging for local development.
app.use((req, _res, next) => {
  if (process.env.NODE_ENV !== "production") {
    console.log(`${req.method} ${req.path}`);
  }
  next();
});

app.get("/api/health", (_req, res) => {
  res.json({ ok: true, service: "jurisai-backend", phase: 3, features: ["auth", "documents", "chat"] });
});

app.use("/api/auth", authRoutes);
app.use("/api/documents", documentRoutes);
app.use("/api/chat", chatRoutes);

// JSON 404 for unknown API routes (avoids HTML error pages in the frontend).
app.use("/api", (req, res) => {
  res.status(404).json({ message: `API route not found: ${req.method} ${req.originalUrl}` });
});

app.use(errorHandler);

const PORT = Number(process.env.PORT || 5000);

async function start() {
  await connectDB();

  const server = app.listen(PORT, () => {
    console.log(`JurisAI backend listening on http://localhost:${PORT}`);
  });

  server.on("error", (err) => {
    if (err.code === "EADDRINUSE") {
      console.error(`\nPort ${PORT} is already in use (EADDRINUSE).`);
      console.error(
        "On macOS, Control Center / AirPlay Receiver often binds to port 5000. Fix it by either:"
      );
      console.error(
        "  • System Settings → General → AirDrop & Handoff → AirPlay Receiver → Off, then retry; or"
      );
      console.error(
        `  • Use another port: set PORT=5001 in backend/.env and set VITE_API_URL=http://localhost:5001/api in frontend/.env, then restart both servers.\n`
      );
      process.exit(1);
    }
    console.error("HTTP server error:", err);
    process.exit(1);
  });
}

start().catch((err) => {
  console.error("Failed to start server:", err);
  process.exit(1);
});
