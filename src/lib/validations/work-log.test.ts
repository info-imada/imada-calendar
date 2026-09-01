import { describe, expect, it } from "vitest";

import {
  completeWorkLogInputSchema,
  draftWorkLogInputSchema,
  startWorkLogInputSchema,
} from "@/lib/validations/work-log";
import { workLogAttachmentInputSchema } from "@/lib/validations/work-log-attachments";

const workLogId = "cmrl0x4sa001480o3h9q67aaa";
const customerId = "cmrl0x4sa000280o3h9q67aaa";
const locationId = "cmrl0x4sa001480o3h9q67aab";

describe("work log validation", () => {
  it("accepts incomplete drafts and normalizes text", () => {
    expect(draftWorkLogInputSchema.parse({ workLogId, description: "  Revisión inicial  ", attachmentIds: [] })).toEqual({
      workLogId,
      description: "Revisión inicial",
      attachmentIds: [],
    });
  });

  it("requires completion fields", () => {
    expect(completeWorkLogInputSchema.safeParse({ workLogId, attachmentIds: [] }).success).toBe(false);
    expect(completeWorkLogInputSchema.safeParse({
      workLogId,
      customerId,
      customerLocationId: locationId,
      machineReference: " IMADA-12345 ",
      description: " Trabajo completado ",
      attachmentIds: [],
    }).success).toBe(true);
  });

  it("accepts either an activity start or a scoped unplanned start", () => {
    expect(startWorkLogInputSchema.safeParse({ activityId: workLogId }).success).toBe(true);
    expect(startWorkLogInputSchema.safeParse({ countryId: customerId, teamId: locationId }).success).toBe(true);
    expect(startWorkLogInputSchema.safeParse({ countryId: customerId }).success).toBe(true);
  });

  it("rejects unsupported attachment MIME and oversized files", () => {
    expect(workLogAttachmentInputSchema.safeParse({ name: "evidence.exe", type: "application/octet-stream", size: 100 })).toHaveProperty("success", false);
    expect(workLogAttachmentInputSchema.safeParse({ name: "evidence.jpg", type: "image/jpeg", size: 100 * 1024 * 1024 + 1 })).toHaveProperty("success", false);
  });
});
