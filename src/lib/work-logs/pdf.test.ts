import { describe, expect, it } from "vitest";

import { buildWorkLogPdf } from "@/lib/work-logs/pdf";
import type { WorkLogPresentation } from "@/features/work-logs/work-log-types";

const workLog = {
  id: "log-1", userId: "user-1", technician: { id: "user-1", name: "Ana", email: "ana@example.com" }, activityId: null, activity: null, country: { id: "country-1", code: "PA", name: "Panamá" }, team: null, customer: { id: "customer-1", name: "IMADA", code: null, isActive: false }, customerLocation: { id: "location-1", name: "FINCA", isActive: true }, workDate: "2026-08-31", timezone: "America/Panama", startedAt: "2026-08-31T06:30:00.000Z", endedAt: "2026-08-31T07:30:00.000Z", durationMinutes: 60, status: "COMPLETED", startResetUsedAt: null, completedAt: "2026-08-31T07:30:00.000Z", draftNotifiedAt: null, machineReference: "IMADA-123", location: null, description: "Revisión general", attachments: [], createdAt: "2026-08-31T06:30:00.000Z", updatedAt: "2026-08-31T07:30:00.000Z", capabilities: { canUpdate: false, canFinish: false, canComplete: false, canAdminUpdate: false, canDelete: false },
} satisfies WorkLogPresentation;

describe("work log PDF", () => {
  it("generates a Letter PDF only for completed records", async () => {
    const bytes = await buildWorkLogPdf(workLog);
    expect(new TextDecoder().decode(bytes.slice(0, 5))).toBe("%PDF-");
    await expect(buildWorkLogPdf({ ...workLog, status: "IN_PROGRESS" })).rejects.toThrow("PDF_REQUIRES_COMPLETED_WORK_LOG");
  });
});
