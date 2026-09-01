import "server-only";

import type { Prisma } from "@prisma/client";

import {
  resolveEffectivePermissions,
  type PermissionResource,
  type PermissionSource,
} from "@/lib/authorization/effective-permissions";
import { getPrisma } from "@/lib/prisma";

export const roleKeys = [
  "ADMIN",
  "TECNICO",
] as const;
export type SystemRoleKey = (typeof roleKeys)[number];
export type RoleKey = string;

export const permissionKeys = [
  "activity:read",
  "activity:create",
  "activity:update",
  "activity:assign",
  "activity:comment",
  "availability:read",
  "availability:update",
  "catalog:manage",
  "team:manage",
  "audit:read",
  "worklog:read",
  "worklog:create",
  "worklog:update",
  "worklog:finish",
  "worklog:complete",
  "worklog:admin-update",
  "worklog:delete",
] as const;
export type PermissionKey = (typeof permissionKeys)[number];

export type { PermissionResource };

export type EffectivePermissions = {
  roles: RoleKey[];
  permissions: Set<string>;
  sources: Record<string, PermissionSource>;
  can: (permission: string) => boolean;
};

type PermissionStore =
  | Prisma.TransactionClient
  | ReturnType<typeof getPrisma>;

export async function getEffectivePermissions(
  userId: string,
  resource?: PermissionResource,
  prisma: PermissionStore = getPrisma(),
): Promise<EffectivePermissions> {
  const [assignments, overrides] = await Promise.all([
    prisma.userRoleAssignment.findMany({
      where: { userId },
      select: {
        scopeType: true,
        countryId: true,
        teamId: true,
        role: {
          select: {
            key: true,
            priority: true,
            permissions: {
              select: { permission: { select: { key: true } } },
            },
          },
        },
      },
    }),
    prisma.userPermissionOverride.findMany({
      where: { userId },
      select: {
        effect: true,
        countryId: true,
        teamId: true,
        permission: { select: { key: true } },
      },
    }),
  ]);

  return resolveEffectivePermissions({
    assignments: assignments.map((assignment) => ({
      scopeType: assignment.scopeType,
      countryId: assignment.countryId,
      teamId: assignment.teamId,
      role: {
        key: assignment.role.key,
        priority: assignment.role.priority,
        permissions: assignment.role.permissions.map(
          ({ permission }) => permission.key,
        ),
      },
    })),
    overrides: overrides.map((override) => ({
      permissionKey: override.permission.key,
      effect: override.effect,
      countryId: override.countryId,
      teamId: override.teamId,
    })),
    resource,
  });
}

export async function requirePermission(
  userId: string,
  permission: PermissionKey | string,
  resource?: PermissionResource,
) {
  const effectivePermissions = await getEffectivePermissions(userId, resource);

  if (!effectivePermissions.can(permission)) {
    throw new Error("FORBIDDEN");
  }

  return effectivePermissions;
}

export async function requireAdministrationAccess(
  userId: string,
  prisma: PermissionStore = getPrisma(),
) {
  const effectivePermissions = await getEffectivePermissions(
    userId,
    undefined,
    prisma,
  );

  if (
    !effectivePermissions.roles.includes("ADMIN") ||
    !effectivePermissions.can("catalog:manage")
  ) {
    throw new Error("FORBIDDEN");
  }

  return effectivePermissions;
}

export async function canAccessPermissionAnywhere(
  userId: string,
  permission: PermissionKey | string,
  prisma: PermissionStore = getPrisma(),
) {
  const [assignments, overrides] = await Promise.all([
    prisma.userRoleAssignment.findMany({
      where: { userId },
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
    }),
    prisma.userPermissionOverride.findMany({
      where: { userId },
      select: {
        effect: true,
        countryId: true,
        teamId: true,
        permission: { select: { key: true } },
      },
    }),
  ]);
  const resources: Array<PermissionResource | undefined> = assignments.map((assignment) => {
    if (assignment.scopeType === "GLOBAL") return undefined;
    if (assignment.scopeType === "COUNTRY") return { countryId: assignment.countryId };
    return { teamId: assignment.teamId };
  });
  return resources.some((resource) => resolveEffectivePermissions({
    assignments: assignments.map((assignment) => ({
      scopeType: assignment.scopeType,
      countryId: assignment.countryId,
      teamId: assignment.teamId,
      role: {
        key: assignment.role.key,
        priority: assignment.role.priority,
        permissions: assignment.role.permissions.map(({ permission: item }) => item.key),
      },
    })),
    overrides: overrides.map((override) => ({
      permissionKey: override.permission.key,
      effect: override.effect,
      countryId: override.countryId,
      teamId: override.teamId,
    })),
    resource,
  }).can(permission));
}
