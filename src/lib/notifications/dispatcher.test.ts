import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  sendEmail: vi.fn(),
  updateMany: vi.fn(),
  findUnique: vi.fn(),
  findMany: vi.fn(),
  update: vi.fn(),
}));

vi.mock("@/lib/email/config", () => ({
  getEmailConfig: () => ({ appUrl: "https://calendar.example.com" }),
}));
vi.mock("@/lib/email/resend", () => ({ sendEmail: mocks.sendEmail }));
vi.mock("@/lib/prisma", () => ({
  getPrisma: () => ({
    emailNotification: {
      updateMany: mocks.updateMany,
      findUnique: mocks.findUnique,
      findMany: mocks.findMany,
      update: mocks.update,
    },
  }),
}));

import { dispatchNotificationIds } from "@/lib/notifications/dispatcher";

const row = {
  id: "email-1",
  kind: "ACTIVITY_CREATED",
  entityType: "Activity",
  entityId: "activity-1",
  payload: {
    kind: "ACTIVITY_CREATED",
    activity: {
      id: "activity-1",
      title: "Visita",
      startsAt: "2026-08-13T12:00:00.000Z",
      endsAt: "2026-08-13T13:00:00.000Z",
      allDay: false,
      country: "Panamá",
      type: "Visita técnica",
      status: "Planificada",
      priority: "Media",
    },
  },
  dedupeKey: "audit-1:ACTIVITY_CREATED",
  toRecipients: ["tech@example.com"],
  ccRecipients: ["admin@example.com", "leader@example.com"],
  status: "PENDING",
  attemptCount: 0,
  nextAttemptAt: new Date(),
  lockedAt: null,
  sentAt: null,
  providerId: null,
  lastError: null,
  createdAt: new Date(),
  updatedAt: new Date(),
};

describe("email notification dispatcher", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.updateMany.mockResolvedValue({ count: 1 });
    mocks.findUnique.mockResolvedValue(row);
    mocks.update.mockResolvedValue(row);
  });

  it("sends one provider message with the operational recipient and supervisor cc", async () => {
    mocks.sendEmail.mockResolvedValue({ success: true, id: "resend-1" });
    await expect(dispatchNotificationIds([row.id])).resolves.toEqual({ claimed: 1, sent: 1, failed: 0, skipped: 0 });
    expect(mocks.sendEmail).toHaveBeenCalledTimes(1);
    expect(mocks.sendEmail).toHaveBeenCalledWith(expect.objectContaining({
      to: ["tech@example.com"],
      cc: ["admin@example.com", "leader@example.com"],
    }));
    expect(mocks.update).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({ status: "SENT", providerId: "resend-1" }),
    }));
  });

  it("does not call Resend when another worker already claimed the row", async () => {
    mocks.updateMany.mockResolvedValue({ count: 0 });
    await expect(dispatchNotificationIds([row.id])).resolves.toEqual({ claimed: 0, sent: 0, failed: 0, skipped: 0 });
    expect(mocks.sendEmail).not.toHaveBeenCalled();
  });
});
