import { PrismaMariaDb } from "@prisma/adapter-mariadb";
import { PrismaClient } from "@prisma/client";

const globalForPrisma = globalThis as unknown as {
  prisma?: PrismaClient;
};

function createPrismaClient() {
  const connectionString = process.env.DATABASE_URL;

  if (!connectionString) {
    throw new Error("DATABASE_URL is required to access the database.");
  }

  const adapter = new PrismaMariaDb(connectionString, {
    onConnectionError: (error) => {
      console.error("Database connection error", { code: error.code });
    },
  });
  const client = new PrismaClient({ adapter });

  globalForPrisma.prisma = client;

  return client;
}

export function getPrisma() {
  return globalForPrisma.prisma ?? createPrismaClient();
}
