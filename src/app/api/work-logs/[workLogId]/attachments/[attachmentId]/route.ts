import { NextResponse } from "next/server";

import { getCurrentUser } from "@/lib/auth";
import { getEffectivePermissions } from "@/lib/permissions";
import { getPrisma } from "@/lib/prisma";
import { getWorkLogAttachmentDownloadUrl, headR2Object } from "@/lib/storage/r2";

type RouteContext = { params: Promise<{ workLogId: string; attachmentId: string }> };

export async function GET(_request: Request, context: RouteContext) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ errorCode: "UNAUTHORIZED" }, { status: 401 });
  const { workLogId, attachmentId } = await context.params;
  const attachment = await getPrisma().workLogAttachment.findFirst({
    where: { id: attachmentId, workLogId },
    select: { objectKey: true, mimeType: true, originalName: true, workLog: { select: { userId: true, countryId: true, teamId: true } } },
  });
  if (!attachment?.workLog) return NextResponse.json({ errorCode: "NOT_FOUND" }, { status: 404 });
  const permissions = await getEffectivePermissions(user.id, { countryId: attachment.workLog.countryId, teamId: attachment.workLog.teamId });
  if (attachment.workLog.userId !== user.id && !permissions.can("worklog:read")) return NextResponse.json({ errorCode: "FORBIDDEN" }, { status: 403 });
  try {
    const metadata = await headR2Object(attachment.objectKey);
    const url = await getWorkLogAttachmentDownloadUrl(attachment.objectKey);
    return NextResponse.redirect(url, { headers: { "Content-Type": attachment.mimeType, "Content-Length": String(metadata.ContentLength ?? 0), "Cache-Control": "private, max-age=60" } });
  } catch {
    return NextResponse.json({ errorCode: "ATTACHMENT_UNAVAILABLE", name: attachment.originalName }, { status: 404 });
  }
}
