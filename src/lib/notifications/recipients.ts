import "server-only";

import { AccessStatus, type NotificationKind, type Prisma } from "@prisma/client";

import { resolveEffectivePermissions } from "@/lib/authorization/effective-permissions";
import type { NotificationRecipient } from "@/lib/notifications/types";

type RecipientStore = Prisma.TransactionClient;

const supervisorAuthorizationSelect = {
  id: true,
  email: true,
  name: true,
  roleAssignments: {
    select: {
      scopeType: true,
      countryId: true,
      teamId: true,
      role: {
        select: {
          key: true,
          priority: true,
          permissions: { select: { permission: { select: { key: true } } } },
        },
      },
    },
  },
  permissionOverrides: {
    select: {
      effect: true,
      countryId: true,
      teamId: true,
      permission: { select: { key: true } },
    },
  },
} satisfies Prisma.UserSelect;

function normalizeEmail(email: string) {
  return email.trim().toLowerCase();
}

export function composeEmailRecipients(input: {
  directRecipients: NotificationRecipient[];
  supervisors: NotificationRecipient[];
}): { to: string[]; cc: string[] } {
  const direct = input.directRecipients
    .flatMap((item) => (item.email ? [normalizeEmail(item.email)] : []));
  const supervisors = input.supervisors
    .flatMap((item) => (item.email ? [normalizeEmail(item.email)] : []));
  const uniqueDirect = [...new Set(direct)];
  const uniqueSupervisors = [...new Set(supervisors)];
  const primary = uniqueDirect[0] ?? uniqueSupervisors[0];
  if (!primary) return { to: [], cc: [] };
  const cc = [...new Set([...uniqueDirect.slice(1), ...uniqueSupervisors])].filter(
    (email) => email !== primary,
  );
  return { to: [primary], cc };
}

export function notificationDedupeKey(
  eventId: string,
  kind: NotificationKind,
) {
  return `${eventId}:${kind}`;
}

export async function resolveActivitySupervisors(
  transaction: RecipientStore,
  resource: { countryId: string; teamId?: string | null },
): Promise<NotificationRecipient[]> {
  const candidates = await transaction.user.findMany({
    where: { accessStatus: AccessStatus.ACTIVE, email: { not: null } },
    select: supervisorAuthorizationSelect,
  });
  return candidates
    .map((candidate) => ({
      candidate: { id: candidate.id, email: candidate.email, name: candidate.name },
      effective: resolveEffectivePermissions({
        assignments: candidate.roleAssignments.map((assignment) => ({
          scopeType: assignment.scopeType,
          countryId: assignment.countryId,
          teamId: assignment.teamId,
          role: {
            key: assignment.role.key,
            priority: assignment.role.priority,
            permissions: assignment.role.permissions.map(({ permission }) => permission.key),
          },
        })),
        overrides: candidate.permissionOverrides.map((override) => ({
          permissionKey: override.permission.key,
          effect: override.effect,
          countryId: override.countryId,
          teamId: override.teamId,
        })),
        resource,
      }),
    }))
    .filter(
      ({ effective }) =>
        effective.can("activity:read") &&
        (effective.can("activity:assign") || effective.can("team:manage")),
    )
    .map(({ candidate }) => candidate);
}

export async function resolveAccessSupervisors(
  transaction: RecipientStore,
  resource?: { countryId?: string | null; teamId?: string | null },
): Promise<NotificationRecipient[]> {
  const candidates = await transaction.user.findMany({
    where: { accessStatus: AccessStatus.ACTIVE, email: { not: null } },
    select: supervisorAuthorizationSelect,
  });
  return candidates
    .map((candidate) => ({
      candidate: { id: candidate.id, email: candidate.email, name: candidate.name },
      effective: resolveEffectivePermissions({
        assignments: candidate.roleAssignments.map((assignment) => ({
          scopeType: assignment.scopeType,
          countryId: assignment.countryId,
          teamId: assignment.teamId,
          role: {
            key: assignment.role.key,
            priority: assignment.role.priority,
            permissions: assignment.role.permissions.map(({ permission }) => permission.key),
          },
        })),
        overrides: candidate.permissionOverrides.map((override) => ({
          permissionKey: override.permission.key,
          effect: override.effect,
          countryId: override.countryId,
          teamId: override.teamId,
        })),
        resource: resource
          ? { countryId: resource.countryId ?? undefined, teamId: resource.teamId ?? undefined }
          : undefined,
      }),
    }))
    .filter(({ effective }) => effective.can("team:manage"))
    .map(({ candidate }) => candidate);
}
