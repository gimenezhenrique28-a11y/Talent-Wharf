const express = require("express");
const crypto = require("crypto");
const { getClient } = require("../config/database");
const { authenticate, requireRole, tenantScope } = require("../middleware/auth");

const router = express.Router();

router.use(authenticate);

// ─── GET /api-keys ──────────────────────────────────────────────────

router.get("/", requireRole("ADMIN"), async (req, res) => {
  try {
    const prisma = getClient();
    const keys = await prisma.apiKey.findMany({
      where: tenantScope(req),
      select: {
        id: true,
        name: true,
        source: true,
        permissions: true,
        isActive: true,
        lastUsedAt: true,
        expiresAt: true,
        createdAt: true,
        // Never expose the full key in list responses
        key: false,
      },
      orderBy: { createdAt: "desc" },
    });

    res.json(keys);
  } catch (err) {
    res.status(500).json({ error: "Failed to list API keys" });
  }
});

// ─── POST /api-keys ─────────────────────────────────────────────────
// Generate a new API key for the Chrome extension or other integrations.

router.post("/", requireRole("ADMIN"), async (req, res) => {
  try {
    const prisma = getClient();
    const {
      name,
      source = "EXTENSION",
      permissions = ["read", "write"],
      expiresInDays,
    } = req.body;

    if (!name) {
      return res.status(400).json({ error: "Name is required" });
    }

    const rawKey = `tw_${crypto.randomBytes(32).toString("hex")}`;

    const data = {
      key: rawKey,
      name,
      source,
      permissions,
      userId: req.auth.userId,
      ...tenantScope(req),
    };

    if (expiresInDays) {
      data.expiresAt = new Date(Date.now() + expiresInDays * 86400000);
    }

    const apiKey = await prisma.apiKey.create({ data });

    // Return the full key only once — on creation
    res.status(201).json({
      id: apiKey.id,
      key: rawKey,
      name: apiKey.name,
      source: apiKey.source,
      permissions: apiKey.permissions,
      expiresAt: apiKey.expiresAt,
      message: "Store this key securely — it will not be shown again.",
    });
  } catch (err) {
    console.error("Create API key error:", err);
    res.status(500).json({ error: "Failed to create API key" });
  }
});

// ─── DELETE /api-keys/:id ───────────────────────────────────────────

router.delete("/:id", requireRole("ADMIN"), async (req, res) => {
  try {
    const prisma = getClient();

    const existing = await prisma.apiKey.findFirst({
      where: { id: req.params.id, ...tenantScope(req) },
    });
    if (!existing) return res.status(404).json({ error: "API key not found" });

    await prisma.apiKey.delete({ where: { id: req.params.id } });
    res.json({ message: "API key revoked" });
  } catch (err) {
    res.status(500).json({ error: "Failed to revoke API key" });
  }
});

module.exports = router;
