import "server-only";

import { Prisma } from "@prisma/client";

import { getPrisma } from "@/lib/prisma";

type AuditInput = {
  actorId?: string | null;
  entityType: string;
  entityId: string;
  action: string;
  metadata?: Prisma.InputJsonValue;
};

export async function appendAuditLog(input: AuditInput) {
  return getPrisma().auditLog.create({
    data: {
      actorId: input.actorId ?? null,
      entityType: input.entityType,
      entityId: input.entityId,
      action: input.action,
      metadata: input.metadata,
    },
  });
}
