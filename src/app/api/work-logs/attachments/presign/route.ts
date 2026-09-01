import { randomUUID } from "node:crypto";

import { NextResponse } from "next/server";

import { getCurrentUser } from "@/lib/auth";
import { getEffectivePermissions } from "@/lib/permissions";
import { getPrisma } from "@/lib/prisma";
import { buildWorkLogObjectKey, presignWorkLogUpload } from "@/lib/storage/r2";
import { workLogAttachmentInputSchema } from "@/lib/validations/work-log-attachments";
import { z } from "zod";

const inputSchema = workLogAttachmentInputSchema.extend({ workLogId: z.string().cuid() });

export async function POST(request: Request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ errorCode: "UNAUTHORIZED" }, { status: 401 });
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ errorCode: "VALIDATION" }, { status: 400 });
  }
  const parsed = inputSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ errorCode: "VALIDATION", fieldErrors: parsed.error.flatten().fieldErrors }, { status: 400 });

  const prisma = getPrisma();
  const workLog = await prisma.workLog.findUnique({
    where: { id: parsed.data.workLogId },
    select: { id: true, userId: true, status: true, countryId: true, teamId: true },
  });
  if (!workLog) return NextResponse.json({ errorCode: "NOT_FOUND" }, { status: 404 });
  const permissions = await getEffectivePermissions(user.id, { countryId: workLog.countryId, teamId: workLog.teamId });
  const canUpdate = workLog.userId === user.id
    ? permissions.can("worklog:update")
    : permissions.can("worklog:admin-update") && workLog.status === "IN_PROGRESS";
  if (!canUpdate) return NextResponse.json({ errorCode: "FORBIDDEN" }, { status: 403 });
  const count = await prisma.workLogAttachment.count({ where: { workLogId: workLog.id } });
  if (count >= 5) return NextResponse.json({ errorCode: "VALIDATION", fieldErrors: { attachments: ["Un registro admite máximo 5 adjuntos."] } }, { status: 400 });

  const uploadUuid = randomUUID();
  const objectKey = buildWorkLogObjectKey(workLog.id, uploadUuid, parsed.data.name);
  try {
    const upload = await presignWorkLogUpload({ objectKey, contentType: parsed.data.type, contentLength: parsed.data.size });
    const attachment = await prisma.workLogAttachment.create({
      data: {
        workLogId: workLog.id,
        userId: user.id,
        uploadUuid,
        objectKey,
        originalName: parsed.data.name,
        mimeType: parsed.data.type,
        sizeBytes: parsed.data.size,
      },
      select: { id: true, uploadUuid: true, objectKey: true },
    });
    return NextResponse.json({ attachmentId: attachment.id, uploadUuid: attachment.uploadUuid, uploadUrl: upload.url, expiresIn: upload.expiresIn, headers: { "Content-Type": parsed.data.type, "Content-Length": String(parsed.data.size) } });
  } catch (error) {
    console.error("Work log attachment presign failed", error);
    return NextResponse.json({ errorCode: "UNEXPECTED" }, { status: 500 });
  }
}
