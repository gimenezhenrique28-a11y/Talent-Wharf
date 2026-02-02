const { PrismaClient } = require("@prisma/client");

// Singleton Prisma client shared by both the web app and Chrome extension API.
// Multi-tenancy is enforced at the query level — every query is scoped
// to a companyId provided by the authenticated user or API key.

let prisma;

function getClient() {
  if (!prisma) {
    prisma = new PrismaClient({
      log:
        process.env.NODE_ENV === "development"
          ? ["query", "warn", "error"]
          : ["warn", "error"],
    });
  }
  return prisma;
}

async function connect() {
  const client = getClient();
  await client.$connect();
  console.log("Database connected");
  return client;
}

async function disconnect() {
  if (prisma) {
    await prisma.$disconnect();
    console.log("Database disconnected");
  }
}

module.exports = { getClient, connect, disconnect };
