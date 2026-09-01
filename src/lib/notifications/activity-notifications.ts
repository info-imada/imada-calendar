import "server-only";

import { NotificationKind, ReminderChannel, type Prisma } from "@prisma/client";

import { composeEmailRecipients, notificationDedupeKey, resolveActivitySupervisors } from "@/lib/notifications/recipients";
import type { ActivityNotificationPayload, NotificationRecipient } from "@/lib/notifications/types";
import { getPrisma } from "@/lib/prisma";

export type QueueActivityNotificationInput = {
  eventId: string;
  kind: ActivityNotificationPayload["kind"];
  activityId: string;
  actorId?: string | null;
  previousAssignedToId?: string | null;
  previousStatus?: string | null;
  commentExcerpt?: string | null;
  occurrenceCount?: number;
  reminderMinutes?: number;
};

export async function queueActivityNotification(
  transaction: Prisma.TransactionClient,
  input: QueueActivityNotificationInput,
): Promise<string[]> {
  const activity = await transaction.activity.findUnique({
    where: { id: input.activityId },
    select: {
      id: true,
      title: true,
      startsAt: true,
      endsAt: true,
      allDay: true,
      countryId: true,
      teamId: true,
      country: { select: { name: true } },
      team: { select: { name: true } },
      customer: { select: { name: true } },
      partNumber: true,
      partUrl: true,
      type: { select: { name: true } },
      status: { select: { name: true } },
      priority: { select: { name: true } },
      assignedTo: { select: { id: true, email: true, name: true } },
      createdBy: { select: { id: true, email: true, name: true } },
    },
  });
  if (!activity) return [];
  const [actor, previousAssignedTo, supervisors] = await Promise.all([
    input.actorId
      ? transaction.user.findUnique({ where: { id: input.actorId }, select: { name: true } })
      : null,
    input.previousAssignedToId
      ? transaction.user.findUnique({ where: { id: input.previousAssignedToId }, select: { id: true, email: true, name: true } })
      : null,
    resolveActivitySupervisors(transaction, {
      countryId: activity.countryId,
      teamId: activity.teamId,
    }),
  ]);
  const directRecipients: NotificationRecipient[] = [
    ...(activity.assignedTo ? [activity.assignedTo] : []),
    activity.createdBy,
    ...(input.kind === "ACTIVITY_REASSIGNED" && previousAssignedTo
      ? [previousAssignedTo]
      : []),
  ];
  const recipients = composeEmailRecipients({ directRecipients, supervisors });
  const payload: ActivityNotificationPayload = {
    kind: input.kind,
    activity: {
      id: activity.id,
      title: activity.title,
      startsAt: activity.startsAt.toISOString(),
      endsAt: activity.endsAt.toISOString(),
      allDay: activity.allDay,
      country: activity.country.name,
      team: activity.team?.name,
      customer: activity.customer?.name,
      partNumber: activity.partNumber,
      partUrl: activity.partUrl,
      type: activity.type.name,
      status: activity.status.name,
      priority: activity.priority.name,
      assignedToName: activity.assignedTo?.name,
    },
    actorName: actor?.name,
    previousStatus: input.previousStatus,
    previousAssigneeName: previousAssignedTo?.name,
    commentExcerpt: input.commentExcerpt?.slice(0, 280),
    occurrenceCount: input.occurrenceCount,
    reminderMinutes: input.reminderMinutes,
  };
  const row = await transaction.emailNotification.upsert({
    where: { dedupeKey: notificationDedupeKey(input.eventId, input.kind as NotificationKind) },
    update: {},
    create: {
      kind: input.kind as NotificationKind,
      entityType: "Activity",
      entityId: activity.id,
      payload: JSON.parse(JSON.stringify(payload)) as Prisma.InputJsonValue,
      dedupeKey: notificationDedupeKey(input.eventId, input.kind as NotificationKind),
      toRecipients: recipients.to,
      ccRecipients: recipients.cc,
    },
    select: { id: true },
  });
  return [row.id];
}

export async function reconcileActivityEmailReminders(
  transaction: Prisma.TransactionClient,
  activityId: string,
  startsAt: Date,
  statusCode: string,
  now = new Date(),
) {
  await transaction.activityReminder.deleteMany({
    where: { activityId, channel: ReminderChannel.EMAIL, sentAt: null },
  });
  if (["COMPLETED", "CANCELLED"].includes(statusCode)) return;
  const scheduledTimes = [24 * 60, 60]
    .map((minutes) => new Date(startsAt.getTime() - minutes * 60 * 1000))
    .filter((scheduledAt) => scheduledAt > now);
  if (!scheduledTimes.length) return;
  await transaction.activityReminder.createMany({
    data: scheduledTimes.map((scheduledAt) => ({
      activityId,
      channel: ReminderChannel.EMAIL,
      scheduledAt,
    })),
    skipDuplicates: true,
  });
}

export async function queueDueActivityReminders(
  now = new Date(),
  limit = 50,
): Promise<string[]> {
  return getPrisma().$transaction(async (transaction) => {
    const reminders = await transaction.activityReminder.findMany({
      where: {
        channel: ReminderChannel.EMAIL,
        sentAt: null,
        scheduledAt: { lte: now },
        activity: { status: { code: { notIn: ["COMPLETED", "CANCELLED"] } } },
      },
      orderBy: { scheduledAt: "asc" },
      take: Math.min(Math.max(limit, 1), 100),
      select: {
        id: true,
        scheduledAt: true,
        activityId: true,
        activity: { select: { startsAt: true } },
      },
    });
    const notificationIds: string[] = [];
    for (const reminder of reminders) {
      const minutes = Math.max(
        1,
        Math.round(
          (reminder.activity.startsAt.getTime() - reminder.scheduledAt.getTime()) /
            60_000,
        ),
      );
      const ids = await queueActivityNotification(transaction, {
        eventId: `reminder:${reminder.id}`,
        kind: "ACTIVITY_REMINDER",
        activityId: reminder.activityId,
        reminderMinutes: minutes,
      });
      await transaction.activityReminder.updateMany({
        where: { id: reminder.id, sentAt: null },
        data: { sentAt: now },
      });
      notificationIds.push(...ids);
    }
    return notificationIds;
  });
}
