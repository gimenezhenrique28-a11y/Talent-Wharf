require("dotenv").config();

const express = require("express");
const cors = require("cors");
const { connect, disconnect } = require("./config/database");
const { getCorsOptions } = require("./config/cors");

const authRoutes = require("./routes/auth");
const candidateRoutes = require("./routes/candidates");
const jobRoutes = require("./routes/jobs");
const apiKeyRoutes = require("./routes/apikeys");

const app = express();
const PORT = process.env.PORT || 3000;

// ─── Middleware ──────────────────────────────────────────────────────

app.use(cors(getCorsOptions()));
app.use(express.json());

// ─── Health check ───────────────────────────────────────────────────

app.get("/health", (_req, res) => {
  res.json({ status: "ok", timestamp: new Date().toISOString() });
});

// ─── API Routes ─────────────────────────────────────────────────────

app.use("/auth", authRoutes);
app.use("/candidates", candidateRoutes);
app.use("/jobs", jobRoutes);
app.use("/api-keys", apiKeyRoutes);

// ─── 404 handler ────────────────────────────────────────────────────

app.use((_req, res) => {
  res.status(404).json({ error: "Not found" });
});

// ─── Error handler ──────────────────────────────────────────────────

app.use((err, _req, res, _next) => {
  console.error("Unhandled error:", err);
  res.status(500).json({ error: "Internal server error" });
});

// ─── Start ──────────────────────────────────────────────────────────

async function start() {
  await connect();
  app.listen(PORT, () => {
    console.log(`Talent Wharf API running on port ${PORT}`);
    console.log(`Health check: http://localhost:${PORT}/health`);
  });
}

process.on("SIGINT", async () => {
  await disconnect();
  process.exit(0);
});

process.on("SIGTERM", async () => {
  await disconnect();
  process.exit(0);
});

start().catch((err) => {
  console.error("Failed to start:", err);
  process.exit(1);
});
