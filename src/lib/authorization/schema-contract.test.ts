import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import { describe, expect, it } from "vitest";

const schema = readFileSync(resolve("prisma/schema.prisma"), "utf8");

describe("dynamic authorization Prisma contract", () => {
  it("defines persistent roles, permissions and scoped overrides", () => {
    expect(schema).toContain("enum OverrideEffect");
    expect(schema).toMatch(/model Role \{[\s\S]*priority\s+Int\s+@unique/);
    expect(schema).toMatch(/model Role \{[\s\S]*permissions\s+RolePermission\[\]/);
    expect(schema).toContain("model Permission {");
    expect(schema).toContain("model RolePermission {");
    expect(schema).toContain("model UserPermissionOverride {");
    expect(schema).toMatch(
      /@@unique\(\[userId, permissionId, scopeKey\]\)/,
    );
  });

  it("defines a non-null logical scope key for atomic role assignment uniqueness", () => {
    expect(schema).toMatch(
      /model UserRoleAssignment \{[\s\S]*scopeKey\s+String[\s\S]*@@unique\(\[userId, roleId, scopeKey\]\)/,
    );
  });

  it("defines a durable email outbox and idempotent activity reminders", () => {
    expect(schema).toContain("enum NotificationKind");
    expect(schema).toContain("enum EmailDeliveryStatus");
    expect(schema).toMatch(
      /model EmailNotification \{[\s\S]*dedupeKey\s+String\s+@unique/,
    );
    expect(schema).toMatch(
      /model EmailNotification \{[\s\S]*toRecipients\s+Json[\s\S]*ccRecipients\s+Json/,
    );
    expect(schema).toMatch(
      /model EmailNotification \{[\s\S]*@@index\(\[status, nextAttemptAt, lockedAt\]\)/,
    );
    expect(schema).toMatch(
      /model ActivityReminder \{[\s\S]*@@unique\(\[activityId, channel, scheduledAt\]\)/,
    );
  });

  it("defines the work log lifecycle, scoped ownership and attachment contracts", () => {
    expect(schema).toContain("enum WorkLogStatus");
    expect(schema).toMatch(/model User \{[\s\S]*timezone\s+String/);
    expect(schema).toMatch(/model WorkLog \{[\s\S]*activeKey\s+String\?\s+@unique/);
    expect(schema).toMatch(/model WorkLog \{[\s\S]*activityId\s+String\?\s+@unique/);
    expect(schema).toMatch(/model WorkLog \{[\s\S]*countryId\s+String/);
    expect(schema).toContain("model CustomerLocation {");
    expect(schema).toContain("model WorkLogAttachment {");
    expect(schema).toContain("@@unique([customerId, name])");
    expect(schema).toContain("model Activity {");
    expect(schema).toMatch(/model Activity \{[\s\S]*workLog\s+WorkLog\?/);
  });

  it("registers work log permissions in the application catalog", async () => {
    const { permissionKeys } = await import("@/lib/permissions");
    expect(permissionKeys).toEqual(expect.arrayContaining([
      "worklog:read",
      "worklog:create",
      "worklog:update",
      "worklog:finish",
      "worklog:complete",
      "worklog:admin-update",
      "worklog:delete",
    ]));
  });
});
