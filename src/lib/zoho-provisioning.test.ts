import { beforeEach, describe, expect, it, vi } from "vitest";

const { queueAccountNotification } = vi.hoisted(() => ({ queueAccountNotification: vi.fn() }));
vi.mock("@/lib/notifications/account-notifications", () => ({ queueAccountNotification }));

import { provisionZohoUser } from "@/lib/zoho-provisioning";

function makeStore(input: {
  user: { id: string; email: string | null; name: string | null; accessStatus: "PENDING" | "ACTIVE" | "SUSPENDED" };
  assignment: { id: string } | null;
}) {
  const transaction = {
    user: {
      findUnique: vi.fn().mockResolvedValue(input.user),
      update: vi.fn().mockResolvedValue({ ...input.user, accessStatus: "ACTIVE" }),
    },
    role: { findUnique: vi.fn().mockResolvedValue({ id: "role-tech", name: "Técnico" }) },
    userRoleAssignment: {
      findUnique: vi.fn().mockResolvedValue(input.assignment),
      create: vi.fn().mockResolvedValue({ id: "assignment-tech" }),
    },
    auditLog: { create: vi.fn().mockResolvedValue({ id: "audit-1" }) },
  };
  return {
    transaction,
    store: {
      $transaction: async (callback: (value: typeof transaction) => unknown) => callback(transaction),
    } as unknown as Parameters<typeof provisionZohoUser>[1],
  };
}

describe("provisionZohoUser", () => {
  beforeEach(() => queueAccountNotification.mockReset().mockResolvedValue(["notification-1"]));

  it("activates a pending Zoho user and assigns global Technician access", async () => {
    const { store, transaction } = makeStore({
      user: { id: "user-1", email: "tech@example.com", name: "Técnico", accessStatus: "PENDING" },
      assignment: null,
    });

    await expect(provisionZohoUser({ userId: "user-1", email: "tech@example.com" }, store)).resolves.toEqual({
      userId: "user-1",
      accessStatus: "ACTIVE",
      notificationIds: ["notification-1"],
    });
    expect(transaction.user.update).toHaveBeenCalled();
    expect(transaction.userRoleAssignment.create).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({ roleId: "role-tech", scopeType: "GLOBAL", scopeKey: "GLOBAL" }),
    }));
    expect(queueAccountNotification).toHaveBeenCalledWith(expect.anything(), expect.objectContaining({ kind: "USER_WELCOME", authMethod: "ZOHO" }));
  });

  it("is idempotent for an already provisioned active user", async () => {
    const { store, transaction } = makeStore({
      user: { id: "user-1", email: "tech@example.com", name: "Técnico", accessStatus: "ACTIVE" },
      assignment: { id: "assignment-tech" },
    });

    await expect(provisionZohoUser({ userId: "user-1", email: "tech@example.com" }, store)).resolves.toEqual({
      userId: "user-1",
      accessStatus: "ACTIVE",
      notificationIds: [],
    });
    expect(transaction.user.update).not.toHaveBeenCalled();
    expect(transaction.userRoleAssignment.create).not.toHaveBeenCalled();
    expect(transaction.auditLog.create).not.toHaveBeenCalled();
    expect(queueAccountNotification).not.toHaveBeenCalled();
  });
});
