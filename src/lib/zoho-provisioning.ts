import "server-only";

import { AccessStatus, ScopeType } from "@prisma/client";

import { queueAccountNotification } from "@/lib/notifications/account-notifications";
import { getPrisma } from "@/lib/prisma";

export type ZohoProvisionResult = {
  userId: string;
  accessStatus: AccessStatus;
  notificationIds: string[];
};

export async function provisionZohoUser(input: {
  userId: string;
  email: string;
  name?: string | null;
}, prisma: ReturnType<typeof getPrisma> = getPrisma()): Promise<ZohoProvisionResult | null> {
  return prisma.$transaction(async (transaction) => {
    const user = await transaction.user.findUnique({
      where: { id: input.userId },
      select: { id: true, email: true, name: true, accessStatus: true },
    });
    if (!user || user.accessStatus === AccessStatus.SUSPENDED) return null;

    const technician = await transaction.role.findUnique({
      where: { key: "TECNICO" },
      select: { id: true, name: true },
    });
    if (!technician) throw new Error("TECNICO_ROLE_MISSING");

    const existingAssignment = await transaction.userRoleAssignment.findUnique({
      where: {
        userId_roleId_scopeKey: {
          userId: user.id,
          roleId: technician.id,
          scopeKey: "GLOBAL",
        },
      },
      select: { id: true },
    });
    const needsProvisioning = user.accessStatus !== AccessStatus.ACTIVE || !existingAssignment;
    const updatedUser = user.accessStatus === AccessStatus.ACTIVE
      ? user
      : await transaction.user.update({
          where: { id: user.id },
          data: { accessStatus: AccessStatus.ACTIVE, email: user.email ?? input.email },
          select: { id: true, email: true, name: true, accessStatus: true },
        });

    const assignment = existingAssignment ?? await transaction.userRoleAssignment.create({
      data: {
        userId: user.id,
        roleId: technician.id,
        scopeType: ScopeType.GLOBAL,
        scopeKey: "GLOBAL",
        createdById: user.id,
      },
      select: { id: true },
    });

    const notificationIds: string[] = [];
    if (needsProvisioning) {
      const audit = await transaction.auditLog.create({
        data: {
          actorId: user.id,
          entityType: "User",
          entityId: user.id,
          action: "AUTO_PROVISION_ZOHO_USER",
          metadata: {
            accessStatus: updatedUser.accessStatus,
            roleKey: "TECNICO",
            scopeKey: "GLOBAL",
            assignmentId: assignment.id,
          },
        },
        select: { id: true },
      });
      notificationIds.push(...await queueAccountNotification(transaction, {
        eventId: audit.id,
        kind: "USER_WELCOME",
        userId: user.id,
        authMethod: "ZOHO",
        accessStatus: updatedUser.accessStatus,
        roleName: technician.name,
      }));
    }

    return {
      userId: user.id,
      accessStatus: updatedUser.accessStatus,
      notificationIds,
    };
  });
}
