const express = require("express");
const { getClient } = require("../config/database");
const { authenticate, tenantScope } = require("../middleware/auth");

const router = express.Router();

// All routes require authentication (JWT or API key)
router.use(authenticate);

// ─── GET /candidates ────────────────────────────────────────────────

router.get("/", async (req, res) => {
  try {
    const prisma = getClient();
    const { search, source, tag, page = 1, limit = 25 } = req.query;

    const where = { ...tenantScope(req) };

    if (search) {
      where.OR = [
        { firstName: { contains: search, mode: "insensitive" } },
        { lastName: { contains: search, mode: "insensitive" } },
        { email: { contains: search, mode: "insensitive" } },
        { currentTitle: { contains: search, mode: "insensitive" } },
        { currentCompany: { contains: search, mode: "insensitive" } },
      ];
    }

    if (source) where.source = source;

    if (tag) {
      where.candidateTags = { some: { tag: { name: tag } } };
    }

    const skip = (Number(page) - 1) * Number(limit);

    const [candidates, total] = await Promise.all([
      prisma.candidate.findMany({
        where,
        include: { candidateTags: { include: { tag: true } } },
        orderBy: { createdAt: "desc" },
        skip,
        take: Number(limit),
      }),
      prisma.candidate.count({ where }),
    ]);

    res.json({ candidates, total, page: Number(page), limit: Number(limit) });
  } catch (err) {
    console.error("List candidates error:", err);
    res.status(500).json({ error: "Failed to list candidates" });
  }
});

// ─── GET /candidates/:id ────────────────────────────────────────────

router.get("/:id", async (req, res) => {
  try {
    const prisma = getClient();
    const candidate = await prisma.candidate.findFirst({
      where: { id: req.params.id, ...tenantScope(req) },
      include: {
        applications: { include: { job: true, stage: true } },
        notes: { include: { author: { select: { id: true, firstName: true, lastName: true } } }, orderBy: { createdAt: "desc" } },
        candidateTags: { include: { tag: true } },
        activities: { orderBy: { createdAt: "desc" }, take: 20 },
      },
    });

    if (!candidate) return res.status(404).json({ error: "Candidate not found" });
    res.json(candidate);
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch candidate" });
  }
});

// ─── POST /candidates ───────────────────────────────────────────────
// Used by both the web app and the Chrome extension to add candidates.

router.post("/", async (req, res) => {
  try {
    const prisma = getClient();
    const data = { ...req.body, ...tenantScope(req) };

    // Determine the source based on the auth method
    if (!data.source) {
      data.source = req.auth.source === "extension" ? "chrome_extension" : "manual";
    }

    const candidate = await prisma.candidate.create({ data });

    // Log activity
    await prisma.activity.create({
      data: {
        type: req.auth.source === "extension" ? "IMPORTED_FROM_EXTENSION" : "CREATED",
        candidateId: candidate.id,
        userId: req.auth.userId,
      },
    });

    res.status(201).json(candidate);
  } catch (err) {
    if (err.code === "P2002") {
      return res.status(409).json({ error: "Candidate with this email already exists" });
    }
    console.error("Create candidate error:", err);
    res.status(500).json({ error: "Failed to create candidate" });
  }
});

// ─── PUT /candidates/:id ────────────────────────────────────────────

router.put("/:id", async (req, res) => {
  try {
    const prisma = getClient();

    // Verify ownership
    const existing = await prisma.candidate.findFirst({
      where: { id: req.params.id, ...tenantScope(req) },
    });
    if (!existing) return res.status(404).json({ error: "Candidate not found" });

    const candidate = await prisma.candidate.update({
      where: { id: req.params.id },
      data: req.body,
    });

    await prisma.activity.create({
      data: {
        type: "UPDATED",
        candidateId: candidate.id,
        userId: req.auth.userId,
      },
    });

    res.json(candidate);
  } catch (err) {
    res.status(500).json({ error: "Failed to update candidate" });
  }
});

// ─── DELETE /candidates/:id ─────────────────────────────────────────

router.delete("/:id", async (req, res) => {
  try {
    const prisma = getClient();

    const existing = await prisma.candidate.findFirst({
      where: { id: req.params.id, ...tenantScope(req) },
    });
    if (!existing) return res.status(404).json({ error: "Candidate not found" });

    await prisma.candidate.delete({ where: { id: req.params.id } });
    res.json({ message: "Candidate deleted" });
  } catch (err) {
    res.status(500).json({ error: "Failed to delete candidate" });
  }
});

// ─── POST /candidates/:id/notes ─────────────────────────────────────

router.post("/:id/notes", async (req, res) => {
  try {
    const prisma = getClient();

    const existing = await prisma.candidate.findFirst({
      where: { id: req.params.id, ...tenantScope(req) },
    });
    if (!existing) return res.status(404).json({ error: "Candidate not found" });

    const note = await prisma.note.create({
      data: {
        content: req.body.content,
        candidateId: req.params.id,
        authorId: req.auth.userId,
      },
    });

    await prisma.activity.create({
      data: {
        type: "NOTE_ADDED",
        candidateId: req.params.id,
        userId: req.auth.userId,
      },
    });

    res.status(201).json(note);
  } catch (err) {
    res.status(500).json({ error: "Failed to add note" });
  }
});

module.exports = router;
