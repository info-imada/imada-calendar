import { describe, expect, it } from "vitest";

import {
  AuthorizationError,
  assertCanAssignRole,
  assertCanCreateRole,
  assertCanManageOverride,
  assertSystemRoleMutation,
  scopeContains,
  scopeKeyFor,
} from "@/lib/authorization/administration-policy";

const countryLeader = {
  scopeType: "COUNTRY" as const,
  countryId: "country-pa",
  teamId: null,
  rolePriority: 400,
};

describe("administration authorization policy", () => {
  it("rejects self mutation and equal or higher role assignment", () => {
    expect(() =>
      assertCanAssignRole({
        actorUserId: "actor",
        targetUserId: "actor",
        actorAssignments: [countryLeader],
        actorCanManageTeam: true,
        targetRolePriority: 200,
        targetScope: {
          scopeType: "COUNTRY",
          countryId: "country-pa",
          teamId: null,
        },
      }),
    ).toThrowError(new AuthorizationError("FORBIDDEN"));

    for (const priority of [400, 500]) {
      expect(() =>
        assertCanAssignRole({
          actorUserId: "actor",
          targetUserId: "target",
          actorAssignments: [countryLeader],
          actorCanManageTeam: true,
          targetRolePriority: priority,
          targetScope: {
            scopeType: "COUNTRY",
            countryId: "country-pa",
            teamId: null,
          },
        }),
      ).toThrowError(new AuthorizationError("FORBIDDEN"));
    }
  });

  it("contains delegation to the actor country or team", () => {
    expect(
      scopeContains(countryLeader, {
        scopeType: "TEAM",
        countryId: "country-pa",
        teamId: "team-pa",
      }),
    ).toBe(true);
    expect(
      scopeContains(countryLeader, {
        scopeType: "COUNTRY",
        countryId: "country-mx",
        teamId: null,
      }),
    ).toBe(false);
    expect(
      scopeContains(
        {
          scopeType: "TEAM",
          countryId: "country-pa",
          teamId: "team-pa-1",
          rolePriority: 300,
        },
        {
          scopeType: "TEAM",
          countryId: "country-pa",
          teamId: "team-pa-2",
        },
      ),
    ).toBe(false);
  });

  it("allows a lower role inside scope and rejects outside scope", () => {
    expect(() =>
      assertCanAssignRole({
        actorUserId: "actor",
        targetUserId: "target",
        actorAssignments: [countryLeader],
        actorCanManageTeam: true,
        targetRolePriority: 300,
        targetScope: {
          scopeType: "TEAM",
          countryId: "country-pa",
          teamId: "team-pa",
        },
      }),
    ).not.toThrow();
    expect(() =>
      assertCanAssignRole({
        actorUserId: "actor",
        targetUserId: "target",
        actorAssignments: [countryLeader],
        actorCanManageTeam: true,
        targetRolePriority: 300,
        targetScope: {
          scopeType: "COUNTRY",
          countryId: "country-mx",
          teamId: null,
        },
      }),
    ).toThrowError(new AuthorizationError("FORBIDDEN"));
  });

  it("allows a global administrator to delegate an equal-priority administrator role", () => {
    expect(() =>
      assertCanAssignRole({
        actorUserId: "admin",
        targetUserId: "target",
        actorAssignments: [{
          scopeType: "GLOBAL",
          countryId: null,
          teamId: null,
          rolePriority: 500,
        }],
        actorCanManageTeam: true,
        isGlobalAdmin: true,
        targetRolePriority: 500,
        targetScope: {
          scopeType: "GLOBAL",
          countryId: null,
          teamId: null,
        },
      }),
    ).not.toThrow();
  });

  it("requires global admin and an owned permission for grants", () => {
    expect(() =>
      assertCanManageOverride({
        actorUserId: "admin",
        targetUserId: "target",
        isGlobalAdmin: true,
        actorPermissions: new Set(["activity:read"]),
        permissionKey: "catalog:manage",
        effect: "GRANT",
      }),
    ).toThrowError(new AuthorizationError("FORBIDDEN"));
    expect(() =>
      assertCanManageOverride({
        actorUserId: "admin",
        targetUserId: "target",
        isGlobalAdmin: true,
        actorPermissions: new Set(["activity:read"]),
        permissionKey: "activity:read",
        effect: "GRANT",
      }),
    ).not.toThrow();
  });

  it("protects system roles and validates custom role priority", () => {
    expect(() =>
      assertSystemRoleMutation({
        isSystem: true,
        currentKey: "ADMIN",
        nextKey: "SUPERADMIN",
        deleting: false,
      }),
    ).toThrowError(new AuthorizationError("FORBIDDEN"));
    expect(() =>
      assertSystemRoleMutation({
        isSystem: true,
        currentKey: "ADMIN",
        nextKey: "ADMIN",
        deleting: true,
      }),
    ).toThrowError(new AuthorizationError("FORBIDDEN"));
    expect(() =>
      assertCanCreateRole({
        isGlobalAdmin: true,
        actorPriority: 500,
        newPriority: 500,
      }),
    ).toThrowError(new AuthorizationError("FORBIDDEN"));
  });

  it("creates deterministic non-null override scope keys", () => {
    expect(scopeKeyFor({ countryId: null, teamId: null })).toBe("GLOBAL");
    expect(scopeKeyFor({ countryId: "country-pa", teamId: null })).toBe(
      "COUNTRY:country-pa",
    );
    expect(scopeKeyFor({ countryId: null, teamId: "team-pa" })).toBe(
      "TEAM:team-pa",
    );
  });
});
