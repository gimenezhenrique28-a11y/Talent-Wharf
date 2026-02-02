const express = require("express");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const { getClient } = require("../config/database");
const { authenticate, requireRole, tenantScope } = require("../middleware/auth");

const router = express.Router();

// ─── POST /auth/register  (create company + first admin user) ───────

router.post("/register", async (req, res) => {
  try {
    const { companyName, email, password, firstName, lastName } = req.body;

    if (!companyName || !email || !password || !firstName || !lastName) {
      return res.status(400).json({ error: "All fields are required" });
    }

    const prisma = getClient();
    const hashed = await bcrypt.hash(password, 12);

    const result = await prisma.$transaction(async (tx) => {
      const company = await tx.company.create({
        data: { name: companyName },
      });

      const user = await tx.user.create({
        data: {
          email,
          password: hashed,
          firstName,
          lastName,
          role: "ADMIN",
          companyId: company.id,
        },
      });

      // Create default pipeline stages template
      // (individual jobs get their own stages later)

      return { company, user };
    });

    const token = signToken(result.user, result.company.id);

    res.status(201).json({
      token,
      user: sanitizeUser(result.user),
      company: { id: result.company.id, name: result.company.name },
    });
  } catch (err) {
    if (err.code === "P2002") {
      return res.status(409).json({ error: "Email already registered for this company" });
    }
    console.error("Register error:", err);
    res.status(500).json({ error: "Registration failed" });
  }
});

// ─── POST /auth/login ───────────────────────────────────────────────

router.post("/login", async (req, res) => {
  try {
    const { email, password, companyId } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: "Email and password are required" });
    }

    const prisma = getClient();

    // If companyId is provided, scope to that company; otherwise find first match.
    const where = companyId
      ? { email_companyId: { email, companyId } }
      : undefined;

    let user;
    if (where) {
      user = await prisma.user.findUnique({ where, include: { company: true } });
    } else {
      user = await prisma.user.findFirst({
        where: { email },
        include: { company: true },
      });
    }

    if (!user || !user.isActive) {
      return res.status(401).json({ error: "Invalid credentials" });
    }

    const valid = await bcrypt.compare(password, user.password);
    if (!valid) {
      return res.status(401).json({ error: "Invalid credentials" });
    }

    const token = signToken(user, user.companyId);

    res.json({
      token,
      user: sanitizeUser(user),
      company: { id: user.company.id, name: user.company.name },
    });
  } catch (err) {
    console.error("Login error:", err);
    res.status(500).json({ error: "Login failed" });
  }
});

// ─── GET /auth/me ───────────────────────────────────────────────────

router.get("/me", authenticate, async (req, res) => {
  try {
    const prisma = getClient();
    const user = await prisma.user.findUnique({
      where: { id: req.auth.userId },
      include: { company: true },
    });

    if (!user) return res.status(404).json({ error: "User not found" });

    res.json({
      user: sanitizeUser(user),
      company: { id: user.company.id, name: user.company.name },
    });
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch profile" });
  }
});

// ─── POST /auth/users  (invite a user to the company) ──────────────

router.post("/users", authenticate, requireRole("ADMIN"), async (req, res) => {
  try {
    const { email, firstName, lastName, role, password } = req.body;

    if (!email || !firstName || !lastName || !password) {
      return res.status(400).json({ error: "All fields are required" });
    }

    const prisma = getClient();
    const hashed = await bcrypt.hash(password, 12);

    const user = await prisma.user.create({
      data: {
        email,
        password: hashed,
        firstName,
        lastName,
        role: role || "RECRUITER",
        ...tenantScope(req),
      },
    });

    res.status(201).json({ user: sanitizeUser(user) });
  } catch (err) {
    if (err.code === "P2002") {
      return res.status(409).json({ error: "Email already exists in this company" });
    }
    res.status(500).json({ error: "Failed to create user" });
  }
});

// ─── Helpers ────────────────────────────────────────────────────────

function signToken(user, companyId) {
  return jwt.sign(
    { userId: user.id, companyId, role: user.role },
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRES_IN || "7d" }
  );
}

function sanitizeUser(user) {
  const { password, ...safe } = user;
  return safe;
}

module.exports = router;
