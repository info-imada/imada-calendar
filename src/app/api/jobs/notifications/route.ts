import { timingSafeEqual } from "node:crypto";

import { NextResponse } from "next/server";

import { queueDueActivityReminders } from "@/lib/notifications/activity-notifications";
import { dispatchNotificationIds, dispatchPendingNotifications } from "@/lib/notifications/dispatcher";

export const dynamic = "force-dynamic";

function authorized(request: Request) {
  const header = request.headers.get("authorization");
  if (!header?.startsWith("Bearer ")) return false;
  const supplied = header.slice(7);
  const configuredSecrets = [
    process.env.CRON_SECRET,
    process.env.NOTIFICATION_JOB_SECRET,
  ].filter((secret): secret is string => Boolean(secret));

  return configuredSecrets.some((secret) => {
    const expectedBuffer = Buffer.from(secret);
    const suppliedBuffer = Buffer.from(supplied);
    return (
      expectedBuffer.length === suppliedBuffer.length &&
      timingSafeEqual(expectedBuffer, suppliedBuffer)
    );
  });
}

async function processNotifications(request: Request) {
  if (!authorized(request)) {
    return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });
  }
  try {
    const reminderIds = await queueDueActivityReminders(new Date(), 50);
    const immediate = await dispatchNotificationIds(reminderIds);
    const pending = await dispatchPendingNotifications({ limit: 50 });
    return NextResponse.json({
      claimed: immediate.claimed + pending.claimed,
      sent: immediate.sent + pending.sent,
      failed: immediate.failed + pending.failed,
      skipped: immediate.skipped + pending.skipped,
    });
  } catch {
    return NextResponse.json({ error: "NOTIFICATION_JOB_FAILED" }, { status: 500 });
  }
}

export async function GET(request: Request) {
  return processNotifications(request);
}

export async function POST(request: Request) {
  return processNotifications(request);
}
