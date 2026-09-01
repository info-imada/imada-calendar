import { RecurrenceFrequency } from "@prisma/client";
import { z } from "zod";

import { errorMessages } from "@/messages/errors";

const recurrenceInputSchema = z.object({
  frequency: z.nativeEnum(RecurrenceFrequency),
  interval: z.coerce.number().int().min(1).max(12),
  endsAt: z.coerce.date(),
  timezone: z.string().trim().min(1).max(64).default("America/Panama"),
});

const activityFields = {
  title: z.string().trim().min(3).max(160),
  description: z.string().trim().max(4000).optional(),
  startsAt: z.coerce.date(),
  endsAt: z.coerce.date(),
  allDay: z.boolean().default(false),
  countryId: z.string().cuid(),
  teamId: z.string().cuid().optional(),
  customerId: z.string().cuid().optional(),
  typeId: z.string().cuid(),
  statusId: z.string().cuid(),
  priorityId: z.string().cuid(),
  assignedToId: z.string().cuid().optional(),
  partNumber: z.string().trim().max(120).optional(),
  partUrl: z.string().trim().url().max(2048).optional(),
} as const;

type ScheduleValue = {
  startsAt: Date;
  endsAt: Date;
  recurrence?: { endsAt: Date };
};

function validateSchedule(value: ScheduleValue, context: z.RefinementCtx) {
  if (value.endsAt <= value.startsAt) {
    context.addIssue({
      code: "custom",
      path: ["endsAt"],
      message: errorMessages.validation.endBeforeStart,
    });
  }

  if (value.recurrence && value.recurrence.endsAt < value.startsAt) {
    context.addIssue({
      code: "custom",
      path: ["recurrence", "endsAt"],
      message: errorMessages.validation.recurrenceBeforeStart,
    });
  }
}

export const activityInputSchema = z
  .object({ ...activityFields, recurrence: recurrenceInputSchema.optional() })
  .superRefine(validateSchedule);

export const activityUpdateInputSchema = z
  .object({ activityId: z.string().cuid(), ...activityFields })
  .superRefine(validateSchedule);

export const activityStatusInputSchema = z.object({
  activityId: z.string().cuid(),
  statusId: z.string().cuid(),
});

export const activityCancelInputSchema = z.object({
  activityId: z.string().cuid(),
});

export const activityCommentInputSchema = z.object({
  activityId: z.string().cuid(),
  body: z.string().trim().min(2).max(4000),
});

export type ActivityInput = z.infer<typeof activityInputSchema>;
export type ActivityUpdateInput = z.infer<typeof activityUpdateInputSchema>;
export type ActivityStatusInput = z.infer<typeof activityStatusInputSchema>;
export type ActivityCancelInput = z.infer<typeof activityCancelInputSchema>;
export type ActivityCommentInput = z.infer<typeof activityCommentInputSchema>;
