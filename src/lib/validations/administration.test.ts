import { describe, expect, it } from "vitest";

import {
  managedUserCreateInputSchema,
  managedUserUpdateInputSchema,
} from "@/lib/validations/administration";

const roleId = "cmrl0x4sa001480o3h9q67aaa";
const userId = "cmrl0x4sa000280o3h9q67aaa";
const teamId = "cmrl0x4sa001480o3h9q67aab";

describe("managed user validation", () => {
  it("normalizes identity fields for a global local account", () => {
    expect(managedUserCreateInputSchema.parse({
      accessStatus: "ACTIVE",
      authMethod: "LOCAL",
      email: " ANA@EXAMPLE.COM ",
      name: " Ana Torres ",
      roleId,
      scopeType: "GLOBAL",
    })).toEqual({
      accessStatus: "ACTIVE",
      authMethod: "LOCAL",
      email: "ana@example.com",
      name: "Ana Torres",
      roleId,
      scopeType: "GLOBAL",
    });
  });

  it("requires the identifier that belongs to the selected scope", () => {
    expect(managedUserCreateInputSchema.safeParse({
      accessStatus: "ACTIVE",
      authMethod: "ZOHO",
      email: "ana@example.com",
      name: "Ana Torres",
      roleId,
      scopeType: "TEAM",
    }).success).toBe(false);

    expect(managedUserCreateInputSchema.safeParse({
      accessStatus: "PENDING",
      authMethod: "ZOHO",
      email: "ana@example.com",
      name: "Ana Torres",
      roleId,
      scopeType: "TEAM",
      teamId,
    }).success).toBe(true);
  });

  it("normalizes editable profile fields", () => {
    expect(managedUserUpdateInputSchema.parse({
      email: " ANA@EXAMPLE.COM ",
      name: " Ana Torres ",
      userId,
    })).toEqual({ email: "ana@example.com", name: "Ana Torres", userId });
  });

  it("accepts a role and scope when an administrator edits access", () => {
    expect(managedUserUpdateInputSchema.parse({
      assignmentId: "cmrl0x4sa001480o3h9q67aac",
      email: " ANA@EXAMPLE.COM ",
      name: " Ana Torres ",
      roleId,
      scopeType: "GLOBAL",
      userId,
    })).toEqual({
      assignmentId: "cmrl0x4sa001480o3h9q67aac",
      email: "ana@example.com",
      name: "Ana Torres",
      roleId,
      scopeType: "GLOBAL",
      userId,
    });
  });
});
