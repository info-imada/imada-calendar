"use server";

import { Prisma, WorkLogStatus } from "@prisma/client";
import { revalidatePath } from "next/cache";

import { getCurrentUser } from "@/lib/auth";
import { getEffectivePermissions, requirePermission } from "@/lib/permissions";
import { dispatchNotificationIds } from "@/lib/notifications/dispatcher";
import { queueWorkLogNotification } from "@/lib/notifications/work-log-notifications";
import { getPrisma } from "@/lib/prisma";
import { deleteR2Objects, headR2Object } from "@/lib/storage/r2";
import {
  adminUpdateWorkLogInputSchema,
  completeWorkLogInputSchema,
  deleteWorkLogInputSchema,
  draftWorkLogInputSchema,
  finishWorkLogInputSchema,
  resetWorkLogStartInputSchema,
  startWorkLogInputSchema,
  type AdminUpdateWorkLogInput,
  type CompleteWorkLogInput,
  type DeleteWorkLogInput,
  type DraftWorkLogInput,
  type FinishWorkLogInput,
  type ResetWorkLogStartInput,
  type StartWorkLogInput,
} from "@/lib/validations/work-log";
import { getWorkDate, isStartResetAllowed } from "@/lib/work-logs/time";

type WorkLogErrorCode =
  | "UNAUTHORIZED"
  | "FORBIDDEN"
  | "VALIDATION"
  | "CONFLICT"
  | "NOT_FOUND"
  | "UNEXPECTED";
type WorkLogFieldErrors = Record<string, string[] | undefined>;

export type WorkLogActionResult =
  | {
      success: true;
      workLogId: string;
      status: "IN_PROGRESS" | "COMPLETION_PENDING" | "COMPLETED";
      durationMinutes?: number;
      activityId?: string | null;
    }
  | { success: false; errorCode: WorkLogErrorCode; fieldErrors?: WorkLogFieldErrors };

class WorkLogDomainError extends Error {
  constructor(readonly code: Exclude<WorkLogErrorCode, "UNAUTHORIZED" | "VALIDATION" | "UNEXPECTED">) {
    super(code);
  }
}

function validationFailure(fieldErrors: WorkLogFieldErrors): WorkLogActionResult {
  return { success: false, errorCode: "VALIDATION", fieldErrors };
}

function toActionFailure(error: unknown): WorkLogActionResult {
  if (error instanceof WorkLogDomainError) return { success: false, errorCode: error.code };
  if (error instanceof Error && error.message === "FORBIDDEN") return { success: false, errorCode: "FORBIDDEN" };
  if (typeof error === "object" && error && "code" in error) {
    if (error.code === "P2002" || error.code === "P2034") return { success: false, errorCode: "CONFLICT" };
    if (error.code === "P2025") return { success: false, errorCode: "NOT_FOUND" };
  }
  console.error("Work log operation failed", error);
  return { success: false, errorCode: "UNEXPECTED" };
}

function revalidateWorkLogRoutes() {
  revalidatePath("/");
  revalidatePath("/work-logs");
  revalidatePath("/activities");
  revalidatePath("/dashboard");
  revalidatePath("/calendar");
}

async function dispatchBestEffort(ids: string[]) {
  if (!ids.length) return;
  try {
    await dispatchNotificationIds(ids);
  } catch (error) {
    console.error("Work log notification dispatch failed", error);
  }
}

function dateOnlyUtc(workDate: string) {
  return new Date(`${workDate}T00:00:00.000Z`);
}

function resource(countryId: string, teamId?: string | null) {
  return { countryId, teamId: teamId ?? undefined };
}

async function validateCustomerReferences(
  transaction: Prisma.TransactionClient,
  input: { customerId?: string; customerLocationId?: string },
  options: { requireCustomer?: boolean } = {},
) {
  if (options.requireCustomer && !input.customerId) throw new WorkLogDomainError("NOT_FOUND");
  if (!input.customerId) {
    if (input.customerLocationId) throw new WorkLogDomainError("NOT_FOUND");
    return;
  }
  const customer = await transaction.customer.findFirst({
    where: { id: input.customerId, isActive: true },
    select: { id: true },
  });
  if (!customer) throw new WorkLogDomainError("NOT_FOUND");
  if (input.customerLocationId) {
    const location = await transaction.customerLocation.findFirst({
      where: { id: input.customerLocationId, customerId: customer.id, isActive: true },
      select: { id: true },
    });
    if (!location) throw new WorkLogDomainError("NOT_FOUND");
  }
}

async function validateAttachments(
  transaction: Prisma.TransactionClient,
  userId: string,
  workLogId: string,
  attachmentIds: string[],
) {
  const uniqueIds = [...new Set(attachmentIds)];
  if (uniqueIds.length !== attachmentIds.length) throw new WorkLogDomainError("CONFLICT");
  if (!uniqueIds.length) return;
  const attachments = await transaction.workLogAttachment.findMany({
    where: { id: { in: uniqueIds }, workLogId, userId },
    select: { id: true, objectKey: true, mimeType: true, sizeBytes: true },
  });
  if (attachments.length !== uniqueIds.length || attachments.length > 5) throw new WorkLogDomainError("FORBIDDEN");
  for (const attachment of attachments) {
    try {
      const metadata = await headR2Object(attachment.objectKey);
      if ((metadata.ContentLength ?? -1) !== attachment.sizeBytes || metadata.ContentType && metadata.ContentType !== attachment.mimeType) {
        throw new WorkLogDomainError("CONFLICT");
      }
    } catch (error) {
      if (error instanceof WorkLogDomainError) throw error;
      throw new WorkLogDomainError("CONFLICT");
    }
  }
}

async function getWorkLogForMutation(
  transaction: Prisma.TransactionClient,
  workLogId: string,
) {
  return transaction.workLog.findUnique({
    where: { id: workLogId },
    select: {
      id: true,
      userId: true,
      activityId: true,
      countryId: true,
      teamId: true,
      status: true,
      timezone: true,
      startedAt: true,
      endedAt: true,
      activeKey: true,
      startResetUsedAt: true,
      draftNotifiedAt: true,
    },
  });
}

async function assertOwnerPermission(
  userId: string,
  existing: { userId: string; countryId: string; teamId: string | null },
  permission: string,
) {
  if (existing.userId !== userId) throw new WorkLogDomainError("FORBIDDEN");
  await requirePermission(userId, permission, resource(existing.countryId, existing.teamId));
}

export async function startWorkLog(input: StartWorkLogInput): Promise<WorkLogActionResult> {
  const user = await getCurrentUser();
  if (!user) return { success: false, errorCode: "UNAUTHORIZED" };
  const parsed = startWorkLogInputSchema.safeParse(input);
  if (!parsed.success) return validationFailure(parsed.error.flatten().fieldErrors);

  const now = new Date();
  try {
    const result = await getPrisma().$transaction(async (transaction) => {
      let activityId: string | null = null;
      let countryId: string;
      let teamId: string | null = null;
      let customerId: string | null = null;
      if ("activityId" in parsed.data) {
        const activity = await transaction.activity.findUnique({
          where: { id: parsed.data.activityId },
          select: { id: true, countryId: true, teamId: true, customerId: true, workLog: { select: { id: true } } },
        });
        if (!activity) throw new WorkLogDomainError("NOT_FOUND");
        if (activity.workLog) throw new WorkLogDomainError("CONFLICT");
        await requirePermission(user.id, "worklog:create", resource(activity.countryId, activity.teamId));
        activityId = activity.id;
        countryId = activity.countryId;
        teamId = activity.teamId;
        customerId = activity.customerId;
      } else {
        countryId = parsed.data.countryId;
        teamId = parsed.data.teamId ?? null;
        const country = await transaction.country.findUnique({ where: { id: countryId }, select: { id: true } });
        if (!country) throw new WorkLogDomainError("NOT_FOUND");
        if (teamId) {
          const team = await transaction.team.findFirst({ where: { id: teamId, countryId }, select: { id: true } });
          if (!team) throw new WorkLogDomainError("NOT_FOUND");
        }
        await requirePermission(user.id, "worklog:create", resource(countryId, teamId));
      }
      const active = await transaction.workLog.findFirst({ where: { userId: user.id, activeKey: { not: null } }, select: { id: true } });
      if (active) throw new WorkLogDomainError("CONFLICT");
      const created = await transaction.workLog.create({
        data: {
          userId: user.id,
          activityId,
          countryId,
          teamId,
          customerId,
          workDate: dateOnlyUtc(getWorkDate(now, user.timezone ?? "America/Panama")),
          timezone: user.timezone ?? "America/Panama",
          startedAt: now,
          status: WorkLogStatus.IN_PROGRESS,
          activeKey: user.id,
        },
        select: { id: true, status: true, activityId: true },
      });
      await transaction.auditLog.create({
        data: {
          actorId: user.id,
          entityType: "WorkLog",
          entityId: created.id,
          action: "CREATE_WORK_LOG",
          metadata: { activityId: created.activityId, countryId, teamId },
        },
      });
      return created;
    });
    revalidateWorkLogRoutes();
    return { success: true, workLogId: result.id, status: result.status, activityId: result.activityId };
  } catch (error) {
    return toActionFailure(error);
  }
}

export async function saveWorkLogDraft(input: DraftWorkLogInput): Promise<WorkLogActionResult> {
  const user = await getCurrentUser();
  if (!user) return { success: false, errorCode: "UNAUTHORIZED" };
  const parsed = draftWorkLogInputSchema.safeParse(input);
  if (!parsed.success) return validationFailure(parsed.error.flatten().fieldErrors);
  try {
    const result = await getPrisma().$transaction(async (transaction) => {
      const existing = await getWorkLogForMutation(transaction, parsed.data.workLogId);
      if (!existing) throw new WorkLogDomainError("NOT_FOUND");
      await assertOwnerPermission(user.id, existing, "worklog:update");
      if (existing.status === WorkLogStatus.COMPLETED) throw new WorkLogDomainError("CONFLICT");
      await validateCustomerReferences(transaction, parsed.data);
      await validateAttachments(transaction, user.id, existing.id, parsed.data.attachmentIds);
      const updated = await transaction.workLog.update({
        where: { id: existing.id },
        data: {
          ...(parsed.data.customerId !== undefined ? { customerId: parsed.data.customerId ?? null } : {}),
          ...(parsed.data.customerLocationId !== undefined ? { customerLocationId: parsed.data.customerLocationId ?? null } : {}),
          ...(parsed.data.machineReference !== undefined ? { machineReference: parsed.data.machineReference || null } : {}),
          ...(parsed.data.location !== undefined ? { location: parsed.data.location || null } : {}),
          ...(parsed.data.description !== undefined ? { description: parsed.data.description || null } : {}),
          ...(existing.draftNotifiedAt ? {} : { draftNotifiedAt: new Date() }),
        },
        select: { id: true, status: true, activityId: true },
      });
      await transaction.auditLog.create({ data: { actorId: user.id, entityType: "WorkLog", entityId: existing.id, action: "UPDATE_WORK_LOG_DRAFT" } });
      const notificationIds = existing.draftNotifiedAt ? [] : await queueWorkLogNotification(transaction, {
        eventId: `draft:${existing.id}`,
        kind: "WORK_LOG_DRAFT",
        workLogId: existing.id,
        actorId: user.id,
      });
      return { updated, notificationIds };
    });
    await dispatchBestEffort(result.notificationIds);
    revalidateWorkLogRoutes();
    return { success: true, workLogId: result.updated.id, status: result.updated.status, activityId: result.updated.activityId };
  } catch (error) {
    return toActionFailure(error);
  }
}

export async function resetWorkLogStart(input: ResetWorkLogStartInput): Promise<WorkLogActionResult> {
  const user = await getCurrentUser();
  if (!user) return { success: false, errorCode: "UNAUTHORIZED" };
  const parsed = resetWorkLogStartInputSchema.safeParse(input);
  if (!parsed.success) return validationFailure(parsed.error.flatten().fieldErrors);
  const now = new Date();
  try {
    const result = await getPrisma().$transaction(async (transaction) => {
      const existing = await getWorkLogForMutation(transaction, parsed.data.workLogId);
      if (!existing) throw new WorkLogDomainError("NOT_FOUND");
      await assertOwnerPermission(user.id, existing, "worklog:update");
      if (existing.status !== WorkLogStatus.IN_PROGRESS || existing.startResetUsedAt || !isStartResetAllowed(existing.startedAt, now)) throw new WorkLogDomainError("CONFLICT");
      const updated = await transaction.workLog.update({
        where: { id: existing.id },
        data: { startedAt: now, workDate: dateOnlyUtc(getWorkDate(now, existing.timezone)), startResetUsedAt: now },
        select: { id: true, status: true, activityId: true },
      });
      await transaction.auditLog.create({ data: { actorId: user.id, entityType: "WorkLog", entityId: existing.id, action: "RESET_WORK_LOG_START" } });
      return updated;
    }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });
    revalidateWorkLogRoutes();
    return { success: true, workLogId: result.id, status: result.status, activityId: result.activityId };
  } catch (error) {
    return toActionFailure(error);
  }
}

export async function finishWorkLog(input: FinishWorkLogInput): Promise<WorkLogActionResult> {
  const user = await getCurrentUser();
  if (!user) return { success: false, errorCode: "UNAUTHORIZED" };
  const parsed = finishWorkLogInputSchema.safeParse(input);
  if (!parsed.success) return validationFailure(parsed.error.flatten().fieldErrors);
  const now = new Date();
  try {
    const result = await getPrisma().$transaction(async (transaction) => {
      const existing = await getWorkLogForMutation(transaction, parsed.data.workLogId);
      if (!existing) throw new WorkLogDomainError("NOT_FOUND");
      await assertOwnerPermission(user.id, existing, "worklog:finish");
      if (existing.status !== WorkLogStatus.IN_PROGRESS || !existing.activeKey) throw new WorkLogDomainError("CONFLICT");
      const durationMinutes = Math.max(0, Math.floor((now.getTime() - existing.startedAt.getTime()) / 60_000));
      const updated = await transaction.workLog.update({
        where: { id: existing.id },
        data: { endedAt: now, durationMinutes, status: WorkLogStatus.COMPLETION_PENDING, activeKey: existing.activeKey },
        select: { id: true, status: true, activityId: true, durationMinutes: true },
      });
      await transaction.auditLog.create({ data: { actorId: user.id, entityType: "WorkLog", entityId: existing.id, action: "FINISH_WORK_LOG", metadata: { durationMinutes } } });
      return updated;
    });
    revalidateWorkLogRoutes();
    return { success: true, workLogId: result.id, status: result.status, durationMinutes: result.durationMinutes ?? undefined, activityId: result.activityId };
  } catch (error) {
    return toActionFailure(error);
  }
}

export async function completeWorkLog(input: CompleteWorkLogInput): Promise<WorkLogActionResult> {
  const user = await getCurrentUser();
  if (!user) return { success: false, errorCode: "UNAUTHORIZED" };
  const parsed = completeWorkLogInputSchema.safeParse(input);
  if (!parsed.success) return validationFailure(parsed.error.flatten().fieldErrors);
  try {
    const result = await getPrisma().$transaction(async (transaction) => {
      const existing = await getWorkLogForMutation(transaction, parsed.data.workLogId);
      if (!existing) throw new WorkLogDomainError("NOT_FOUND");
      await assertOwnerPermission(user.id, existing, "worklog:complete");
      if (existing.status !== WorkLogStatus.COMPLETION_PENDING || !existing.endedAt) throw new WorkLogDomainError("CONFLICT");
      await validateCustomerReferences(transaction, parsed.data, { requireCustomer: true });
      await validateAttachments(transaction, user.id, existing.id, parsed.data.attachmentIds);
      const updated = await transaction.workLog.update({
        where: { id: existing.id },
        data: {
          customerId: parsed.data.customerId,
          customerLocationId: parsed.data.customerLocationId ?? null,
          machineReference: parsed.data.machineReference,
          location: parsed.data.location ?? null,
          description: parsed.data.description,
          status: WorkLogStatus.COMPLETED,
          completedAt: new Date(),
          activeKey: null,
        },
        select: { id: true, status: true, activityId: true, durationMinutes: true },
      });
      await transaction.auditLog.create({ data: { actorId: user.id, entityType: "WorkLog", entityId: existing.id, action: "COMPLETE_WORK_LOG" } });
      const notificationIds = await queueWorkLogNotification(transaction, {
        eventId: `completed:${existing.id}`,
        kind: "WORK_LOG_COMPLETED",
        workLogId: existing.id,
        actorId: user.id,
      });
      return { updated, notificationIds };
    });
    await dispatchBestEffort(result.notificationIds);
    revalidateWorkLogRoutes();
    return { success: true, workLogId: result.updated.id, status: result.updated.status, durationMinutes: result.updated.durationMinutes ?? undefined, activityId: result.updated.activityId };
  } catch (error) {
    return toActionFailure(error);
  }
}

export async function adminUpdateWorkLog(input: AdminUpdateWorkLogInput): Promise<WorkLogActionResult> {
  const user = await getCurrentUser();
  if (!user) return { success: false, errorCode: "UNAUTHORIZED" };
  const parsed = adminUpdateWorkLogInputSchema.safeParse(input);
  if (!parsed.success) return validationFailure(parsed.error.flatten().fieldErrors);
  try {
    const result = await getPrisma().$transaction(async (transaction) => {
      const existing = await getWorkLogForMutation(transaction, parsed.data.workLogId);
      if (!existing) throw new WorkLogDomainError("NOT_FOUND");
      await requirePermission(user.id, "worklog:admin-update", resource(existing.countryId, existing.teamId));
      if (existing.status !== WorkLogStatus.IN_PROGRESS || !existing.draftNotifiedAt) throw new WorkLogDomainError("CONFLICT");
      await validateCustomerReferences(transaction, parsed.data);
      await validateAttachments(transaction, user.id, existing.id, parsed.data.attachmentIds);
      const updated = await transaction.workLog.update({
        where: { id: existing.id },
        data: {
          ...(parsed.data.customerId !== undefined ? { customerId: parsed.data.customerId ?? null } : {}),
          ...(parsed.data.customerLocationId !== undefined ? { customerLocationId: parsed.data.customerLocationId ?? null } : {}),
          ...(parsed.data.machineReference !== undefined ? { machineReference: parsed.data.machineReference || null } : {}),
          ...(parsed.data.location !== undefined ? { location: parsed.data.location || null } : {}),
          ...(parsed.data.description !== undefined ? { description: parsed.data.description || null } : {}),
        },
        select: { id: true, status: true, activityId: true },
      });
      await transaction.auditLog.create({ data: { actorId: user.id, entityType: "WorkLog", entityId: existing.id, action: "ADMIN_UPDATE_WORK_LOG" } });
      const notificationIds = await queueWorkLogNotification(transaction, {
        eventId: `admin-update:${existing.id}:${user.id}:${Date.now()}`,
        kind: "WORK_LOG_ADMIN_UPDATED",
        workLogId: existing.id,
        actorId: user.id,
      });
      return { updated, notificationIds };
    });
    await dispatchBestEffort(result.notificationIds);
    revalidateWorkLogRoutes();
    return { success: true, workLogId: result.updated.id, status: result.updated.status, activityId: result.updated.activityId };
  } catch (error) {
    return toActionFailure(error);
  }
}

export async function deleteWorkLog(input: DeleteWorkLogInput): Promise<WorkLogActionResult> {
  const user = await getCurrentUser();
  if (!user) return { success: false, errorCode: "UNAUTHORIZED" };
  const parsed = deleteWorkLogInputSchema.safeParse(input);
  if (!parsed.success) return validationFailure(parsed.error.flatten().fieldErrors);
  try {
    const permissions = await getEffectivePermissions(user.id);
    if (!permissions.roles.includes("ADMIN") || !permissions.can("worklog:delete")) throw new WorkLogDomainError("FORBIDDEN");
    const attachmentKeys = await getPrisma().$transaction(async (transaction) => {
      const existing = await transaction.workLog.findUnique({ where: { id: parsed.data.workLogId }, select: { id: true, attachments: { select: { objectKey: true } } } });
      if (!existing) throw new WorkLogDomainError("NOT_FOUND");
      await transaction.auditLog.create({ data: { actorId: user.id, entityType: "WorkLog", entityId: existing.id, action: "DELETE_WORK_LOG" } });
      await transaction.workLog.delete({ where: { id: existing.id } });
      return existing.attachments.map(({ objectKey }) => objectKey);
    });
    try {
      await deleteR2Objects(attachmentKeys);
    } catch (error) {
      console.error("Work log attachment cleanup failed", error);
    }
    revalidateWorkLogRoutes();
    return { success: true, workLogId: parsed.data.workLogId, status: WorkLogStatus.COMPLETED };
  } catch (error) {
    return toActionFailure(error);
  }
}
