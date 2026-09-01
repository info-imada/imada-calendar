import { z } from "zod";

import { workLogAttachmentIdsSchema } from "@/lib/validations/work-log-attachments";

const cuid = z.string().cuid();
const optionalText = (max: number) => z.string().trim().max(max).optional();
const requiredText = (max: number) => z.string().trim().min(1).max(max);

export const startWorkLogInputSchema = z.union([
  z.object({ activityId: cuid }),
  z.object({ countryId: cuid, teamId: cuid.optional() }),
]);

const workLogFields = {
  customerId: cuid.optional(),
  customerLocationId: cuid.optional(),
  machineReference: optionalText(255),
  location: optionalText(255),
  description: optionalText(10_000),
  attachmentIds: workLogAttachmentIdsSchema,
};

export const draftWorkLogInputSchema = z.object({
  workLogId: cuid,
  ...workLogFields,
});

export const completeWorkLogInputSchema = z.object({
  workLogId: cuid,
  customerId: cuid,
  customerLocationId: cuid.optional(),
  machineReference: requiredText(255),
  location: optionalText(255),
  description: requiredText(10_000),
  attachmentIds: workLogAttachmentIdsSchema,
}).superRefine((value, context) => {
  if (!value.customerLocationId && !value.location) {
    context.addIssue({
      code: z.ZodIssueCode.custom,
      path: ["customerLocationId"],
      message: "Selecciona una ubicación o indica una ubicación manual.",
    });
  }
});

export const finishWorkLogInputSchema = z.object({ workLogId: cuid });
export const resetWorkLogStartInputSchema = z.object({ workLogId: cuid });
export const deleteWorkLogInputSchema = z.object({ workLogId: cuid });

export const adminUpdateWorkLogInputSchema = draftWorkLogInputSchema;

export type StartWorkLogInput = z.infer<typeof startWorkLogInputSchema>;
export type DraftWorkLogInput = z.infer<typeof draftWorkLogInputSchema>;
export type CompleteWorkLogInput = z.infer<typeof completeWorkLogInputSchema>;
export type FinishWorkLogInput = z.infer<typeof finishWorkLogInputSchema>;
export type ResetWorkLogStartInput = z.infer<typeof resetWorkLogStartInputSchema>;
export type DeleteWorkLogInput = z.infer<typeof deleteWorkLogInputSchema>;
export type AdminUpdateWorkLogInput = z.infer<typeof adminUpdateWorkLogInputSchema>;
