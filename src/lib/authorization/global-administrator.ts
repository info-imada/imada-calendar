import {
  AccessStatus,
  OverrideEffect,
  ScopeType,
  type Prisma,
} from "@prisma/client";

import { AuthorizationError } from "@/lib/authorization/administration-policy";

export const SETTINGS_ACCESS_PERMISSION_KEY = "catalog:manage";

export const CRITICAL_ADMINISTRATION_PERMISSION_KEYS = [
  SETTINGS_ACCESS_PERMISSION_KEY,
] as const;

type CriticalPermissionKey =
  (typeof CRITICAL_ADMINISTRATION_PERMISSION_KEYS)[number];

type LastGlobalAdministratorMutation =
  | {
      kind: "REVOKE_ASSIGNMENT";
      assignment: {
        id: string;
        scopeType: ScopeType;
        user: { accessStatus: AccessStatus };
        role: {
          permissions: Array<{ permission: { key: string } }>;
        };
      };
    }
  | {
      kind: "DISABLE_ROLE_PERMISSION";
      role: { id: string };
      permissionKey: string;
    };

function isCriticalPermission(
  permissionKey: string,
): permissionKey is CriticalPermissionKey {
  return CRITICAL_ADMINISTRATION_PERMISSION_KEYS.some(
    (criticalKey) => criticalKey === permissionKey,
  );
}

async function countRemainingGlobalAdministrators(
  transaction: Prisma.TransactionClient,
  permissionKey: CriticalPermissionKey,
  excludedAssignmentId?: string,
  excludedRoleId?: string,
) {
  return transaction.userRoleAssignment.count({
    where: {
      ...(excludedAssignmentId ? { id: { not: excludedAssignmentId } } : {}),
      scopeType: ScopeType.GLOBAL,
      user: {
        accessStatus: AccessStatus.ACTIVE,
        permissionOverrides: {
          none: {
            permission: { key: permissionKey },
            effect: OverrideEffect.DENY,
            countryId: null,
            teamId: null,
          },
        },
        OR: [
          {
            permissionOverrides: {
              some: {
                permission: { key: permissionKey },
                effect: OverrideEffect.GRANT,
                countryId: null,
                teamId: null,
              },
            },
          },
          {
            roleAssignments: {
              some: {
                scopeType: ScopeType.GLOBAL,
                ...(excludedAssignmentId
                  ? { id: { not: excludedAssignmentId } }
                  : {}),
                ...(excludedRoleId
                  ? { roleId: { not: excludedRoleId } }
                  : {}),
                role: {
                  permissions: {
                    some: { permission: { key: permissionKey } },
                  },
                },
              },
            },
          },
        ],
      },
    },
  });
}

export async function assertNotLastGlobalAdministrator(
  transaction: Prisma.TransactionClient,
  mutation: LastGlobalAdministratorMutation,
) {
  if (mutation.kind === "DISABLE_ROLE_PERMISSION") {
    if (!isCriticalPermission(mutation.permissionKey)) {
      return;
    }

    const remaining = await countRemainingGlobalAdministrators(
      transaction,
      mutation.permissionKey,
      undefined,
      mutation.role.id,
    );
    if (remaining === 0) throw new AuthorizationError();
    return;
  }

  const { assignment } = mutation;
  if (
    assignment.scopeType !== ScopeType.GLOBAL ||
    assignment.user.accessStatus !== AccessStatus.ACTIVE
  ) {
    return;
  }

  const criticalKeys = assignment.role.permissions
    .map(({ permission }) => permission.key)
    .filter(isCriticalPermission);

  for (const permissionKey of criticalKeys) {
    const remaining = await countRemainingGlobalAdministrators(
      transaction,
      permissionKey,
      assignment.id,
    );
    if (remaining === 0) throw new AuthorizationError();
  }
}
