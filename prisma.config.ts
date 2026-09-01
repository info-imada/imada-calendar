import "dotenv/config";

import { defineConfig } from "prisma/config";

const migrationDatabaseUrl =
  process.env.DIRECT_DATABASE_URL ||
  process.env.DATABASE_URL ||
  "mysql://placeholder:placeholder@localhost:3306/placeholder";

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations-mysql",
  },
  datasource: {
    url: migrationDatabaseUrl,
  },
});
