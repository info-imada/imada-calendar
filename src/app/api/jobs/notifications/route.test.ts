import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  queueDueActivityReminders: vi.fn(),
  dispatchNotificationIds: vi.fn(),
  dispatchPendingNotifications: vi.fn(),
}));

vi.mock("@/lib/notifications/activity-notifications", () => ({
  queueDueActivityReminders: mocks.queueDueActivityReminders,
}));
vi.mock("@/lib/notifications/dispatcher", () => ({
  dispatchNotificationIds: mocks.dispatchNotificationIds,
  dispatchPendingNotifications: mocks.dispatchPendingNotifications,
}));

import { GET, POST } from "@/app/api/jobs/notifications/route";

describe("notification job", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.NOTIFICATION_JOB_SECRET = "a-secure-notification-job-secret-123";
    delete process.env.CRON_SECRET;
    mocks.queueDueActivityReminders.mockResolvedValue(["email-1"]);
    mocks.dispatchNotificationIds.mockResolvedValue({ claimed: 1, sent: 1, failed: 0, skipped: 0 });
    mocks.dispatchPendingNotifications.mockResolvedValue({ claimed: 2, sent: 1, failed: 1, skipped: 0 });
  });

  it("rejects an invalid bearer token", async () => {
    const response = await POST(new Request("https://calendar.example.com/api/jobs/notifications", { method: "POST", headers: { authorization: "Bearer incorrect" } }));
    expect(response.status).toBe(401);
  });

  it("queues reminders and returns sanitized counts", async () => {
    const response = await POST(new Request("https://calendar.example.com/api/jobs/notifications", { method: "POST", headers: { authorization: `Bearer ${process.env.NOTIFICATION_JOB_SECRET}` } }));
    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({ claimed: 3, sent: 2, failed: 1, skipped: 0 });
  });

  it("accepts Vercel Cron GET requests with CRON_SECRET", async () => {
    process.env.CRON_SECRET = "a-vercel-cron-secret-123456789";
    const response = await GET(new Request("https://calendar.example.com/api/jobs/notifications", { method: "GET", headers: { authorization: `Bearer ${process.env.CRON_SECRET}` } }));
    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({ claimed: 3, sent: 2, failed: 1, skipped: 0 });
  });
});
