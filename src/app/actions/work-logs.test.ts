import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => {
  const transaction = {
    country: { findUnique: vi.fn() },
    team: { findFirst: vi.fn() },
    activity: { findUnique: vi.fn() },
    workLog: { findFirst: vi.fn(), findUnique: vi.fn(), create: vi.fn(), update: vi.fn(), delete: vi.fn() },
    customer: { findFirst: vi.fn() },
    customerLocation: { findFirst: vi.fn() },
    auditLog: { create: vi.fn() },
  };
  return {
    transaction,
    prisma: { $transaction: vi.fn(async (callback: (tx: typeof transaction) => unknown) => callback(transaction)) },
    getCurrentUser: vi.fn(),
    requirePermission: vi.fn(),
    getEffectivePermissions: vi.fn(),
    queueWorkLogNotification: vi.fn().mockResolvedValue([]),
    revalidatePath: vi.fn(),
  };
});

vi.mock("@/lib/auth", () => ({ getCurrentUser: mocks.getCurrentUser }));
vi.mock("@/lib/permissions", () => ({ requirePermission: mocks.requirePermission, getEffectivePermissions: mocks.getEffectivePermissions }));
vi.mock("@/lib/prisma", () => ({ getPrisma: () => mocks.prisma }));
vi.mock("@/lib/notifications/work-log-notifications", () => ({ queueWorkLogNotification: mocks.queueWorkLogNotification }));
vi.mock("next/cache", () => ({ revalidatePath: mocks.revalidatePath }));

import {
  completeWorkLog,
  finishWorkLog,
  startWorkLog,
} from "@/app/actions/work-logs";

const user = { id: "cmrl0x4sa000980o3h9q67awx", timezone: "America/Panama" };
const countryId = "cmrl0x4sa000280o3h9q67aaa";
const teamId = "cmrl0x4sa001480o3h9q67aaa";
const workLogId = "cmrl0x4sa001480o3h9q67aab";

describe("work log lifecycle actions", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.getCurrentUser.mockResolvedValue(user);
    mocks.requirePermission.mockResolvedValue(undefined);
    mocks.transaction.country.findUnique.mockResolvedValue({ id: countryId });
    mocks.transaction.team.findFirst.mockResolvedValue({ id: teamId });
    mocks.transaction.workLog.findFirst.mockResolvedValue(null);
    mocks.transaction.workLog.create.mockResolvedValue({ id: workLogId, status: "IN_PROGRESS", activityId: null });
    mocks.transaction.auditLog.create.mockResolvedValue({ id: "audit-1" });
  });

  it("uses the authenticated server time and creates one active jornada", async () => {
    const result = await startWorkLog({ countryId, teamId });

    expect(result).toMatchObject({ success: true, workLogId, status: "IN_PROGRESS", activityId: null });
    expect(mocks.transaction.workLog.create).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({
        userId: user.id,
        countryId,
        teamId,
        status: "IN_PROGRESS",
        activeKey: user.id,
      }),
    }));
    expect(mocks.transaction.auditLog.create).toHaveBeenCalled();
  });

  it("rejects a second active jornada as a conflict", async () => {
    mocks.transaction.workLog.findFirst.mockResolvedValue({ id: "already-active" });

    await expect(startWorkLog({ countryId })).resolves.toMatchObject({ success: false, errorCode: "CONFLICT" });
  });

  it("freezes the server end time and calculates duration", async () => {
    mocks.transaction.workLog.findUnique.mockResolvedValue({
      id: workLogId,
      userId: user.id,
      countryId,
      teamId,
      status: "IN_PROGRESS",
      startedAt: new Date(Date.now() - 61_000),
      activeKey: user.id,
      activityId: null,
    });
    mocks.transaction.workLog.update.mockResolvedValue({ id: workLogId, status: "COMPLETION_PENDING", durationMinutes: 1, activityId: null });

    const result = await finishWorkLog({ workLogId });

    expect(result).toMatchObject({ success: true, status: "COMPLETION_PENDING", durationMinutes: 1 });
    expect(mocks.transaction.workLog.update).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({ status: "COMPLETION_PENDING", activeKey: user.id }),
    }));
  });

  it("does not reach the database when completion fields are missing", async () => {
    const result = await completeWorkLog({ workLogId, attachmentIds: [] } as never);

    expect(result).toMatchObject({ success: false, errorCode: "VALIDATION" });
    expect(mocks.prisma.$transaction).not.toHaveBeenCalled();
  });
});
