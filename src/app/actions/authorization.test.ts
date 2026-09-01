import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  getCurrentUser: vi.fn(),
  getEffectivePermissions: vi.fn(),
  requireAdministrationAccess: vi.fn(),
  revalidatePath: vi.fn(),
  getPrisma: vi.fn(),
  queueAccountNotification: vi.fn(),
  dispatchNotificationIds: vi.fn(),
}));

vi.mock("next/cache", () => ({ revalidatePath: mocks.revalidatePath }));
vi.mock("@/lib/auth", () => ({ getCurrentUser: mocks.getCurrentUser }));
vi.mock("@/lib/permissions", () => ({
  getEffectivePermissions: mocks.getEffectivePermissions,
  requireAdministrationAccess: mocks.requireAdministrationAccess,
}));
vi.mock("@/lib/prisma", () => ({ getPrisma: mocks.getPrisma }));
vi.mock("@/lib/notifications/account-notifications", () => ({
  queueAccountNotification: mocks.queueAccountNotification,
  sendEphemeralCredentialEmail: vi.fn(),
}));
vi.mock("@/lib/notifications/dispatcher", () => ({
  dispatchNotificationIds: mocks.dispatchNotificationIds,
}));

import {
  assignUserRole,
  revokeUserRole,
  setRolePermission,
} from "@/app/actions/authorization";

const actorId = "cmrl0x4sa000180o3h9q67aaa";
const targetId = "cmrl0x4sa000280o3h9q67aaa";
const roleId = "cmrl0x4sa001480o3h9q67aaa";
const permissionId = "cmrl0x4sa001480o3h9q67aab";
const assignmentId = "cmrl0x4sa001480o3h9q67aac";

function createHarness({
  role = {
    id: roleId,
    key: "CUSTOM_MANAGER",
    isSystem: false,
    priority: 400,
  },
  permission = {
    id: permissionId,
    key: "activity:create",
  },
  existingRolePermission = null as { id: string } | null,
  actorRolePriority = 500,
  remainingGlobalAdministrators = 1,
  country = null as { id: string; name: string } | null,
} = {}) {
  let transactionDepth = 0;
  const assignments: Array<Record<string, unknown>> = [];
  const auditCreate = vi.fn().mockResolvedValue({ id: "audit-id" });
  const rolePermissionCreate = vi.fn().mockResolvedValue({ id: "relation-id" });
  const rolePermissionDelete = vi.fn().mockResolvedValue({ id: "relation-id" });
  const assignmentDelete = vi.fn().mockResolvedValue({ id: assignmentId });
  const actorAssignmentsFindMany = vi.fn().mockImplementation(async () => [
    {
      scopeType: "GLOBAL",
      countryId: null,
      teamId: null,
      team: null,
      role: { priority: actorRolePriority },
    },
  ]);
  const assignmentFindUnique = vi.fn().mockResolvedValue({
    id: assignmentId,
    userId: targetId,
    roleId,
    scopeType: "GLOBAL",
    countryId: null,
    teamId: null,
    team: null,
    user: { accessStatus: "ACTIVE" },
    role: {
      ...role,
      permissions: [
        { permission: { key: "catalog:manage" } },
      ],
    },
  });
  const assignmentUpsert = vi.fn().mockImplementation(async ({ create }) => {
    const existing = assignments[0];
    if (existing) return existing;
    const created = { id: assignmentId, ...create };
    assignments.push(created);
    return created;
  });

  const transaction = {
    role: { findUnique: vi.fn().mockResolvedValue(role) },
    permission: { findUnique: vi.fn().mockResolvedValue(permission) },
    rolePermission: {
      findUnique: vi.fn().mockResolvedValue(existingRolePermission),
      create: rolePermissionCreate,
      delete: rolePermissionDelete,
    },
    user: {
      findUnique: vi.fn().mockImplementation(async ({ where }) => ({
        id: where.id,
      })),
    },
    team: { findUnique: vi.fn().mockResolvedValue(null) },
    country: { findUnique: vi.fn().mockResolvedValue(country) },
    userRoleAssignment: {
      findFirst: vi.fn().mockResolvedValue({
        role: { priority: actorRolePriority },
      }),
      findMany: actorAssignmentsFindMany,
      findUnique: assignmentFindUnique,
      count: vi.fn().mockResolvedValue(remainingGlobalAdministrators),
      upsert: assignmentUpsert,
      delete: assignmentDelete,
      // Present only to prove the old non-atomic path is no longer used.
      create: vi.fn().mockImplementation(async ({ data }) => {
        const created = { id: `${assignmentId}-${assignments.length}`, ...data };
        assignments.push(created);
        return created;
      }),
    },
    userPermissionOverride: { findMany: vi.fn().mockResolvedValue([]) },
    auditLog: { create: auditCreate },
  };

  const prisma = {
    ...transaction,
    $transaction: async (callback: (tx: typeof transaction) => unknown) => {
      transactionDepth += 1;
      try {
        return await callback(transaction);
      } finally {
        transactionDepth -= 1;
      }
    },
  };

  mocks.getPrisma.mockReturnValue(prisma);
  mocks.getCurrentUser.mockResolvedValue({ id: actorId });
  mocks.requireAdministrationAccess.mockResolvedValue({
    can: () => true,
    permissions: new Set(["catalog:manage", "activity:create"]),
  });
  mocks.getEffectivePermissions.mockResolvedValue({
    can: (key: string) => key === "team:manage",
    permissions: new Set(["team:manage"]),
  });

  return {
    assignments,
    transaction,
    auditCreate,
    rolePermissionCreate,
    rolePermissionDelete,
    assignmentDelete,
    actorAssignmentsFindMany,
    assignmentFindUnique,
    assignmentUpsert,
    isInsideTransaction: () => transactionDepth > 0,
  };
}

describe("authorization mutations", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.queueAccountNotification.mockResolvedValue(["email-1"]);
    mocks.dispatchNotificationIds.mockResolvedValue({ claimed: 1, sent: 1, failed: 0, skipped: 0 });
  });

  it("writes an immutable before/after audit record with the actor", async () => {
    const harness = createHarness();

    const result = await setRolePermission({
      roleId,
      permissionId,
      enabled: true,
    });

    expect(result).toEqual({ success: true });
    expect(harness.auditCreate).toHaveBeenCalledWith({
      data: expect.objectContaining({
        actorId,
        entityType: "RolePermission",
        action: "ENABLE_ROLE_PERMISSION",
        metadata: {
          before: { enabled: false },
          after: { enabled: true },
          scope: {
            roleKey: "CUSTOM_MANAGER",
            permissionKey: "activity:create",
          },
        },
      }),
    });
  });

  it("rejects disabling a permission on a system role through the Server Action", async () => {
    const harness = createHarness({
      role: { id: roleId, key: "TECNICO", isSystem: true, priority: 200 },
      existingRolePermission: { id: "relation-id" },
    });

    await expect(
      setRolePermission({ roleId, permissionId, enabled: false }),
    ).resolves.toEqual({ success: false, errorCode: "FORBIDDEN" });
    expect(harness.rolePermissionDelete).not.toHaveBeenCalled();
    expect(harness.auditCreate).not.toHaveBeenCalled();
  });

  it.each([true, false])(
    "rejects enabled=%s when the target role priority equals the actor priority",
    async (enabled) => {
      const harness = createHarness({
        role: {
          id: roleId,
          key: "PEER_MANAGER",
          isSystem: false,
          priority: 500,
        },
        existingRolePermission: enabled ? null : { id: "relation-id" },
        actorRolePriority: 500,
      });

      await expect(
        setRolePermission({ roleId, permissionId, enabled }),
      ).resolves.toEqual({ success: false, errorCode: "FORBIDDEN" });
      expect(harness.rolePermissionCreate).not.toHaveBeenCalled();
      expect(harness.rolePermissionDelete).not.toHaveBeenCalled();
    },
  );

  it("re-evaluates set-role authorization inside the mutation transaction", async () => {
    const harness = createHarness();
    mocks.requireAdministrationAccess.mockImplementation(async () => {
      expect(harness.isInsideTransaction()).toBe(true);
      return {
        can: () => true,
        permissions: new Set(["catalog:manage", "activity:create"]),
      };
    });

    await expect(
      setRolePermission({ roleId, permissionId, enabled: true }),
    ).resolves.toEqual({ success: true });
  });

  it("prevents removing the critical settings permission from the last global ADMIN role", async () => {
    const harness = createHarness({
      role: { id: roleId, key: "ADMIN", isSystem: true, priority: 400 },
      permission: { id: permissionId, key: "catalog:manage" },
      existingRolePermission: { id: "relation-id" },
      remainingGlobalAdministrators: 0,
    });

    await expect(
      setRolePermission({ roleId, permissionId, enabled: false }),
    ).resolves.toEqual({ success: false, errorCode: "FORBIDDEN" });
    expect(harness.transaction.userRoleAssignment.count).toHaveBeenCalled();
    expect(harness.rolePermissionDelete).not.toHaveBeenCalled();
  });

  it("prevents revoking the last active ADMIN GLOBAL assignment", async () => {
    const harness = createHarness({
      role: { id: roleId, key: "ADMIN", isSystem: true, priority: 500 },
      actorRolePriority: 600,
      remainingGlobalAdministrators: 0,
    });

    await expect(revokeUserRole({ assignmentId })).resolves.toEqual({
      success: false,
      errorCode: "FORBIDDEN",
    });
    expect(harness.transaction.userRoleAssignment.count).toHaveBeenCalled();
    expect(harness.transaction.userRoleAssignment.count).toHaveBeenCalledWith({
      where: expect.objectContaining({
        user: expect.objectContaining({
          permissionOverrides: {
            none: expect.objectContaining({
              effect: "DENY",
              countryId: null,
              teamId: null,
            }),
          },
          OR: expect.any(Array),
        }),
      }),
    });
    expect(harness.assignmentDelete).not.toHaveBeenCalled();
  });

  it("prevents revoking the only active GLOBAL assignment that grants catalog:manage through a custom role", async () => {
    const harness = createHarness({
      role: {
        id: roleId,
        key: "SUPERADMIN",
        isSystem: false,
        priority: 400,
      },
      actorRolePriority: 500,
      remainingGlobalAdministrators: 0,
    });

    await expect(revokeUserRole({ assignmentId })).resolves.toEqual({
      success: false,
      errorCode: "FORBIDDEN",
    });
    expect(harness.transaction.userRoleAssignment.count).toHaveBeenCalled();
    const revokeWhere = harness.transaction.userRoleAssignment.count.mock.calls[0][0].where;
    expect(revokeWhere.role).toBeUndefined();
    expect(
      revokeWhere.user.OR[1].roleAssignments.some.id,
    ).toEqual({ not: assignmentId });
    expect(harness.assignmentDelete).not.toHaveBeenCalled();
  });

  it("prevents disabling catalog:manage on the only active GLOBAL custom role that grants it", async () => {
    const harness = createHarness({
      role: {
        id: roleId,
        key: "SUPERADMIN",
        isSystem: false,
        priority: 400,
      },
      permission: { id: permissionId, key: "catalog:manage" },
      existingRolePermission: { id: "relation-id" },
      actorRolePriority: 500,
      remainingGlobalAdministrators: 0,
    });

    await expect(
      setRolePermission({ roleId, permissionId, enabled: false }),
    ).resolves.toEqual({ success: false, errorCode: "FORBIDDEN" });
    expect(harness.transaction.userRoleAssignment.count).toHaveBeenCalled();
    const disableWhere = harness.transaction.userRoleAssignment.count.mock.calls[0][0].where;
    expect(disableWhere.role).toBeUndefined();
    expect(
      disableWhere.user.OR[1].roleAssignments.some.roleId,
    ).toEqual({ not: roleId });
    expect(harness.rolePermissionDelete).not.toHaveBeenCalled();
  });

  it("integrates concurrent identical assignments through one atomic upsert record", async () => {
    const harness = createHarness();
    const input = {
      userId: targetId,
      roleId,
      scopeType: "GLOBAL" as const,
    };

    const results = await Promise.all([
      assignUserRole(input),
      assignUserRole(input),
    ]);

    expect(results).toEqual([
      { success: true, entityId: assignmentId, emailStatus: "SENT" },
      { success: true, entityId: assignmentId, emailStatus: "SENT" },
    ]);
    expect(harness.assignments).toHaveLength(1);
    expect(harness.assignmentUpsert).toHaveBeenCalledTimes(2);
    expect(harness.transaction.userRoleAssignment.create).not.toHaveBeenCalled();
  });

  it("re-evaluates assignment authorization using transaction-scoped reads", async () => {
    const harness = createHarness();
    harness.actorAssignmentsFindMany.mockImplementation(async () => {
      expect(harness.isInsideTransaction()).toBe(true);
      return [
        {
          scopeType: "GLOBAL",
          countryId: null,
          teamId: null,
          team: null,
          role: { priority: 500 },
        },
      ];
    });
    mocks.getEffectivePermissions.mockImplementation(async () => {
      expect(harness.isInsideTransaction()).toBe(true);
      return { can: () => true, permissions: new Set(["team:manage"]) };
    });

    await expect(
      assignUserRole({ userId: targetId, roleId, scopeType: "GLOBAL" }),
    ).resolves.toEqual({ success: true, entityId: assignmentId, emailStatus: "SENT" });
  });

  it("uses a human-readable country label in access notifications", async () => {
    const countryId = "cmrl0x4sa001580o3h9q67aad";
    const harness = createHarness({
      country: { id: countryId, name: "México" },
    });

    await expect(
      assignUserRole({
        userId: targetId,
        roleId,
        scopeType: "COUNTRY",
        countryId,
      }),
    ).resolves.toMatchObject({ success: true });

    expect(mocks.queueAccountNotification).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({ scopeLabel: "México" }),
    );
    expect(harness.transaction.country.findUnique).toHaveBeenCalledWith({
      where: { id: countryId },
      select: { id: true, name: true },
    });
  });

  it("re-evaluates revocation authorization using transaction-scoped reads", async () => {
    const harness = createHarness({ remainingGlobalAdministrators: 2 });
    harness.assignmentFindUnique.mockImplementation(async () => {
      expect(harness.isInsideTransaction()).toBe(true);
      return {
        id: assignmentId,
        userId: targetId,
        roleId,
        scopeType: "GLOBAL",
        countryId: null,
        teamId: null,
        team: null,
        user: { accessStatus: "ACTIVE" },
        role: {
          id: roleId,
          key: "CUSTOM_MANAGER",
          isSystem: false,
          priority: 400,
          permissions: [],
        },
      };
    });
    harness.actorAssignmentsFindMany.mockImplementation(async () => {
      expect(harness.isInsideTransaction()).toBe(true);
      return [
        {
          scopeType: "GLOBAL",
          countryId: null,
          teamId: null,
          team: null,
          role: { priority: 500 },
        },
      ];
    });
    mocks.getEffectivePermissions.mockImplementation(async () => {
      expect(harness.isInsideTransaction()).toBe(true);
      return { can: () => true, permissions: new Set(["team:manage"]) };
    });

    await expect(revokeUserRole({ assignmentId })).resolves.toEqual({
      success: true,
      emailStatus: "SENT",
    });
    expect(harness.assignmentDelete).toHaveBeenCalledWith({
      where: { id: assignmentId },
    });
  });
});
