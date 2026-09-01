import "server-only";

import { NotificationKind, type Prisma } from "@prisma/client";

import { composeEmailRecipients, notificationDedupeKey, resolveActivitySupervisors } from "@/lib/notifications/recipients";

export type WorkLogNotificationKind = "WORK_LOG_DRAFT" | "WORK_LOG_COMPLETED" | "WORK_LOG_ADMIN_UPDATED";

export type QueueWorkLogNotificationInput = {
  eventId: string;
  kind: WorkLogNotificationKind;
  workLogId: string;
  actorId?: string | null;
};

export async function queueWorkLogNotification(
  transaction: Prisma.TransactionClient,
  input: QueueWorkLogNotificationInput,
): Promise<string[]> {
  const workLog = await transaction.workLog.findUnique({
    where: { id: input.workLogId },
    select: {
      id: true,
      userId: true,
      status: true,
      timezone: true,
      workDate: true,
      startedAt: true,
      endedAt: true,
      durationMinutes: true,
      machineReference: true,
      location: true,
      description: true,
      user: { select: { id: true, name: true, email: true } },
      countryId: true,
      country: { select: { name: true } },
      team: { select: { id: true, name: true } },
      customer: { select: { name: true } },
      customerLocation: { select: { name: true } },
    },
  });
  if (!workLog) return [];

  const supervisors = await resolveActivitySupervisors(transaction, {
    countryId: workLog.countryId,
    teamId: workLog.team?.id ?? null,
  });
  const recipients = composeEmailRecipients({
    directRecipients: [workLog.user],
    supervisors,
  });
  const payload = {
    kind: input.kind,
    workLog: {
      id: workLog.id,
      technician: workLog.user.name,
      country: workLog.country.name,
      team: workLog.team?.name ?? null,
      customer: workLog.customer?.name ?? null,
      location: workLog.customerLocation?.name ?? workLog.location,
      reference: workLog.machineReference,
      workDate: workLog.workDate.toISOString(),
      timezone: workLog.timezone,
      startedAt: workLog.startedAt.toISOString(),
      endedAt: workLog.endedAt?.toISOString() ?? null,
      durationMinutes: workLog.durationMinutes,
      status: workLog.status,
      description: workLog.description,
    },
    actorId: input.actorId ?? null,
  };
  const dedupeKey = notificationDedupeKey(input.eventId, input.kind as NotificationKind);
  const row = await transaction.emailNotification.upsert({
    where: { dedupeKey },
    update: {},
    create: {
      kind: input.kind as NotificationKind,
      entityType: "WorkLog",
      entityId: workLog.id,
      payload: JSON.parse(JSON.stringify(payload)) as Prisma.InputJsonValue,
      dedupeKey,
      toRecipients: recipients.to,
      ccRecipients: recipients.cc,
    },
    select: { id: true },
  });
  return [row.id];
}
