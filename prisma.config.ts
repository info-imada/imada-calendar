import "dotenv/config";

import { defineConfig } from "prisma/config";

const migrationDatabaseUrl =
  process.env.DIRECT_DATABASE_URL ||
  process.env.DATABASE_URL ||
  "postgresql://placeholder:placeholder@localhost:5432/placeholder";

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
  },
  datasource: {
    url: migrationDatabaseUrl,
  },
});
