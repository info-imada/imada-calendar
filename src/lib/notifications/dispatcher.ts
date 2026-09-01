import "server-only";

import { EmailDeliveryStatus, type EmailNotification, type Prisma } from "@prisma/client";

import { getEmailConfig } from "@/lib/email/config";
import { sendEmail } from "@/lib/email/resend";
import { buildAccountEmail } from "@/lib/email/templates/account-email";
import { buildActivityEmail } from "@/lib/email/templates/activity-email";
import { buildWorkLogEmail } from "@/lib/email/templates/work-log-email";
import { getPrisma } from "@/lib/prisma";
import type { EmailPayload } from "@/lib/notifications/types";

const MAX_ATTEMPTS = 6;
const LEASE_MS = 10 * 60 * 1000;
const BACKOFF_MINUTES = [1, 5, 15, 60, 360] as const;

export type DispatchSummary = {
  claimed: number;
  sent: number;
  failed: number;
  skipped: number;
};

function sanitizedError(error: string) {
  return error.replace(/[\r\n]+/g, " ").slice(0, 300);
}

function recipientList(value: EmailNotification["toRecipients"] | EmailNotification["ccRecipients"]): string[] {
  if (!Array.isArray(value)) return [];
  return value.filter((recipient): recipient is string => typeof recipient === "string");
}

function buildContent(row: EmailNotification) {
  const payload = row.payload as unknown as EmailPayload;
  const { appUrl } = getEmailConfig();
  if (payload.kind.startsWith("ACTIVITY_")) {
    return buildActivityEmail(payload as Extract<EmailPayload, { activity: unknown }>, appUrl);
  }
  if (payload.kind.startsWith("WORK_LOG_")) {
    return buildWorkLogEmail(payload as Extract<EmailPayload, { workLog: unknown }>, appUrl);
  }
  return buildAccountEmail(payload as Extract<EmailPayload, { user: unknown }>, appUrl);
}

function claimableWhere(now: Date): Prisma.EmailNotificationWhereInput {
  return {
    attemptCount: { lt: MAX_ATTEMPTS },
    OR: [
      {
        status: { in: [EmailDeliveryStatus.PENDING, EmailDeliveryStatus.FAILED] },
        nextAttemptAt: { lte: now },
      },
      {
        status: EmailDeliveryStatus.PROCESSING,
        lockedAt: { lt: new Date(now.getTime() - LEASE_MS) },
      },
    ],
  };
}

async function dispatchCandidates(ids: string[], now: Date): Promise<DispatchSummary> {
  const prisma = getPrisma();
  const summary: DispatchSummary = { claimed: 0, sent: 0, failed: 0, skipped: 0 };
  for (const id of ids) {
    const claimed = await prisma.emailNotification.updateMany({
      where: { id, ...claimableWhere(now) },
      data: { status: EmailDeliveryStatus.PROCESSING, lockedAt: now },
    });
    if (claimed.count !== 1) continue;
    summary.claimed += 1;
    const row = await prisma.emailNotification.findUnique({ where: { id } });
    if (!row) continue;
    const toRecipients = recipientList(row.toRecipients);
    const ccRecipients = recipientList(row.ccRecipients);
    if (toRecipients.length === 0) {
      await prisma.emailNotification.update({
        where: { id },
        data: { status: EmailDeliveryStatus.SKIPPED, lockedAt: null, lastError: "NO_PRIMARY_RECIPIENT" },
      });
      summary.skipped += 1;
      continue;
    }

    let result: Awaited<ReturnType<typeof sendEmail>>;
    try {
      const content = buildContent(row);
      result = await sendEmail({
        to: toRecipients,
        cc: ccRecipients,
        ...content,
      });
    } catch {
      result = { success: false, error: "EMAIL_DELIVERY_FAILED" };
    }
    if (result.success) {
      await prisma.emailNotification.update({
        where: { id },
        data: {
          status: EmailDeliveryStatus.SENT,
          attemptCount: { increment: 1 },
          sentAt: now,
          providerId: result.id,
          lastError: null,
          lockedAt: null,
        },
      });
      summary.sent += 1;
      continue;
    }

    const nextAttemptCount = row.attemptCount + 1;
    const finalFailure = nextAttemptCount >= MAX_ATTEMPTS;
    const delay = BACKOFF_MINUTES[Math.min(nextAttemptCount - 1, BACKOFF_MINUTES.length - 1)];
    await prisma.emailNotification.update({
      where: { id },
      data: {
        status: EmailDeliveryStatus.FAILED,
        attemptCount: { increment: 1 },
        nextAttemptAt: finalFailure
          ? now
          : new Date(now.getTime() + delay * 60 * 1000),
        lastError: sanitizedError(result.error),
        lockedAt: null,
      },
    });
    summary.failed += 1;
  }
  return summary;
}

export async function dispatchNotificationIds(ids: string[]) {
  return dispatchCandidates([...new Set(ids)], new Date());
}

export async function dispatchPendingNotifications(options?: {
  limit?: number;
  now?: Date;
}) {
  const now = options?.now ?? new Date();
  const rows = await getPrisma().emailNotification.findMany({
    where: claimableWhere(now),
    orderBy: { nextAttemptAt: "asc" },
    take: Math.min(Math.max(options?.limit ?? 50, 1), 100),
    select: { id: true },
  });
  return dispatchCandidates(rows.map(({ id }) => id), now);
}
