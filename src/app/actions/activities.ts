"use server";

import { AccessStatus, Prisma, ScopeType } from "@prisma/client";
import { revalidatePath } from "next/cache";

import { getCurrentUser } from "@/lib/auth";
import {
  buildOccurrenceWindows,
  hasInternalScheduleOverlap,
  type OccurrenceWindow,
} from "@/lib/activities/schedule";
import { requirePermission } from "@/lib/permissions";
import { getPrisma } from "@/lib/prisma";
import {
  queueActivityNotification,
  reconcileActivityEmailReminders,
} from "@/lib/notifications/activity-notifications";
import { dispatchNotificationIds } from "@/lib/notifications/dispatcher";
import {
  activityCancelInputSchema,
  activityCommentInputSchema,
  activityInputSchema,
  activityStatusInputSchema,
  activityUpdateInputSchema,
  type ActivityCancelInput,
  type ActivityCommentInput,
  type ActivityInput,
  type ActivityStatusInput,
  type ActivityUpdateInput,
} from "@/lib/validations/activity";

type ActivityErrorCode =
  | "UNAUTHORIZED"
  | "FORBIDDEN"
  | "VALIDATION"
  | "CONFLICT"
  | "NOT_FOUND"
  | "RECURRENCE_LIMIT"
  | "UNEXPECTED";
type ActivityFieldErrors = Record<string, string[] | undefined>;

export type ActivityActionResult =
  | {
      success: true;
      activityId: string;
      createdCount?: number;
      commentId?: string;
    }
  | {
      success: false;
      errorCode: ActivityErrorCode;
      fieldErrors?: ActivityFieldErrors;
    };

class ActivityDomainError extends Error {
  constructor(
    readonly code: Exclude<
      ActivityErrorCode,
      "UNAUTHORIZED" | "FORBIDDEN" | "VALIDATION" | "UNEXPECTED"
    >,
  ) {
    super(code);
  }
}

function revalidateActivityRoutes() {
  revalidatePath("/");
  revalidatePath("/activities");
  revalidatePath("/dashboard");
  revalidatePath("/calendar");
}

async function dispatchBestEffort(ids: string[]) {
  if (!ids.length) return;
  try {
    await dispatchNotificationIds(ids);
  } catch (error) {
    console.error("Notification dispatch failed", error);
  }
}

function validationFailure(
  fieldErrors: ActivityFieldErrors,
): ActivityActionResult {
  return { success: false, errorCode: "VALIDATION", fieldErrors };
}

function toActionFailure(error: unknown): ActivityActionResult {
  if (error instanceof ActivityDomainError)
    return { success: false, errorCode: error.code };
  if (error instanceof Error && error.message === "FORBIDDEN")
    return { success: false, errorCode: "FORBIDDEN" };
  if (error instanceof Error && error.message === "RECURRENCE_LIMIT")
    return { success: false, errorCode: "RECURRENCE_LIMIT" };
  if (
    typeof error === "object" &&
    error &&
    "code" in error &&
    error.code === "P2025"
  )
    return { success: false, errorCode: "NOT_FOUND" };
  console.error("Activity operation failed", error);
  return { success: false, errorCode: "UNEXPECTED" };
}

function assignmentScope(countryId: string, teamId?: string) {
  return [
    { scopeType: ScopeType.GLOBAL },
    { scopeType: ScopeType.COUNTRY, countryId },
    ...(teamId ? [{ scopeType: ScopeType.TEAM, teamId }] : []),
  ];
}

async function validateReferences(
  transaction: Prisma.TransactionClient,
  input: Pick<
    ActivityInput,
    | "countryId"
    | "teamId"
    | "customerId"
    | "typeId"
    | "statusId"
    | "priorityId"
    | "assignedToId"
  >,
  options: { requireCustomer?: boolean } = {},
) {
  const [country, team, customer, activeCustomerCount, type, status, priority, technician] = await Promise.all(
    [
      transaction.country.findFirst({
        where: { id: input.countryId },
        select: { id: true },
      }),
      input.teamId
        ? transaction.team.findFirst({
            where: { id: input.teamId, countryId: input.countryId },
            select: { id: true },
          })
        : Promise.resolve({ id: "none" }),
      input.customerId
        ? transaction.customer.findFirst({
            where: { id: input.customerId, isActive: true },
            select: { id: true },
          })
        : Promise.resolve(null),
      input.customerId
        ? Promise.resolve(0)
        : transaction.customer.count({ where: { isActive: true } }),
      transaction.activityType.findFirst({
        where: { id: input.typeId, isActive: true },
        select: { id: true },
      }),
      transaction.activityStatus.findFirst({
        where: { id: input.statusId, isActive: true },
        select: { id: true },
      }),
      transaction.priority.findFirst({
        where: { id: input.priorityId, isActive: true },
        select: { id: true },
      }),
      input.assignedToId
        ? transaction.user.findFirst({
            where: {
              id: input.assignedToId,
              accessStatus: AccessStatus.ACTIVE,
              roleAssignments: {
                some: { OR: assignmentScope(input.countryId, input.teamId) },
              },
            },
            select: { id: true },
          })
        : Promise.resolve({ id: "none" }),
    ],
  );
  if (!country || !team || !type || !status || !priority || !technician || (input.customerId && !customer) || (options.requireCustomer && !input.customerId && activeCustomerCount > 0))
    throw new ActivityDomainError("NOT_FOUND");
}

async function assertNoTechnicianConflict(
  transaction: Prisma.TransactionClient,
  assignedToId: string | undefined,
  windows: OccurrenceWindow[],
  excludeActivityId?: string,
) {
  if (!assignedToId) return;
  const conflict = await transaction.activity.findFirst({
    where: {
      assignedToId,
      ...(excludeActivityId ? { id: { not: excludeActivityId } } : {}),
      status: { code: { notIn: ["COMPLETED", "CANCELLED"] } },
      OR: windows.map((window) => ({
        startsAt: { lt: window.endsAt },
        endsAt: { gt: window.startsAt },
      })),
    },
    select: { id: true },
  });
  if (conflict) throw new ActivityDomainError("CONFLICT");
}

export async function createActivity(
  input: ActivityInput,
): Promise<ActivityActionResult> {
  const user = await getCurrentUser();
  if (!user) return { success: false, errorCode: "UNAUTHORIZED" };
  const parsedInput = activityInputSchema.safeParse(input);
  if (!parsedInput.success)
    return validationFailure(parsedInput.error.flatten().fieldErrors);

  try {
    await requirePermission(user.id, "activity:create", parsedInput.data);
    if (parsedInput.data.assignedToId)
      await requirePermission(user.id, "activity:assign", parsedInput.data);
    const windows = buildOccurrenceWindows(parsedInput.data);
    if (hasInternalScheduleOverlap(windows))
      throw new ActivityDomainError("CONFLICT");

    const result = await getPrisma().$transaction(async (transaction) => {
      await validateReferences(transaction, parsedInput.data, { requireCustomer: true });
      await assertNoTechnicianConflict(
        transaction,
        parsedInput.data.assignedToId,
        windows,
      );
      const { recurrence, ...activityData } = parsedInput.data;
      const series = recurrence
        ? await transaction.activitySeries.create({
            data: {
              recurrenceRule: {
                create: {
                  frequency: recurrence.frequency,
                  interval: recurrence.interval,
                  daysOfWeek: [activityData.startsAt.getUTCDay()],
                  endsAt: recurrence.endsAt,
                  timezone: recurrence.timezone,
                },
              },
            },
            select: { id: true },
          })
        : null;
      const createdActivities: { id: string; auditId: string }[] = [];
      for (const [index, window] of windows.entries()) {
        const activity = await transaction.activity.create({
          data: {
            ...activityData,
            description: activityData.description || null,
            teamId: activityData.teamId || null,
            customerId: activityData.customerId || null,
            partNumber: activityData.partNumber || null,
            partUrl: activityData.partUrl || null,
            assignedToId: activityData.assignedToId || null,
            startsAt: window.startsAt,
            endsAt: window.endsAt,
            createdById: user.id,
            seriesId: series?.id ?? null,
          },
          select: { id: true },
        });
        const audit = await transaction.auditLog.create({
          data: {
            actorId: user.id,
            entityType: "Activity",
            entityId: activity.id,
            action: "CREATE_ACTIVITY",
            metadata: recurrence
              ? { seriesId: series?.id, occurrence: index + 1 }
              : undefined,
          },
          select: { id: true },
        });
        createdActivities.push({ id: activity.id, auditId: audit.id });
        await reconcileActivityEmailReminders(
          transaction,
          activity.id,
          window.startsAt,
          "PLANNED",
        );
      }
      const notificationIds = await queueActivityNotification(transaction, {
        eventId: createdActivities[0].auditId,
        kind: "ACTIVITY_CREATED",
        activityId: createdActivities[0].id,
        actorId: user.id,
        occurrenceCount: createdActivities.length,
      });
      return { createdActivities, notificationIds };
    });
    await dispatchBestEffort(result.notificationIds);
    revalidateActivityRoutes();
    return {
      success: true,
      activityId: result.createdActivities[0].id,
      createdCount: result.createdActivities.length,
    };
  } catch (error) {
    return toActionFailure(error);
  }
}

export async function updateActivity(
  input: ActivityUpdateInput,
): Promise<ActivityActionResult> {
  const user = await getCurrentUser();
  if (!user) return { success: false, errorCode: "UNAUTHORIZED" };
  const parsedInput = activityUpdateInputSchema.safeParse(input);
  if (!parsedInput.success)
    return validationFailure(parsedInput.error.flatten().fieldErrors);

  try {
    const existing = await getPrisma().activity.findUnique({
      where: { id: parsedInput.data.activityId },
      select: {
        id: true,
        countryId: true,
        teamId: true,
        assignedToId: true,
        statusId: true,
        status: { select: { name: true } },
      },
    });
    if (!existing) throw new ActivityDomainError("NOT_FOUND");
    const nextAssignedToId = parsedInput.data.assignedToId ?? null;
    await requirePermission(user.id, "activity:update", existing);
    await requirePermission(user.id, "activity:update", parsedInput.data);
    if (existing.assignedToId !== nextAssignedToId)
      await requirePermission(user.id, "activity:assign", parsedInput.data);

    const { activityId, ...activityData } = parsedInput.data;
    const notificationIds = await getPrisma().$transaction(async (transaction) => {
      await validateReferences(transaction, activityData);
      await assertNoTechnicianConflict(
        transaction,
        activityData.assignedToId,
        [{ startsAt: activityData.startsAt, endsAt: activityData.endsAt }],
        activityId,
      );
      await transaction.activity.update({
        where: { id: activityId },
        data: {
          ...activityData,
          description: activityData.description || null,
          teamId: activityData.teamId || null,
          customerId: activityData.customerId || null,
          partNumber: activityData.partNumber || null,
          partUrl: activityData.partUrl || null,
          assignedToId: activityData.assignedToId || null,
        },
      });
      const audit = await transaction.auditLog.create({
        data: {
          actorId: user.id,
          entityType: "Activity",
          entityId: activityId,
          action: "UPDATE_ACTIVITY",
        },
        select: { id: true },
      });
      if (existing.assignedToId !== nextAssignedToId) {
        await transaction.auditLog.create({
          data: {
            actorId: user.id,
            entityType: "Activity",
            entityId: activityId,
            action: "REASSIGN_ACTIVITY",
            metadata: { from: existing.assignedToId, to: nextAssignedToId },
          },
        });
      }
      if (existing.statusId !== activityData.statusId) {
        await transaction.auditLog.create({
          data: {
            actorId: user.id,
            entityType: "Activity",
            entityId: activityId,
            action: "CHANGE_ACTIVITY_STATUS",
          },
        });
      }
      const nextStatus = await transaction.activityStatus.findUnique({
        where: { id: activityData.statusId },
        select: { code: true },
      });
      await reconcileActivityEmailReminders(
        transaction,
        activityId,
        activityData.startsAt,
        nextStatus?.code ?? "PLANNED",
      );
      return queueActivityNotification(transaction, {
        eventId: audit.id,
        kind:
          existing.assignedToId !== nextAssignedToId
            ? "ACTIVITY_REASSIGNED"
            : existing.statusId !== activityData.statusId
              ? "ACTIVITY_STATUS_CHANGED"
              : "ACTIVITY_UPDATED",
        activityId,
        actorId: user.id,
        previousAssignedToId: existing.assignedToId,
        previousStatus:
          existing.statusId !== activityData.statusId
            ? existing.status?.name
            : undefined,
      });
    });
    await dispatchBestEffort(notificationIds);
    revalidateActivityRoutes();
    return { success: true, activityId };
  } catch (error) {
    return toActionFailure(error);
  }
}

export async function changeActivityStatus(
  input: ActivityStatusInput,
): Promise<ActivityActionResult> {
  const user = await getCurrentUser();
  if (!user) return { success: false, errorCode: "UNAUTHORIZED" };
  const parsedInput = activityStatusInputSchema.safeParse(input);
  if (!parsedInput.success)
    return validationFailure(parsedInput.error.flatten().fieldErrors);

  try {
    const existing = await getPrisma().activity.findUnique({
      where: { id: parsedInput.data.activityId },
      select: {
        id: true,
        countryId: true,
        teamId: true,
        statusId: true,
        status: { select: { name: true } },
      },
    });
    if (!existing) throw new ActivityDomainError("NOT_FOUND");
    await requirePermission(user.id, "activity:update", existing);
    const status = await getPrisma().activityStatus.findFirst({
      where: {
        id: parsedInput.data.statusId,
        isActive: true,
        code: { not: "CANCELLED" },
      },
      select: { id: true, code: true, name: true },
    });
    if (!status) throw new ActivityDomainError("NOT_FOUND");
    const notificationIds = await getPrisma().$transaction(async (transaction) => {
      await transaction.activity.update({
        where: { id: existing.id },
        data: { statusId: status.id },
      });
      const audit = await transaction.auditLog.create({
        data: {
          actorId: user.id,
          entityType: "Activity",
          entityId: existing.id,
          action: "CHANGE_ACTIVITY_STATUS",
          metadata: { from: existing.statusId, to: status.id },
        },
        select: { id: true },
      });
      const activity = await transaction.activity.findUnique({
        where: { id: existing.id },
        select: { startsAt: true },
      });
      if (activity) {
        await reconcileActivityEmailReminders(
          transaction,
          existing.id,
          activity.startsAt,
          status.code,
        );
      }
      return queueActivityNotification(transaction, {
        eventId: audit.id,
        kind: "ACTIVITY_STATUS_CHANGED",
        activityId: existing.id,
        actorId: user.id,
        previousStatus: existing.status?.name,
      });
    });
    await dispatchBestEffort(notificationIds);
    revalidateActivityRoutes();
    return { success: true, activityId: existing.id };
  } catch (error) {
    return toActionFailure(error);
  }
}

export async function cancelActivity(
  input: ActivityCancelInput,
): Promise<ActivityActionResult> {
  const user = await getCurrentUser();
  if (!user) return { success: false, errorCode: "UNAUTHORIZED" };
  const parsedInput = activityCancelInputSchema.safeParse(input);
  if (!parsedInput.success)
    return validationFailure(parsedInput.error.flatten().fieldErrors);

  try {
    const existing = await getPrisma().activity.findUnique({
      where: { id: parsedInput.data.activityId },
      select: {
        id: true,
        countryId: true,
        teamId: true,
        status: { select: { name: true } },
      },
    });
    if (!existing) throw new ActivityDomainError("NOT_FOUND");
    await requirePermission(user.id, "activity:update", existing);
    const status = await getPrisma().activityStatus.findUnique({
      where: { code: "CANCELLED" },
      select: { id: true, code: true },
    });
    if (!status) throw new ActivityDomainError("NOT_FOUND");
    const notificationIds = await getPrisma().$transaction(async (transaction) => {
      await transaction.activity.update({
        where: { id: existing.id },
        data: { statusId: status.id },
      });
      const audit = await transaction.auditLog.create({
        data: {
          actorId: user.id,
          entityType: "Activity",
          entityId: existing.id,
          action: "CANCEL_ACTIVITY",
        },
        select: { id: true },
      });
      const activity = await transaction.activity.findUnique({
        where: { id: existing.id },
        select: { startsAt: true },
      });
      if (activity) {
        await reconcileActivityEmailReminders(
          transaction,
          existing.id,
          activity.startsAt,
          status.code,
        );
      }
      return queueActivityNotification(transaction, {
        eventId: audit.id,
        kind: "ACTIVITY_CANCELLED",
        activityId: existing.id,
        actorId: user.id,
        previousStatus: existing.status?.name,
      });
    });
    await dispatchBestEffort(notificationIds);
    revalidateActivityRoutes();
    return { success: true, activityId: existing.id };
  } catch (error) {
    return toActionFailure(error);
  }
}

export async function addActivityComment(
  input: ActivityCommentInput,
): Promise<ActivityActionResult> {
  const user = await getCurrentUser();
  if (!user) return { success: false, errorCode: "UNAUTHORIZED" };
  const parsedInput = activityCommentInputSchema.safeParse(input);
  if (!parsedInput.success)
    return validationFailure(parsedInput.error.flatten().fieldErrors);

  try {
    const activity = await getPrisma().activity.findUnique({
      where: { id: parsedInput.data.activityId },
      select: { id: true, countryId: true, teamId: true },
    });
    if (!activity) throw new ActivityDomainError("NOT_FOUND");
    await requirePermission(user.id, "activity:comment", activity);
    const result = await getPrisma().$transaction(async (transaction) => {
      const created = await transaction.activityComment.create({
        data: {
          activityId: activity.id,
          authorId: user.id,
          body: parsedInput.data.body,
        },
        select: { id: true },
      });
      const audit = await transaction.auditLog.create({
        data: {
          actorId: user.id,
          entityType: "Activity",
          entityId: activity.id,
          action: "COMMENT_ACTIVITY",
          metadata: { commentId: created.id },
        },
        select: { id: true },
      });
      const notificationIds = await queueActivityNotification(transaction, {
        eventId: audit.id,
        kind: "ACTIVITY_COMMENTED",
        activityId: activity.id,
        actorId: user.id,
        commentExcerpt: parsedInput.data.body,
      });
      return { comment: created, notificationIds };
    });
    await dispatchBestEffort(result.notificationIds);
    revalidateActivityRoutes();
    return { success: true, activityId: activity.id, commentId: result.comment.id };
  } catch (error) {
    return toActionFailure(error);
  }
}
