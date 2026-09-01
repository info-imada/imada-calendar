import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  getCurrentUser: vi.fn(),
  requirePermission: vi.fn(),
  revalidatePath: vi.fn(),
  countryFindFirst: vi.fn(),
  teamFindFirst: vi.fn(),
  customerFindFirst: vi.fn(),
  customerCount: vi.fn(),
  typeFindFirst: vi.fn(),
  statusFindFirst: vi.fn(),
  priorityFindFirst: vi.fn(),
  userFindFirst: vi.fn(),
  activityFindUnique: vi.fn(),
  activityFindFirst: vi.fn(),
  activityCreate: vi.fn(),
  activityUpdate: vi.fn(),
  seriesCreate: vi.fn(),
  auditCreate: vi.fn(),
  queueActivityNotification: vi.fn(),
  reconcileActivityEmailReminders: vi.fn(),
  dispatchNotificationIds: vi.fn(),
}));

vi.mock("@/lib/auth", () => ({ getCurrentUser: mocks.getCurrentUser }));
vi.mock("@/lib/permissions", () => ({ requirePermission: mocks.requirePermission }));
vi.mock("next/cache", () => ({ revalidatePath: mocks.revalidatePath }));
vi.mock("@/lib/notifications/activity-notifications", () => ({
  queueActivityNotification: mocks.queueActivityNotification,
  reconcileActivityEmailReminders: mocks.reconcileActivityEmailReminders,
}));
vi.mock("@/lib/notifications/dispatcher", () => ({
  dispatchNotificationIds: mocks.dispatchNotificationIds,
}));
vi.mock("@/lib/prisma", () => ({
  getPrisma: () => ({
    activity: { findUnique: mocks.activityFindUnique, update: mocks.activityUpdate },
    activityStatus: { findFirst: mocks.statusFindFirst },
    auditLog: { create: mocks.auditCreate },
    $transaction: async (callback: ((transaction: unknown) => unknown) | unknown[]) => Array.isArray(callback) ? Promise.all(callback) : callback({
      country: { findFirst: mocks.countryFindFirst },
      team: { findFirst: mocks.teamFindFirst },
      customer: { findFirst: mocks.customerFindFirst, count: mocks.customerCount },
      activityType: { findFirst: mocks.typeFindFirst },
      activityStatus: { findFirst: mocks.statusFindFirst, findUnique: mocks.statusFindFirst },
      priority: { findFirst: mocks.priorityFindFirst },
      user: { findFirst: mocks.userFindFirst },
      activity: {
        findUnique: mocks.activityFindUnique,
        findFirst: mocks.activityFindFirst,
        create: mocks.activityCreate,
        update: mocks.activityUpdate,
      },
      activitySeries: { create: mocks.seriesCreate },
      auditLog: { create: mocks.auditCreate },
    }),
  }),
}));

import { changeActivityStatus, createActivity, updateActivity } from "@/app/actions/activities";

const input = {
  title: "Mantenimiento preventivo",
  startsAt: new Date("2026-07-15T13:00:00.000Z"),
  endsAt: new Date("2026-07-15T15:00:00.000Z"),
  allDay: false,
  countryId: "cmrl0x4sa000180o3h9q67awx",
  teamId: "cmrl0x4sa000280o3h9q67awx",
  typeId: "cmrl0x4sa000380o3h9q67awx",
  statusId: "cmrl0x4sa000480o3h9q67awx",
  priorityId: "cmrl0x4sa000580o3h9q67awx",
  assignedToId: "cmrl0x4sa000680o3h9q67awx",
};

describe("activity actions", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.getCurrentUser.mockResolvedValue({ id: "cmrl0x4sa000980o3h9q67awx" });
    mocks.countryFindFirst.mockResolvedValue({ id: input.countryId });
    mocks.teamFindFirst.mockResolvedValue({ id: input.teamId });
    mocks.customerFindFirst.mockResolvedValue(null);
    mocks.customerCount.mockResolvedValue(0);
    mocks.typeFindFirst.mockResolvedValue({ id: input.typeId });
    mocks.statusFindFirst.mockResolvedValue({ id: input.statusId });
    mocks.priorityFindFirst.mockResolvedValue({ id: input.priorityId });
    mocks.userFindFirst.mockResolvedValue({ id: input.assignedToId });
    mocks.activityFindFirst.mockResolvedValue(null);
    mocks.activityFindUnique.mockResolvedValue({
      id: "cmrl0x4sa001180o3h9q67awx",
      countryId: input.countryId,
      teamId: input.teamId,
      assignedToId: null,
      statusId: input.statusId,
    });
    mocks.activityUpdate.mockResolvedValue({ id: "cmrl0x4sa001180o3h9q67awx" });
    mocks.auditCreate.mockResolvedValue({ id: "audit-1" });
    mocks.queueActivityNotification.mockResolvedValue(["notification-1"]);
    mocks.dispatchNotificationIds.mockResolvedValue({ claimed: 1, sent: 1, failed: 0, skipped: 0 });
    mocks.seriesCreate.mockResolvedValue({ id: "cmrl0x4sa001080o3h9q67awx" });
    mocks.activityCreate
      .mockResolvedValueOnce({ id: "cmrl0x4sa001180o3h9q67awx" })
      .mockResolvedValueOnce({ id: "cmrl0x4sa001280o3h9q67awx" })
      .mockResolvedValueOnce({ id: "cmrl0x4sa001380o3h9q67awx" });
  });

  it("creates and audits each occurrence in a recurring activity", async () => {
    const result = await createActivity({
      ...input,
      recurrence: {
        frequency: "DAILY",
        interval: 1,
        endsAt: new Date("2026-07-17T13:00:00.000Z"),
        timezone: "America/Panama",
      },
    });

    expect(result).toEqual({ success: true, activityId: "cmrl0x4sa001180o3h9q67awx", createdCount: 3 });
    expect(mocks.requirePermission).toHaveBeenCalledWith(expect.any(String), "activity:create", expect.objectContaining({ countryId: input.countryId, teamId: input.teamId }));
    expect(mocks.requirePermission).toHaveBeenCalledWith(expect.any(String), "activity:assign", expect.objectContaining({ countryId: input.countryId, teamId: input.teamId }));
    expect(mocks.activityCreate).toHaveBeenCalledTimes(3);
    expect(mocks.auditCreate).toHaveBeenCalledTimes(3);
    expect(mocks.revalidatePath).toHaveBeenCalledWith("/activities");
  });

  it("blocks a technician overlap before writing", async () => {
    mocks.activityFindFirst.mockResolvedValue({ id: "existing-activity" });

    await expect(createActivity(input)).resolves.toEqual({ success: false, errorCode: "CONFLICT" });
    expect(mocks.activityCreate).not.toHaveBeenCalled();
    expect(mocks.auditCreate).not.toHaveBeenCalled();
  });

  it("does not audit a reassignment when an unassigned activity stays unassigned", async () => {
    const result = await updateActivity({
      activityId: "cmrl0x4sa001180o3h9q67awx",
      ...input,
      assignedToId: undefined,
    });

    expect(result).toEqual({ success: true, activityId: "cmrl0x4sa001180o3h9q67awx" });
    expect(mocks.auditCreate).toHaveBeenCalledTimes(1);
    expect(mocks.auditCreate).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({ action: "UPDATE_ACTIVITY" }),
    }));
    expect(mocks.requirePermission).not.toHaveBeenCalledWith(
      expect.any(String),
      "activity:assign",
      expect.anything(),
    );
  });

  it("persists and audits a Kanban status change through the shared action", async () => {
    mocks.statusFindFirst.mockResolvedValue({ id: "cmrl0x4sa001480o3h9q67awx" });

    const result = await changeActivityStatus({
      activityId: "cmrl0x4sa001180o3h9q67awx",
      statusId: "cmrl0x4sa001480o3h9q67awx",
    });

    expect(result).toEqual({ success: true, activityId: "cmrl0x4sa001180o3h9q67awx" });
    expect(mocks.activityUpdate).toHaveBeenCalledWith({
      where: { id: "cmrl0x4sa001180o3h9q67awx" },
      data: { statusId: "cmrl0x4sa001480o3h9q67awx" },
    });
    expect(mocks.auditCreate).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({
        action: "CHANGE_ACTIVITY_STATUS",
        metadata: expect.objectContaining({ to: "cmrl0x4sa001480o3h9q67awx" }),
      }),
    }));
    expect(mocks.revalidatePath).toHaveBeenCalledWith("/");
  });
});
