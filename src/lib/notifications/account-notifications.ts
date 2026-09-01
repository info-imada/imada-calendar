import "server-only";

import { type NotificationKind, type Prisma } from "@prisma/client";

import { getEmailConfig } from "@/lib/email/config";
import { sendEmail } from "@/lib/email/resend";
import { buildAccountEmail } from "@/lib/email/templates/account-email";
import { composeEmailRecipients, notificationDedupeKey, resolveAccessSupervisors } from "@/lib/notifications/recipients";
import type { AccountNotificationPayload } from "@/lib/notifications/types";

export async function sendEphemeralCredentialEmail(
  payload: AccountNotificationPayload & { temporaryPassword: string },
): Promise<"SENT" | "FAILED"> {
  try {
    const content = buildAccountEmail(payload, getEmailConfig().appUrl);
    const result = await sendEmail({
      to: [payload.user.email.trim().toLowerCase()],
      cc: [],
      ...content,
    });
    return result.success ? "SENT" : "FAILED";
  } catch {
    return "FAILED";
  }
}

export async function queueAccountNotification(
  transaction: Prisma.TransactionClient,
  input: {
    eventId: string;
    kind: AccountNotificationPayload["kind"];
    userId: string;
    actorId?: string | null;
    roleName?: string;
    scopeLabel?: string;
    accessStatus?: string;
    authMethod?: "LOCAL" | "ZOHO";
    scope?: { countryId?: string | null; teamId?: string | null };
  },
) {
  const [user, actor, supervisors] = await Promise.all([
    transaction.user.findUnique({
      where: { id: input.userId },
      select: { id: true, email: true, name: true },
    }),
    input.actorId
      ? transaction.user.findUnique({ where: { id: input.actorId }, select: { name: true } })
      : null,
    resolveAccessSupervisors(transaction, input.scope),
  ]);
  if (!user?.email) return [];
  const recipients = composeEmailRecipients({
    directRecipients: [user],
    supervisors,
  });
  const payload: AccountNotificationPayload = {
    kind: input.kind,
    user: { id: user.id, email: user.email, name: user.name ?? user.email },
    actorName: actor?.name,
    authMethod: input.authMethod,
    roleName: input.roleName,
    scopeLabel: input.scopeLabel,
    accessStatus: input.accessStatus,
  };
  const row = await transaction.emailNotification.upsert({
    where: { dedupeKey: notificationDedupeKey(input.eventId, input.kind as NotificationKind) },
    update: {},
    create: {
      kind: input.kind as NotificationKind,
      entityType: "User",
      entityId: user.id,
      payload: JSON.parse(JSON.stringify(payload)) as Prisma.InputJsonValue,
      dedupeKey: notificationDedupeKey(input.eventId, input.kind as NotificationKind),
      toRecipients: recipients.to,
      ccRecipients: recipients.cc,
    },
    select: { id: true },
  });
  return [row.id];
}
