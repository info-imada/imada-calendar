import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@prisma/client";
import { Pool } from "pg";

const globalForPrisma = globalThis as unknown as {
  prisma?: PrismaClient;
  prismaPool?: Pool;
};

function createPrismaClient() {
  const connectionString = process.env.DATABASE_URL;

  if (!connectionString) {
    throw new Error("DATABASE_URL is required to access the database.");
  }

  const pool = new Pool({
    connectionString,
    max: 1,
  });

  const adapter = new PrismaPg(pool);
  const client = new PrismaClient({ adapter });

  globalForPrisma.prisma = client;
  globalForPrisma.prismaPool = pool;

  return client;
}

export function getPrisma() {
  return globalForPrisma.prisma ?? createPrismaClient();
}
