const express = require("express");
const { getClient } = require("../config/database");
const { authenticate, requireRole, tenantScope } = require("../middleware/auth");

const router = express.Router();

router.use(authenticate);

// ─── GET /jobs ──────────────────────────────────────────────────────

router.get("/", async (req, res) => {
  try {
    const prisma = getClient();
    const { status, department, page = 1, limit = 25 } = req.query;

    const where = { ...tenantScope(req) };
    if (status) where.status = status;
    if (department) where.department = department;

    const skip = (Number(page) - 1) * Number(limit);

    const [jobs, total] = await Promise.all([
      prisma.job.findMany({
        where,
        include: {
          _count: { select: { applications: true } },
          pipeline: { orderBy: { position: "asc" } },
        },
        orderBy: { createdAt: "desc" },
        skip,
        take: Number(limit),
      }),
      prisma.job.count({ where }),
    ]);

    res.json({ jobs, total, page: Number(page), limit: Number(limit) });
  } catch (err) {
    res.status(500).json({ error: "Failed to list jobs" });
  }
});

// ─── GET /jobs/:id ──────────────────────────────────────────────────

router.get("/:id", async (req, res) => {
  try {
    const prisma = getClient();
    const job = await prisma.job.findFirst({
      where: { id: req.params.id, ...tenantScope(req) },
      include: {
        pipeline: { orderBy: { position: "asc" } },
        applications: {
          include: {
            candidate: true,
            stage: true,
          },
          orderBy: { createdAt: "desc" },
        },
      },
    });

    if (!job) return res.status(404).json({ error: "Job not found" });
    res.json(job);
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch job" });
  }
});

// ─── POST /jobs ─────────────────────────────────────────────────────

router.post("/", requireRole("ADMIN", "HIRING_MANAGER"), async (req, res) => {
  try {
    const prisma = getClient();
    const { pipelineStages, ...jobData } = req.body;

    const defaultStages = pipelineStages || [
      "Applied",
      "Phone Screen",
      "Interview",
      "Offer",
      "Hired",
    ];

    const job = await prisma.job.create({
      data: {
        ...jobData,
        ...tenantScope(req),
        pipeline: {
          create: defaultStages.map((name, i) => ({
            name,
            position: i,
          })),
        },
      },
      include: { pipeline: { orderBy: { position: "asc" } } },
    });

    res.status(201).json(job);
  } catch (err) {
    console.error("Create job error:", err);
    res.status(500).json({ error: "Failed to create job" });
  }
});

// ─── PUT /jobs/:id ──────────────────────────────────────────────────

router.put("/:id", requireRole("ADMIN", "HIRING_MANAGER"), async (req, res) => {
  try {
    const prisma = getClient();

    const existing = await prisma.job.findFirst({
      where: { id: req.params.id, ...tenantScope(req) },
    });
    if (!existing) return res.status(404).json({ error: "Job not found" });

    const job = await prisma.job.update({
      where: { id: req.params.id },
      data: req.body,
    });

    res.json(job);
  } catch (err) {
    res.status(500).json({ error: "Failed to update job" });
  }
});

// ─── POST /jobs/:id/apply ───────────────────────────────────────────

router.post("/:id/apply", async (req, res) => {
  try {
    const prisma = getClient();
    const { candidateId } = req.body;

    const job = await prisma.job.findFirst({
      where: { id: req.params.id, ...tenantScope(req) },
      include: { pipeline: { orderBy: { position: "asc" }, take: 1 } },
    });
    if (!job) return res.status(404).json({ error: "Job not found" });

    const firstStage = job.pipeline[0];

    const application = await prisma.application.create({
      data: {
        candidateId,
        jobId: job.id,
        stageId: firstStage?.id,
      },
      include: { candidate: true, stage: true },
    });

    await prisma.activity.create({
      data: {
        type: "STAGE_CHANGED",
        detail: `Applied to ${job.title}`,
        candidateId,
        userId: req.auth.userId,
      },
    });

    res.status(201).json(application);
  } catch (err) {
    if (err.code === "P2002") {
      return res.status(409).json({ error: "Candidate already applied to this job" });
    }
    res.status(500).json({ error: "Failed to create application" });
  }
});

module.exports = router;
