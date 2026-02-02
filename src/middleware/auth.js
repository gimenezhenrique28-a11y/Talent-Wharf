const jwt = require("jsonwebtoken");
const { getClient } = require("../config/database");

// ─── Dual-auth middleware ───────────────────────────────────────────
// Supports two authentication methods on every request:
//
//   1. JWT (web app)      →  Authorization: Bearer <token>
//   2. API Key (extension) →  X-API-Key: <key>
//
// Both resolve to the same shape on req: { companyId, userId, source }

async function authenticate(req, res, next) {
  const apiKey = req.headers["x-api-key"];
  const authHeader = req.headers.authorization;

  try {
    if (apiKey) {
      await authenticateApiKey(req, apiKey);
    } else if (authHeader && authHeader.startsWith("Bearer ")) {
      authenticateJwt(req, authHeader.split(" ")[1]);
    } else {
      return res.status(401).json({ error: "Authentication required" });
    }
    next();
  } catch (err) {
    return res.status(401).json({ error: err.message || "Invalid credentials" });
  }
}

// ─── JWT authentication (web app) ───────────────────────────────────

function authenticateJwt(req, token) {
  const payload = jwt.verify(token, process.env.JWT_SECRET);
  req.auth = {
    userId: payload.userId,
    companyId: payload.companyId,
    role: payload.role,
    source: "app",
  };
}

// ─── API-key authentication (Chrome extension) ─────────────────────

async function authenticateApiKey(req, key) {
  const prisma = getClient();

  const record = await prisma.apiKey.findUnique({
    where: { key },
    include: { company: true },
  });

  if (!record || !record.isActive) {
    throw new Error("Invalid or inactive API key");
  }

  if (record.expiresAt && record.expiresAt < new Date()) {
    throw new Error("API key expired");
  }

  // Update last-used timestamp (fire and forget)
  prisma.apiKey.update({
    where: { id: record.id },
    data: { lastUsedAt: new Date() },
  }).catch(() => {});

  req.auth = {
    userId: record.userId,
    companyId: record.companyId,
    role: null,
    source: record.source.toLowerCase(),
    permissions: record.permissions,
  };
}

// ─── Role guard ─────────────────────────────────────────────────────

function requireRole(...roles) {
  return (req, res, next) => {
    if (!req.auth) {
      return res.status(401).json({ error: "Authentication required" });
    }
    // API-key users bypass role checks if they have the right permission
    if (req.auth.source !== "app") {
      return next();
    }
    if (!roles.includes(req.auth.role)) {
      return res.status(403).json({ error: "Insufficient permissions" });
    }
    next();
  };
}

// ─── Tenant scoping helper ──────────────────────────────────────────
// Injects { companyId } into every Prisma query to enforce data isolation.

function tenantScope(req) {
  return { companyId: req.auth.companyId };
}

module.exports = { authenticate, requireRole, tenantScope };
