import "dotenv/config";

import { PrismaMariaDb } from "@prisma/adapter-mariadb";
import { PrismaClient } from "@prisma/client";
import { afterAll, describe, expect, it } from "vitest";

const databaseDescribe =
  process.env.RUN_DATABASE_INTEGRATION_TESTS === "1"
    ? describe
    : describe.skip;

const prisma = new PrismaClient({
  adapter: new PrismaMariaDb(process.env.DATABASE_URL ?? "mysql://placeholder:placeholder@localhost:3306/placeholder"),
});

databaseDescribe("role assignment database concurrency", () => {
  afterAll(async () => {
    await prisma.$disconnect();
  });

  it("keeps one row when two compound upserts target the same logical scope", async () => {
    const existing = await prisma.userRoleAssignment.findFirst({
      select: {
        id: true,
        userId: true,
        roleId: true,
        scopeType: true,
        countryId: true,
        teamId: true,
        scopeKey: true,
        createdById: true,
      },
    });
    expect(existing).not.toBeNull();
    if (!existing) return;

    const operation = () =>
      prisma.userRoleAssignment.upsert({
        where: {
          userId_roleId_scopeKey: {
            userId: existing.userId,
            roleId: existing.roleId,
            scopeKey: existing.scopeKey,
          },
        },
        update: {},
        create: existing,
      });

    const [first, second] = await Promise.all([operation(), operation()]);
    const count = await prisma.userRoleAssignment.count({
      where: {
        userId: existing.userId,
        roleId: existing.roleId,
        scopeKey: existing.scopeKey,
      },
    });

    expect(first.id).toBe(existing.id);
    expect(second.id).toBe(existing.id);
    expect(count).toBe(1);
  });
});
