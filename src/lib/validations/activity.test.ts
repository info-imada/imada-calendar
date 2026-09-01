import { describe, expect, it } from "vitest";

import {
  activityCommentInputSchema,
  activityInputSchema,
  activityStatusInputSchema,
  activityUpdateInputSchema,
} from "@/lib/validations/activity";

const validActivity = {
  title: "Mantenimiento preventivo",
  description: "Inspección programada",
  startsAt: "2026-07-15T08:00:00.000Z",
  endsAt: "2026-07-15T10:00:00.000Z",
  allDay: false,
  countryId: "cmrl0x4sa000180o3h9q67awx",
  teamId: "cmrl0x4sa000280o3h9q67awx",
  typeId: "cmrl0x4sa000380o3h9q67awx",
  statusId: "cmrl0x4sa000480o3h9q67awx",
  priorityId: "cmrl0x4sa000580o3h9q67awx",
  assignedToId: "cmrl0x4sa000680o3h9q67awx",
};

describe("activity validation", () => {
  it("accepts a bounded recurring activity and coerces its dates", () => {
    const result = activityInputSchema.safeParse({
      ...validActivity,
      recurrence: {
        frequency: "WEEKLY",
        interval: "1",
        endsAt: "2026-08-12T08:00:00.000Z",
        timezone: "America/Panama",
      },
    });

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.startsAt).toBeInstanceOf(Date);
      expect(result.data.recurrence?.interval).toBe(1);
    }
  });

  it("rejects an invalid range and recurrence ending before the first event", () => {
    expect(activityInputSchema.safeParse({ ...validActivity, endsAt: validActivity.startsAt }).success).toBe(false);
    expect(activityInputSchema.safeParse({
      ...validActivity,
      recurrence: { frequency: "DAILY", interval: 1, endsAt: "2026-07-14T08:00:00.000Z", timezone: "America/Panama" },
    }).success).toBe(false);
  });

  it("validates update, status and comment payloads", () => {
    expect(activityUpdateInputSchema.safeParse({ ...validActivity, activityId: "cmrl0x4sa000780o3h9q67awx" }).success).toBe(true);
    expect(activityStatusInputSchema.safeParse({ activityId: "cmrl0x4sa000780o3h9q67awx", statusId: "cmrl0x4sa000480o3h9q67awx" }).success).toBe(true);
    expect(activityCommentInputSchema.safeParse({ activityId: "cmrl0x4sa000780o3h9q67awx", body: "  Nota de seguimiento  " }).success).toBe(true);
    expect(activityCommentInputSchema.safeParse({ activityId: "invalid", body: "" }).success).toBe(false);
  });

  it("accepts an optional customer and part reference but rejects malformed links", () => {
    expect(activityInputSchema.safeParse({
      ...validActivity,
      customerId: "cmrl0x4sa000980o3h9q67awx",
      partNumber: "PART-001",
      partUrl: "https://parts.example.com/PART-001",
    }).success).toBe(true);
    expect(activityInputSchema.safeParse({ ...validActivity, partUrl: "not-a-url" }).success).toBe(false);
  });
});
