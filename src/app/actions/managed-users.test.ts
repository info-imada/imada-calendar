import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  getCurrentUser: vi.fn(),
  getEffectivePermissions: vi.fn(),
  getPrisma: vi.fn(),
  requireAdministrationAccess: vi.fn(),
  revalidatePath: vi.fn(),
  queueAccountNotification: vi.fn(),
  sendEphemeralCredentialEmail: vi.fn(),
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
  sendEphemeralCredentialEmail: mocks.sendEphemeralCredentialEmail,
}));
vi.mock("@/lib/notifications/dispatcher", () => ({
  dispatchNotificationIds: mocks.dispatchNotificationIds,
}));

import {
  createManagedUser,
  updateManagedUser,
} from "@/app/actions/authorization";

const actorId = "cmrl0x4sa000180o3h9q67aaa";
const userId = "cmrl0x4sa000280o3h9q67aaa";
const roleId = "cmrl0x4sa001480o3h9q67aaa";

function createManagedUserHarness({
  actorPriority = 500,
  canManageCatalog = true,
  rolePriority = 200,
  linkedZoho = false,
  country = null as { id: string; name: string } | null,
} = {}) {
  const auditCreate = vi.fn().mockResolvedValue({ id: "audit" });
  const credentialCreate = vi.fn().mockResolvedValue({ userId });
  const assignmentCreate = vi.fn().mockResolvedValue({ id: "cmrl0x4sa001480o3h9q67aac" });
  const userCreate = vi.fn().mockResolvedValue({
    id: userId,
    name: "Ana Torres",
    email: "ana@example.com",
    accessStatus: "ACTIVE",
  });
  const userUpdate = vi.fn().mockResolvedValue({
    id: userId,
    name: "Ana María Torres",
    email: "ana.nueva@example.com",
  });
  const assignmentUpdate = vi.fn().mockResolvedValue({ id: "cmrl0x4sa001480o3h9q67aac" });
  const transaction = {
    auditLog: { create: auditCreate },
    role: {
      findUnique: vi.fn().mockResolvedValue({
        id: roleId,
        key: "TECNICO",
        priority: rolePriority,
      }),
    },
    team: { findUnique: vi.fn().mockResolvedValue(null) },
    country: { findUnique: vi.fn().mockResolvedValue(country) },
    user: {
      create: userCreate,
      findUnique: vi.fn().mockResolvedValue({
        id: userId,
        name: "Ana Torres",
        email: "ana@example.com",
        accounts: linkedZoho ? [{ provider: "zoho" }] : [],
        accessStatus: "ACTIVE",
        roleAssignments: [{
          id: "cmrl0x4sa001480o3h9q67aac",
          roleId: "old-role",
          scopeType: "GLOBAL",
          countryId: null,
          teamId: null,
          scopeKey: "GLOBAL",
          role: {
            id: "old-role",
            key: "TECNICO",
            name: "Técnico",
            priority: rolePriority,
            permissions: [],
          },
        }],
      }),
      update: userUpdate,
    },
    userCredential: { create: credentialCreate },
    userPermissionOverride: { findMany: vi.fn().mockResolvedValue([]) },
    userRoleAssignment: {
      create: assignmentCreate,
      update: assignmentUpdate,
      findMany: vi.fn().mockResolvedValue([
        {
          scopeType: "GLOBAL",
          countryId: null,
          teamId: null,
          team: null,
          role: { priority: actorPriority },
        },
      ]),
    },
  };
  const prisma = {
    ...transaction,
    $transaction: (callback: (tx: typeof transaction) => unknown) => callback(transaction),
  };

  mocks.getPrisma.mockReturnValue(prisma);
  mocks.getCurrentUser.mockResolvedValue({ id: actorId });
  mocks.requireAdministrationAccess.mockResolvedValue({
    can: (permission: string) =>
      permission === "team:manage" ||
      (canManageCatalog && permission === "catalog:manage"),
    permissions: new Set([
      "team:manage",
      ...(canManageCatalog ? ["catalog:manage"] : []),
    ]),
    roles: ["ADMIN"],
  });

  return {
    assignmentCreate,
    auditCreate,
    credentialCreate,
    transaction,
    userCreate,
    userUpdate,
    assignmentUpdate,
  };
}

describe("managed user mutations", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.queueAccountNotification.mockResolvedValue(["email-1"]);
    mocks.sendEphemeralCredentialEmail.mockResolvedValue("SENT");
    mocks.dispatchNotificationIds.mockResolvedValue({ claimed: 1, sent: 1, failed: 0, skipped: 0 });
  });

  it("creates a local account, initial assignment and audit records without exposing its secret", async () => {
    const harness = createManagedUserHarness();

    const result = await createManagedUser({
      accessStatus: "ACTIVE",
      authMethod: "LOCAL",
      email: "ana@example.com",
      name: "Ana Torres",
      roleId,
      scopeType: "GLOBAL",
    });

    expect(result).toMatchObject({
      success: true,
      entityId: userId,
      temporaryPassword: expect.stringMatching(/^Combi-/),
    });
    expect(harness.credentialCreate).toHaveBeenCalledWith({
      data: expect.objectContaining({
        mustChangePassword: true,
        passwordHash: expect.not.stringMatching(/^Combi-/),
        userId,
      }),
    });
    expect(harness.assignmentCreate).toHaveBeenCalledWith({
      data: expect.objectContaining({
        createdById: actorId,
        roleId,
        scopeKey: "GLOBAL",
        scopeType: "GLOBAL",
        userId,
      }),
    });
    expect(JSON.stringify(harness.auditCreate.mock.calls)).not.toContain(
      result.success ? result.temporaryPassword : "",
    );
    expect(harness.auditCreate).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({ action: "CREATE_MANAGED_USER", actorId }),
    }));
  });

  it("pre-registers a Zoho account without creating a local credential", async () => {
    const harness = createManagedUserHarness();

    await expect(createManagedUser({
      accessStatus: "PENDING",
      authMethod: "ZOHO",
      email: "zoho@example.com",
      name: "Usuario Zoho",
      roleId,
      scopeType: "GLOBAL",
    })).resolves.toEqual({ success: true, entityId: userId, emailStatus: "SENT" });

    expect(harness.credentialCreate).not.toHaveBeenCalled();
  });

  it("allows a global administrator to create an equal-priority administrator", async () => {
    const harness = createManagedUserHarness({ actorPriority: 500, rolePriority: 500 });

    await expect(createManagedUser({
      accessStatus: "ACTIVE",
      authMethod: "ZOHO",
      email: "peer@example.com",
      name: "Peer Admin",
      roleId,
      scopeType: "GLOBAL",
    })).resolves.toEqual({ success: true, entityId: userId, emailStatus: "SENT" });

    expect(harness.assignmentCreate).toHaveBeenCalledWith({
      data: expect.objectContaining({
        roleId,
        scopeKey: "GLOBAL",
        scopeType: "GLOBAL",
        userId,
      }),
    });
  });

  it("rejects an equal-priority role when the actor is not a global administrator", async () => {
    const harness = createManagedUserHarness({
      actorPriority: 500,
      canManageCatalog: false,
      rolePriority: 500,
    });

    await expect(createManagedUser({
      accessStatus: "ACTIVE",
      authMethod: "ZOHO",
      email: "peer@example.com",
      name: "Peer Admin",
      roleId,
      scopeType: "GLOBAL",
    })).resolves.toEqual({ success: false, errorCode: "FORBIDDEN" });

    expect(harness.userCreate).not.toHaveBeenCalled();
  });

  it("maps a duplicate email to a conflict", async () => {
    const harness = createManagedUserHarness();
    harness.userCreate.mockRejectedValue({ code: "P2002" });

    await expect(createManagedUser({
      accessStatus: "ACTIVE",
      authMethod: "ZOHO",
      email: "existing@example.com",
      name: "Existing User",
      roleId,
      scopeType: "GLOBAL",
    })).resolves.toEqual({ success: false, errorCode: "CONFLICT" });
  });

  it("updates an editable identity and audits before/after values", async () => {
    const harness = createManagedUserHarness();

    await expect(updateManagedUser({
      email: "ana.nueva@example.com",
      name: "Ana María Torres",
      userId,
    })).resolves.toEqual({ success: true, entityId: userId });

    expect(harness.userUpdate).toHaveBeenCalledWith({
      where: { id: userId },
      data: { email: "ana.nueva@example.com", name: "Ana María Torres" },
      select: { email: true, id: true, name: true },
    });
    expect(harness.auditCreate).toHaveBeenCalledWith({
      data: expect.objectContaining({
        action: "UPDATE_MANAGED_USER",
        actorId,
        entityId: userId,
        metadata: {
          before: { email: "ana@example.com", name: "Ana Torres" },
          after: { email: "ana.nueva@example.com", name: "Ana María Torres" },
        },
      }),
    });
  });

  it("rejects self-editing", async () => {
    createManagedUserHarness();
    mocks.getCurrentUser.mockResolvedValue({ id: userId });

    await expect(updateManagedUser({
      email: "ana@example.com",
      name: "Ana Torres",
      userId,
    })).resolves.toEqual({ success: false, errorCode: "FORBIDDEN" });
  });

  it("updates the selected role assignment in the same audited operation", async () => {
    const harness = createManagedUserHarness();
    mocks.getEffectivePermissions.mockResolvedValue({
      can: (permission: string) => permission === "team:manage",
      roles: ["ADMIN"],
    });

    const result = await updateManagedUser({
      assignmentId: "cmrl0x4sa001480o3h9q67aac",
      email: "ana@example.com",
      name: "Ana Torres",
      roleId,
      scopeType: "GLOBAL",
      userId,
    });
    expect(result).toMatchObject({ success: true, entityId: userId });

    expect(harness.assignmentUpdate).toHaveBeenCalledWith({
      where: { id: "cmrl0x4sa001480o3h9q67aac" },
      data: {
        countryId: null,
        roleId,
        scopeKey: "GLOBAL",
        scopeType: "GLOBAL",
        teamId: null,
      },
    });
    expect(harness.auditCreate).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({ action: "UPDATE_ROLE_ASSIGNMENT" }),
    }));
  });

  it("uses the country name when notifying about an edited assignment", async () => {
    const countryId = "cmrl0x4sa001580o3h9q67aad";
    const harness = createManagedUserHarness({
      country: { id: countryId, name: "México" },
    });
    mocks.getEffectivePermissions.mockResolvedValue({
      can: (permission: string) => permission === "team:manage",
      roles: ["ADMIN"],
    });

    await expect(updateManagedUser({
      assignmentId: "cmrl0x4sa001480o3h9q67aac",
      email: "ana@example.com",
      name: "Ana Torres",
      roleId,
      scopeType: "COUNTRY",
      countryId,
      userId,
    })).resolves.toMatchObject({ success: true, entityId: userId });

    expect(mocks.queueAccountNotification).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({ scopeLabel: "México" }),
    );
    expect(harness.transaction.country.findUnique).toHaveBeenCalledWith({
      where: { id: countryId },
      select: { id: true, name: true },
    });
  });

  it("does not change the email of an identity already linked to Zoho", async () => {
    const harness = createManagedUserHarness({ linkedZoho: true });

    await expect(updateManagedUser({
      email: "changed@example.com",
      name: "Ana Torres",
      userId,
    })).resolves.toEqual({ success: false, errorCode: "FORBIDDEN" });
    expect(harness.userUpdate).not.toHaveBeenCalled();
  });
});
