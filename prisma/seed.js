const { PrismaClient } = require("@prisma/client");
const bcrypt = require("bcryptjs");
const crypto = require("crypto");

const prisma = new PrismaClient();

async function main() {
  console.log("Seeding database...");

  // ── Create a demo company ──────────────────────────────────────────

  const company = await prisma.company.create({
    data: {
      name: "Acme Recruiting",
      domain: "acme.example.com",
      plan: "PROFESSIONAL",
    },
  });
  console.log(`Created company: ${company.name} (${company.id})`);

  // ── Create an admin user ───────────────────────────────────────────

  const password = await bcrypt.hash("password123", 12);
  const admin = await prisma.user.create({
    data: {
      email: "admin@acme.example.com",
      password,
      firstName: "Jane",
      lastName: "Admin",
      role: "ADMIN",
      companyId: company.id,
    },
  });
  console.log(`Created admin: ${admin.email}`);

  // ── Create a recruiter user ────────────────────────────────────────

  const recruiter = await prisma.user.create({
    data: {
      email: "recruiter@acme.example.com",
      password,
      firstName: "John",
      lastName: "Recruiter",
      role: "RECRUITER",
      companyId: company.id,
    },
  });
  console.log(`Created recruiter: ${recruiter.email}`);

  // ── Create an API key for Chrome extension ─────────────────────────

  const rawKey = `tw_${crypto.randomBytes(32).toString("hex")}`;
  await prisma.apiKey.create({
    data: {
      key: rawKey,
      name: "Chrome Extension - Dev",
      source: "EXTENSION",
      permissions: ["read", "write"],
      companyId: company.id,
      userId: admin.id,
    },
  });
  console.log(`Created extension API key: ${rawKey}`);

  // ── Create sample tags ─────────────────────────────────────────────

  const tags = await Promise.all(
    [
      { name: "Senior", color: "#6366f1" },
      { name: "JavaScript", color: "#eab308" },
      { name: "Python", color: "#3b82f6" },
      { name: "Remote", color: "#22c55e" },
      { name: "Urgent", color: "#ef4444" },
    ].map((t) => prisma.tag.create({ data: { ...t, companyId: company.id } }))
  );
  console.log(`Created ${tags.length} tags`);

  // ── Create a sample job with pipeline ──────────────────────────────

  const job = await prisma.job.create({
    data: {
      title: "Senior Full-Stack Engineer",
      description: "We are looking for a Senior Full-Stack Engineer to join our team.",
      department: "Engineering",
      location: "Remote",
      type: "FULL_TIME",
      status: "OPEN",
      salaryMin: 120000,
      salaryMax: 180000,
      companyId: company.id,
      pipeline: {
        create: [
          { name: "Applied", position: 0 },
          { name: "Phone Screen", position: 1 },
          { name: "Technical Interview", position: 2 },
          { name: "Final Round", position: 3 },
          { name: "Offer", position: 4 },
        ],
      },
    },
    include: { pipeline: true },
  });
  console.log(`Created job: ${job.title}`);

  // ── Create sample candidates ───────────────────────────────────────

  const candidates = await Promise.all([
    prisma.candidate.create({
      data: {
        firstName: "Alice",
        lastName: "Johnson",
        email: "alice@example.com",
        currentTitle: "Full-Stack Developer",
        currentCompany: "TechCorp",
        location: "San Francisco, CA",
        source: "manual",
        companyId: company.id,
      },
    }),
    prisma.candidate.create({
      data: {
        firstName: "Bob",
        lastName: "Smith",
        email: "bob@example.com",
        currentTitle: "Senior Engineer",
        currentCompany: "StartupXYZ",
        location: "Remote",
        linkedinUrl: "https://linkedin.com/in/bobsmith",
        source: "chrome_extension",
        companyId: company.id,
      },
    }),
  ]);
  console.log(`Created ${candidates.length} candidates`);

  // ── Tag the candidates ─────────────────────────────────────────────

  await prisma.candidateTag.createMany({
    data: [
      { candidateId: candidates[0].id, tagId: tags[1].id }, // JavaScript
      { candidateId: candidates[1].id, tagId: tags[0].id }, // Senior
      { candidateId: candidates[1].id, tagId: tags[3].id }, // Remote
    ],
  });

  // ── Apply a candidate to the job ───────────────────────────────────

  await prisma.application.create({
    data: {
      candidateId: candidates[0].id,
      jobId: job.id,
      stageId: job.pipeline[0].id,
      status: "SCREENING",
    },
  });

  console.log("\nSeed complete.");
  console.log("\nDemo credentials:");
  console.log("  Admin:     admin@acme.example.com / password123");
  console.log("  Recruiter: recruiter@acme.example.com / password123");
  console.log(`  API Key:   ${rawKey}`);
}

main()
  .catch((e) => {
    console.error("Seed error:", e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
