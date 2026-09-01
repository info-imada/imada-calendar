"use server";

import { randomBytes } from "node:crypto";

import {
  AccessStatus,
  OverrideEffect,
  ScopeType,
  type Prisma,
} from "@prisma/client";
import { revalidatePath } from "next/cache";

import {
  AuthorizationError,
  assertCanAssignRole,
  assertCanCreateRole,
  assertCanManageOverride,
  assertCanMutateRolePermissions,
  assertSystemRoleMutation,
  scopeKeyFor,
  type ActorRoleAssignment,
  type AuthorizationScope,
} from "@/lib/authorization/administration-policy";
import { assertNotLastGlobalAdministrator } from "@/lib/authorization/global-administrator";
import { getCurrentUser } from "@/lib/auth";
import {
  getEffectivePermissions,
  requireAdministrationAccess,
} from "@/lib/permissions";
import { getPrisma } from "@/lib/prisma";
import { hashPassword } from "@/lib/password";
import {
  queueAccountNotification,
  sendEphemeralCredentialEmail,
} from "@/lib/notifications/account-notifications";
import { dispatchNotificationIds } from "@/lib/notifications/dispatcher";
import {
  managedUserCreateInputSchema,
  managedUserUpdateInputSchema,
  permissionOverrideDeleteInputSchema,
  permissionOverrideInputSchema,
  roleCreateInputSchema,
  roleDeleteInputSchema,
  rolePermissionInputSchema,
  roleUpdateInputSchema,
  temporaryPasswordResetInputSchema,
  userAccessInputSchema,
  userAccessStatusInputSchema,
  userRoleAssignmentDeleteInputSchema,
  type ManagedUserCreateInput,
  type ManagedUserUpdateInput,
  type PermissionOverrideDeleteInput,
  type PermissionOverrideInput,
  type RoleCreateInput,
  type RoleDeleteInput,
  type RolePermissionInput,
  type RoleUpdateInput,
  type TemporaryPasswordResetInput,
  type UserAccessInput,
  type UserAccessStatusInput,
  type UserRoleAssignmentDeleteInput,
} from "@/lib/validations/administration";

export type AuthorizationActionResult =
  | {
      success: true;
      entityId?: string;
      temporaryPassword?: string;
      emailStatus?: "SENT" | "QUEUED" | "FAILED";
    }
  | {
      success: false;
      errorCode:
        | "UNAUTHORIZED"
        | "FORBIDDEN"
        | "VALIDATION"
        | "CONFLICT"
        | "NOT_FOUND"
        | "UNEXPECTED";
    };

function revalidateAuthorization() {
  revalidatePath("/team");
  revalidatePath("/settings");
}

async function dispatchAccountBestEffort(ids: string[]) {
  if (!ids.length) return "QUEUED" as const;
  try {
    const result = await dispatchNotificationIds(ids);
    return result.sent > 0 ? ("SENT" as const) : ("QUEUED" as const);
  } catch {
    return "QUEUED" as const;
  }
}

function mutationMetadata(before: unknown, after: unknown, scope?: unknown) {
  return { before, after, ...(scope ? { scope } : {}) } as Prisma.JsonObject;
}

function actionError(error: unknown): AuthorizationActionResult {
  if (
    error instanceof AuthorizationError ||
    (error instanceof Error && error.message === "FORBIDDEN")
  ) {
    return { success: false, errorCode: "FORBIDDEN" };
  }
  if (error instanceof Error && error.message === "NOT_FOUND") {
    return { success: false, errorCode: "NOT_FOUND" };
  }
  if (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    error.code === "P2002"
  ) {
    return { success: false, errorCode: "CONFLICT" };
  }
  return { success: false, errorCode: "UNEXPECTED" };
}

async function currentActor() {
  return getCurrentUser();
}

async function globalAdministrator() {
  const actor = await currentActor();
  if (!actor) return null;
  const permissions = await requireAdministrationAccess(actor.id);
  return { actor, permissions };
}

async function actorPriority(actorId: string) {
  const assignment = await getPrisma().userRoleAssignment.findFirst({
    where: { userId: actorId, scopeType: ScopeType.GLOBAL },
    orderBy: { role: { priority: "desc" } },
    select: { role: { select: { priority: true } } },
  });
  return assignment?.role.priority ?? 0;
}

function targetScopeFromInput(
  input: UserAccessInput,
  teamCountryId?: string,
): AuthorizationScope {
  if (input.scopeType === "GLOBAL") {
    return { scopeType: "GLOBAL", countryId: null, teamId: null };
  }
  if (input.scopeType === "COUNTRY") {
    return {
      scopeType: "COUNTRY",
      countryId: input.countryId,
      teamId: null,
    };
  }
  return {
    scopeType: "TEAM",
    countryId: teamCountryId ?? null,
    teamId: input.teamId,
  };
}

function humanScopeLabel(
  scope: AuthorizationScope,
  labels: { countryName?: string | null; teamName?: string | null } = {},
) {
  if (scope.scopeType === "GLOBAL") return "Global";
  if (scope.scopeType === "COUNTRY") return labels.countryName ?? "País";
  return (
    [labels.countryName, labels.teamName].filter(Boolean).join(" · ") || "Equipo"
  );
}

function permissionResource(scope: AuthorizationScope) {
  if (scope.scopeType === "GLOBAL") return undefined;
  return { countryId: scope.countryId, teamId: scope.teamId };
}

function managedUserScope(
  input: ManagedUserCreateInput,
  teamCountryId?: string,
): AuthorizationScope {
  if (input.scopeType === "GLOBAL") {
    return { scopeType: "GLOBAL", countryId: null, teamId: null };
  }
  if (input.scopeType === "COUNTRY") {
    return {
      scopeType: "COUNTRY",
      countryId: input.countryId,
      teamId: null,
    };
  }
  return {
    scopeType: "TEAM",
    countryId: teamCountryId ?? null,
    teamId: input.teamId,
  };
}

function generateTemporaryPassword() {
  return `Combi-${randomBytes(9).toString("base64url")}9!`;
}

async function loadActorAssignments(
  actorId: string,
  prisma: Prisma.TransactionClient | ReturnType<typeof getPrisma> = getPrisma(),
) {
  const assignments = await prisma.userRoleAssignment.findMany({
    where: { userId: actorId },
    select: {
      scopeType: true,
      countryId: true,
      teamId: true,
      team: { select: { countryId: true } },
      role: { select: { priority: true } },
    },
  });

  return assignments.map(
    (assignment): ActorRoleAssignment => ({
      scopeType: assignment.scopeType,
      countryId: assignment.countryId ?? assignment.team?.countryId ?? null,
      teamId: assignment.teamId,
      rolePriority: assignment.role.priority,
    }),
  );
}

export async function createRole(
  input: RoleCreateInput,
): Promise<AuthorizationActionResult> {
  const parsed = roleCreateInputSchema.safeParse(input);
  if (!parsed.success) return { success: false, errorCode: "VALIDATION" };

  try {
    const administrator = await globalAdministrator();
    if (!administrator) return { success: false, errorCode: "UNAUTHORIZED" };
    assertCanCreateRole({
      isGlobalAdmin: true,
      actorPriority: await actorPriority(administrator.actor.id),
      newPriority: parsed.data.priority,
    });

    const role = await getPrisma().$transaction(async (transaction) => {
      const created = await transaction.role.create({
        data: { ...parsed.data, description: parsed.data.description || null },
      });
      await transaction.auditLog.create({
        data: {
          actorId: administrator.actor.id,
          entityType: "Role",
          entityId: created.id,
          action: "CREATE_ROLE",
          metadata: mutationMetadata(null, created),
        },
      });
      return created;
    });
    revalidateAuthorization();
    return { success: true, entityId: role.id };
  } catch (error) {
    return actionError(error);
  }
}

export async function updateRole(
  input: RoleUpdateInput,
): Promise<AuthorizationActionResult> {
  const parsed = roleUpdateInputSchema.safeParse(input);
  if (!parsed.success) return { success: false, errorCode: "VALIDATION" };

  try {
    const administrator = await globalAdministrator();
    if (!administrator) return { success: false, errorCode: "UNAUTHORIZED" };
    const priority = await actorPriority(administrator.actor.id);

    await getPrisma().$transaction(async (transaction) => {
      const existing = await transaction.role.findUnique({
        where: { id: parsed.data.roleId },
      });
      if (!existing) throw new Error("NOT_FOUND");
      assertSystemRoleMutation({
        isSystem: existing.isSystem,
        currentKey: existing.key,
        nextKey: parsed.data.key,
        deleting: false,
      });
      if (parsed.data.priority !== existing.priority) {
        assertCanCreateRole({
          isGlobalAdmin: true,
          actorPriority: priority,
          newPriority: parsed.data.priority,
        });
      }
      const updated = await transaction.role.update({
        where: { id: existing.id },
        data: {
          key: parsed.data.key,
          name: parsed.data.name,
          description: parsed.data.description || null,
          priority: parsed.data.priority,
        },
      });
      await transaction.auditLog.create({
        data: {
          actorId: administrator.actor.id,
          entityType: "Role",
          entityId: updated.id,
          action: "UPDATE_ROLE",
          metadata: mutationMetadata(existing, updated),
        },
      });
    });
    revalidateAuthorization();
    return { success: true, entityId: parsed.data.roleId };
  } catch (error) {
    return actionError(error);
  }
}

export async function deleteRole(
  input: RoleDeleteInput,
): Promise<AuthorizationActionResult> {
  const parsed = roleDeleteInputSchema.safeParse(input);
  if (!parsed.success) return { success: false, errorCode: "VALIDATION" };

  try {
    const administrator = await globalAdministrator();
    if (!administrator) return { success: false, errorCode: "UNAUTHORIZED" };
    const priority = await actorPriority(administrator.actor.id);
    await getPrisma().$transaction(async (transaction) => {
      const existing = await transaction.role.findUnique({
        where: { id: parsed.data.roleId },
        include: { _count: { select: { assignments: true } } },
      });
      if (!existing) throw new Error("NOT_FOUND");
      assertSystemRoleMutation({
        isSystem: existing.isSystem,
        currentKey: existing.key,
        nextKey: existing.key,
        deleting: true,
      });
      if (existing.priority >= priority || existing._count.assignments > 0) {
        throw new AuthorizationError();
      }
      await transaction.role.delete({ where: { id: existing.id } });
      await transaction.auditLog.create({
        data: {
          actorId: administrator.actor.id,
          entityType: "Role",
          entityId: existing.id,
          action: "DELETE_ROLE",
          metadata: mutationMetadata(existing, null),
        },
      });
    });
    revalidateAuthorization();
    return { success: true };
  } catch (error) {
    return actionError(error);
  }
}

export async function setRolePermission(
  input: RolePermissionInput,
): Promise<AuthorizationActionResult> {
  const parsed = rolePermissionInputSchema.safeParse(input);
  if (!parsed.success) return { success: false, errorCode: "VALIDATION" };

  try {
    const actor = await currentActor();
    if (!actor) return { success: false, errorCode: "UNAUTHORIZED" };
    await getPrisma().$transaction(async (transaction) => {
      const [
        actorPermissions,
        role,
        permission,
        existing,
        actorAssignment,
      ] = await Promise.all([
        requireAdministrationAccess(actor.id, transaction),
        transaction.role.findUnique({ where: { id: parsed.data.roleId } }),
        transaction.permission.findUnique({
          where: { id: parsed.data.permissionId },
        }),
        transaction.rolePermission.findUnique({
          where: {
            roleId_permissionId: {
              roleId: parsed.data.roleId,
              permissionId: parsed.data.permissionId,
            },
          },
        }),
        transaction.userRoleAssignment.findFirst({
          where: {
            userId: actor.id,
            scopeType: ScopeType.GLOBAL,
          },
          orderBy: { role: { priority: "desc" } },
          select: { role: { select: { priority: true } } },
        }),
      ]);
      if (!role || !permission) throw new Error("NOT_FOUND");
      if (!parsed.data.enabled) {
        await assertNotLastGlobalAdministrator(transaction, {
          kind: "DISABLE_ROLE_PERMISSION",
          role,
          permissionKey: permission.key,
        });
      }
      assertCanMutateRolePermissions({
        isSystem: role.isSystem,
        actorPriority: actorAssignment?.role.priority ?? 0,
        targetRolePriority: role.priority,
      });
      if (
        parsed.data.enabled &&
        !actorPermissions.can(permission.key)
      ) {
        throw new AuthorizationError();
      }
      if (parsed.data.enabled && !existing) {
        await transaction.rolePermission.create({
          data: { roleId: role.id, permissionId: permission.id },
        });
      } else if (!parsed.data.enabled && existing) {
        await transaction.rolePermission.delete({ where: { id: existing.id } });
      }
      await transaction.auditLog.create({
        data: {
          actorId: actor.id,
          entityType: "RolePermission",
          entityId: existing?.id ?? `${role.id}:${permission.id}`,
          action: parsed.data.enabled
            ? "ENABLE_ROLE_PERMISSION"
            : "DISABLE_ROLE_PERMISSION",
          metadata: mutationMetadata(
            { enabled: Boolean(existing) },
            { enabled: parsed.data.enabled },
            { roleKey: role.key, permissionKey: permission.key },
          ),
        },
      });
    });
    revalidateAuthorization();
    return { success: true };
  } catch (error) {
    return actionError(error);
  }
}

export async function assignUserRole(
  input: UserAccessInput,
): Promise<AuthorizationActionResult> {
  const parsed = userAccessInputSchema.safeParse(input);
  if (!parsed.success) return { success: false, errorCode: "VALIDATION" };

  try {
    const actor = await currentActor();
    if (!actor) return { success: false, errorCode: "UNAUTHORIZED" };
    const result = await getPrisma().$transaction(async (transaction) => {
      const [target, role, team, country, actorAssignments] = await Promise.all([
        transaction.user.findUnique({ where: { id: parsed.data.userId } }),
        transaction.role.findUnique({ where: { id: parsed.data.roleId } }),
        parsed.data.scopeType === "TEAM"
          ? transaction.team.findUnique({
              where: { id: parsed.data.teamId },
              select: {
                id: true,
                name: true,
                countryId: true,
                country: { select: { name: true } },
              },
            })
          : null,
        parsed.data.scopeType === "COUNTRY"
          ? transaction.country.findUnique({
              where: { id: parsed.data.countryId },
              select: { id: true, name: true },
            })
          : null,
        loadActorAssignments(actor.id, transaction),
      ]);
      if (
        !target ||
        !role ||
        (parsed.data.scopeType === "COUNTRY" && !country) ||
        (parsed.data.scopeType === "TEAM" && !team)
      ) {
        throw new Error("NOT_FOUND");
      }
      const scope = targetScopeFromInput(parsed.data, team?.countryId);
      const effective = await getEffectivePermissions(
        actor.id,
        permissionResource(scope),
        transaction,
      );
      assertCanAssignRole({
        actorUserId: actor.id,
        targetUserId: target.id,
        actorAssignments,
        actorCanManageTeam: effective.can("team:manage"),
        isGlobalAdmin:
          Array.isArray(effective.roles) &&
          effective.roles.includes("ADMIN") &&
          effective.can("catalog:manage"),
        targetRolePriority: role.priority,
        targetScope: scope,
      });

      const countryId =
        parsed.data.scopeType === "COUNTRY" ? parsed.data.countryId : null;
      const teamId =
        parsed.data.scopeType === "TEAM" ? parsed.data.teamId : null;
      const scopeKey = scopeKeyFor({ countryId, teamId });
      const created = await transaction.userRoleAssignment.upsert({
        where: {
          userId_roleId_scopeKey: {
            userId: target.id,
            roleId: role.id,
            scopeKey,
          },
        },
        update: {},
        create: {
          userId: target.id,
          roleId: role.id,
          scopeType: parsed.data.scopeType as ScopeType,
          countryId,
          teamId,
          scopeKey,
          createdById: actor.id,
        },
      });
      const audit = await transaction.auditLog.create({
        data: {
          actorId: actor.id,
          entityType: "UserRoleAssignment",
          entityId: created.id,
          action: "ASSIGN_ROLE",
          metadata: mutationMetadata(null, created, { ...scope, scopeKey }),
        },
        select: { id: true },
      });
      const notificationIds = await queueAccountNotification(transaction, {
        eventId: audit.id,
        kind: "USER_ROLE_ASSIGNED",
        userId: target.id,
        actorId: actor.id,
        roleName: role.name,
        scopeLabel: humanScopeLabel(scope, {
          countryName: country?.name ?? team?.country?.name,
          teamName: team?.name,
        }),
        scope,
      });
      return { assignment: created, notificationIds };
    });
    const emailStatus = await dispatchAccountBestEffort(result.notificationIds);
    revalidateAuthorization();
    return { success: true, entityId: result.assignment.id, emailStatus };
  } catch (error) {
    return actionError(error);
  }
}

export async function revokeUserRole(
  input: UserRoleAssignmentDeleteInput,
): Promise<AuthorizationActionResult> {
  const parsed = userRoleAssignmentDeleteInputSchema.safeParse(input);
  if (!parsed.success) return { success: false, errorCode: "VALIDATION" };

  try {
    const actor = await currentActor();
    if (!actor) return { success: false, errorCode: "UNAUTHORIZED" };
    const notificationIds = await getPrisma().$transaction(async (transaction) => {
      const existing = await transaction.userRoleAssignment.findUnique({
        where: { id: parsed.data.assignmentId },
        include: {
          role: {
            include: {
              permissions: {
                select: { permission: { select: { key: true } } },
              },
            },
          },
          user: { select: { accessStatus: true } },
          country: { select: { name: true } },
          team: {
            select: {
              countryId: true,
              name: true,
              country: { select: { name: true } },
            },
          },
        },
      });
      if (!existing) throw new Error("NOT_FOUND");
      const scope: AuthorizationScope = {
        scopeType: existing.scopeType,
        countryId: existing.countryId ?? existing.team?.countryId ?? null,
        teamId: existing.teamId,
      };
      const [actorAssignments, effective] = await Promise.all([
        loadActorAssignments(actor.id, transaction),
        getEffectivePermissions(
          actor.id,
          permissionResource(scope),
          transaction,
        ),
      ]);
      assertCanAssignRole({
        actorUserId: actor.id,
        targetUserId: existing.userId,
        actorAssignments,
        actorCanManageTeam: effective.can("team:manage"),
        targetRolePriority: existing.role.priority,
        targetScope: scope,
      });
      await assertNotLastGlobalAdministrator(transaction, {
        kind: "REVOKE_ASSIGNMENT",
        assignment: existing,
      });
      await transaction.userRoleAssignment.delete({
        where: { id: existing.id },
      });
      const audit = await transaction.auditLog.create({
        data: {
          actorId: actor.id,
          entityType: "UserRoleAssignment",
          entityId: existing.id,
          action: "REVOKE_ROLE",
          metadata: mutationMetadata(existing, null, scope),
        },
        select: { id: true },
      });
      return queueAccountNotification(transaction, {
        eventId: audit.id,
        kind: "USER_ROLE_REVOKED",
        userId: existing.userId,
        actorId: actor.id,
        roleName: existing.role.name,
        scopeLabel: humanScopeLabel(scope, {
          countryName: existing.country?.name ?? existing.team?.country?.name,
          teamName: existing.team?.name,
        }),
        scope,
      });
    });
    const emailStatus = await dispatchAccountBestEffort(notificationIds);
    revalidateAuthorization();
    return { success: true, emailStatus };
  } catch (error) {
    return actionError(error);
  }
}

function overrideScope(input: PermissionOverrideInput, teamCountryId?: string) {
  if (input.scopeType === "GLOBAL") {
    return { countryId: null, teamId: null };
  }
  if (input.scopeType === "COUNTRY") {
    return { countryId: input.countryId, teamId: null };
  }
  return { countryId: teamCountryId ?? null, teamId: input.teamId };
}

export async function setUserPermissionOverride(
  input: PermissionOverrideInput,
): Promise<AuthorizationActionResult> {
  const parsed = permissionOverrideInputSchema.safeParse(input);
  if (!parsed.success) return { success: false, errorCode: "VALIDATION" };

  try {
    const administrator = await globalAdministrator();
    if (!administrator) return { success: false, errorCode: "UNAUTHORIZED" };
    const [target, permission, team] = await Promise.all([
      getPrisma().user.findUnique({ where: { id: parsed.data.userId } }),
      getPrisma().permission.findUnique({
        where: { id: parsed.data.permissionId },
      }),
      parsed.data.scopeType === "TEAM"
        ? getPrisma().team.findUnique({ where: { id: parsed.data.teamId } })
        : null,
    ]);
    if (!target || !permission || (parsed.data.scopeType === "TEAM" && !team)) {
      return { success: false, errorCode: "NOT_FOUND" };
    }
    assertCanManageOverride({
      actorUserId: administrator.actor.id,
      targetUserId: target.id,
      isGlobalAdmin: true,
      actorPermissions: administrator.permissions.permissions,
      permissionKey: permission.key,
      effect: parsed.data.effect,
    });
    const scope = overrideScope(parsed.data, team?.countryId);
    const scopeKey = scopeKeyFor(scope);
    const saved = await getPrisma().$transaction(async (transaction) => {
      const existing = await transaction.userPermissionOverride.findUnique({
        where: {
          userId_permissionId_scopeKey: {
            userId: target.id,
            permissionId: permission.id,
            scopeKey,
          },
        },
      });
      const updated = await transaction.userPermissionOverride.upsert({
        where: {
          userId_permissionId_scopeKey: {
            userId: target.id,
            permissionId: permission.id,
            scopeKey,
          },
        },
        create: {
          userId: target.id,
          permissionId: permission.id,
          effect: parsed.data.effect as OverrideEffect,
          countryId: scope.countryId,
          teamId: scope.teamId,
          scopeKey,
          createdById: administrator.actor.id,
        },
        update: {
          effect: parsed.data.effect as OverrideEffect,
          createdById: administrator.actor.id,
        },
      });
      await transaction.auditLog.create({
        data: {
          actorId: administrator.actor.id,
          entityType: "UserPermissionOverride",
          entityId: updated.id,
          action: "SET_PERMISSION_OVERRIDE",
          metadata: mutationMetadata(existing, updated, { ...scope, scopeKey }),
        },
      });
      return updated;
    });
    revalidateAuthorization();
    return { success: true, entityId: saved.id };
  } catch (error) {
    return actionError(error);
  }
}

export async function deleteUserPermissionOverride(
  input: PermissionOverrideDeleteInput,
): Promise<AuthorizationActionResult> {
  const parsed = permissionOverrideDeleteInputSchema.safeParse(input);
  if (!parsed.success) return { success: false, errorCode: "VALIDATION" };

  try {
    const administrator = await globalAdministrator();
    if (!administrator) return { success: false, errorCode: "UNAUTHORIZED" };
    const existing = await getPrisma().userPermissionOverride.findUnique({
      where: { id: parsed.data.overrideId },
      include: { permission: true },
    });
    if (!existing) return { success: false, errorCode: "NOT_FOUND" };
    assertCanManageOverride({
      actorUserId: administrator.actor.id,
      targetUserId: existing.userId,
      isGlobalAdmin: true,
      actorPermissions: administrator.permissions.permissions,
      permissionKey: existing.permission.key,
      effect: existing.effect,
    });
    await getPrisma().$transaction(async (transaction) => {
      await transaction.userPermissionOverride.delete({
        where: { id: existing.id },
      });
      await transaction.auditLog.create({
        data: {
          actorId: administrator.actor.id,
          entityType: "UserPermissionOverride",
          entityId: existing.id,
          action: "DELETE_PERMISSION_OVERRIDE",
          metadata: mutationMetadata(existing, null, {
            countryId: existing.countryId,
            teamId: existing.teamId,
            scopeKey: existing.scopeKey,
          }),
        },
      });
    });
    revalidateAuthorization();
    return { success: true };
  } catch (error) {
    return actionError(error);
  }
}

export async function createManagedUser(
  input: ManagedUserCreateInput,
): Promise<AuthorizationActionResult> {
  const parsed = managedUserCreateInputSchema.safeParse(input);
  if (!parsed.success) return { success: false, errorCode: "VALIDATION" };

  try {
    const actor = await currentActor();
    if (!actor) return { success: false, errorCode: "UNAUTHORIZED" };
    const temporaryPassword =
      parsed.data.authMethod === "LOCAL"
        ? generateTemporaryPassword()
        : undefined;
    const passwordHash = temporaryPassword
      ? await hashPassword(temporaryPassword)
      : undefined;

    const created = await getPrisma().$transaction(async (transaction) => {
      const [effective, role, team, country, actorAssignments] =
        await Promise.all([
          requireAdministrationAccess(actor.id, transaction),
          transaction.role.findUnique({
            where: { id: parsed.data.roleId },
            select: { id: true, key: true, name: true, priority: true },
          }),
          parsed.data.scopeType === "TEAM"
            ? transaction.team.findUnique({
                where: { id: parsed.data.teamId },
                select: {
                  id: true,
                  name: true,
                  countryId: true,
                  country: { select: { name: true } },
                },
              })
            : null,
          parsed.data.scopeType === "COUNTRY"
            ? transaction.country.findUnique({
                where: { id: parsed.data.countryId },
                select: { id: true, name: true },
              })
            : null,
          loadActorAssignments(actor.id, transaction),
        ]);

      if (
        !role ||
        (parsed.data.scopeType === "TEAM" && !team) ||
        (parsed.data.scopeType === "COUNTRY" && !country)
      ) {
        throw new Error("NOT_FOUND");
      }
      const scope = managedUserScope(parsed.data, team?.countryId);
      const isGlobalAdmin =
        effective.roles.includes("ADMIN") && effective.can("catalog:manage");
      assertCanAssignRole({
        actorUserId: actor.id,
        targetUserId: "NEW_MANAGED_USER",
        actorAssignments,
        actorCanManageTeam: effective.can("team:manage"),
        isGlobalAdmin,
        targetRolePriority: role.priority,
        targetScope: scope,
      });

      const user = await transaction.user.create({
        data: {
          accessStatus: parsed.data.accessStatus as AccessStatus,
          email: parsed.data.email,
          name: parsed.data.name,
        },
        select: { accessStatus: true, email: true, id: true, name: true },
      });
      const scopeKey = scopeKeyFor(scope);
      const assignment = await transaction.userRoleAssignment.create({
        data: {
          countryId: scope.countryId,
          createdById: actor.id,
          roleId: role.id,
          scopeKey,
          scopeType: scope.scopeType as ScopeType,
          teamId: scope.teamId,
          userId: user.id,
        },
      });
      if (passwordHash) {
        await transaction.userCredential.create({
          data: {
            mustChangePassword: true,
            passwordHash,
            userId: user.id,
          },
        });
      }
      const userAudit = await transaction.auditLog.create({
        data: {
          actorId: actor.id,
          entityType: "User",
          entityId: user.id,
          action: "CREATE_MANAGED_USER",
          metadata: mutationMetadata(null, {
            accessStatus: user.accessStatus,
            authMethod: parsed.data.authMethod,
            email: user.email,
            name: user.name,
          }),
        },
        select: { id: true },
      });
      await transaction.auditLog.create({
        data: {
          actorId: actor.id,
          entityType: "UserRoleAssignment",
          entityId: assignment.id,
          action: "ASSIGN_ROLE",
          metadata: mutationMetadata(null, {
            roleKey: role.key,
            scopeKey,
            userId: user.id,
          }),
        },
      });
      if (passwordHash) {
        await transaction.auditLog.create({
          data: {
            actorId: actor.id,
            entityType: "UserCredential",
            entityId: user.id,
            action: "CREATE_LOCAL_CREDENTIAL",
            metadata: mutationMetadata(null, { mustChangePassword: true }),
          },
        });
      }
      const notificationIds =
        parsed.data.authMethod === "ZOHO"
          ? await queueAccountNotification(transaction, {
              eventId: userAudit.id,
              kind: "USER_WELCOME",
              userId: user.id,
              actorId: actor.id,
              authMethod: "ZOHO",
              accessStatus: user.accessStatus,
              roleName: role.name,
              scopeLabel: humanScopeLabel(scope, {
                countryName: country?.name ?? team?.country?.name,
                teamName: team?.name,
              }),
              scope,
            })
          : [];
      return { user, notificationIds };
    });

    const emailStatus = temporaryPassword
      ? await sendEphemeralCredentialEmail({
          kind: "USER_WELCOME",
          user: {
            id: created.user.id,
            email: created.user.email ?? parsed.data.email,
            name: created.user.name ?? parsed.data.name,
          },
          authMethod: "LOCAL",
          temporaryPassword,
          accessStatus: created.user.accessStatus,
        })
      : await dispatchAccountBestEffort(created.notificationIds);
    revalidateAuthorization();
    return {
      success: true,
      entityId: created.user.id,
      emailStatus,
      ...(temporaryPassword ? { temporaryPassword } : {}),
    };
  } catch (error) {
    return actionError(error);
  }
}

export async function updateManagedUser(
  input: ManagedUserUpdateInput,
): Promise<AuthorizationActionResult> {
  const parsed = managedUserUpdateInputSchema.safeParse(input);
  if (!parsed.success) return { success: false, errorCode: "VALIDATION" };

  try {
    const actor = await currentActor();
    if (!actor) return { success: false, errorCode: "UNAUTHORIZED" };
    if (actor.id === parsed.data.userId) throw new AuthorizationError();

    const updated = await getPrisma().$transaction(async (transaction) => {
      const [administration, existing, actorAssignments] = await Promise.all([
        requireAdministrationAccess(actor.id, transaction),
        transaction.user.findUnique({
          where: { id: parsed.data.userId },
          select: {
            accounts: { select: { provider: true } },
            accessStatus: true,
            email: true,
            id: true,
            name: true,
            roleAssignments: {
              select: {
                id: true,
                roleId: true,
                scopeType: true,
                countryId: true,
                teamId: true,
                scopeKey: true,
                role: {
                  select: {
                    id: true,
                    key: true,
                    name: true,
                    priority: true,
                    permissions: {
                      select: { permission: { select: { key: true } } },
                    },
                  },
                },
              },
            },
          },
        }),
        loadActorAssignments(actor.id, transaction),
      ]);
      if (!existing) throw new Error("NOT_FOUND");

      const actorPriority = Math.max(
        0,
        ...actorAssignments.map((assignment) => assignment.rolePriority),
      );
      const targetPriority = Math.max(
        0,
        ...existing.roleAssignments.map(
          (assignment) => assignment.role.priority,
        ),
      );
      const isGlobalAdmin =
        administration.roles.includes("ADMIN") &&
        administration.can("catalog:manage");
      if (targetPriority > actorPriority || (!isGlobalAdmin && targetPriority >= actorPriority)) {
        throw new AuthorizationError();
      }
      if (
        parsed.data.email !== existing.email &&
        existing.accounts.some((account) => account.provider === "zoho")
      ) {
        throw new AuthorizationError();
      }

      const user = await transaction.user.update({
        where: { id: existing.id },
        data: { email: parsed.data.email, name: parsed.data.name },
        select: { email: true, id: true, name: true },
      });

      const accessInput =
        "scopeType" in parsed.data && parsed.data.roleId
          ? (parsed.data as UserAccessInput & { assignmentId?: string })
          : null;
      let notificationIds: string[] = [];
      let assignmentBefore: unknown = null;
      let assignmentAfter: unknown = null;

      if (accessInput) {
        const team =
          accessInput.scopeType === "TEAM"
            ? await transaction.team.findUnique({
                where: { id: accessInput.teamId },
                select: {
                  id: true,
                  name: true,
                  countryId: true,
                  country: { select: { name: true } },
                },
              })
            : null;
        const country =
          accessInput.scopeType === "COUNTRY"
            ? await transaction.country.findUnique({
                where: { id: accessInput.countryId },
                select: { id: true, name: true },
              })
            : null;
        const role = await transaction.role.findUnique({
          where: { id: accessInput.roleId },
          select: {
            id: true,
            key: true,
            name: true,
            priority: true,
            permissions: {
              select: { permission: { select: { key: true } } },
            },
          },
        });
        if (
          !role ||
          (accessInput.scopeType === "COUNTRY" && !country) ||
          (accessInput.scopeType === "TEAM" && !team)
        ) {
          throw new Error("NOT_FOUND");
        }

        const scope = targetScopeFromInput(accessInput, team?.countryId);
        const effective = await getEffectivePermissions(
          actor.id,
          permissionResource(scope),
          transaction,
        );
        assertCanAssignRole({
          actorUserId: actor.id,
          targetUserId: existing.id,
          actorAssignments,
          actorCanManageTeam: effective.can("team:manage"),
          isGlobalAdmin,
          targetRolePriority: role.priority,
          targetScope: scope,
        });

        const assignment = accessInput.assignmentId
          ? existing.roleAssignments.find(
              (item) => item.id === accessInput.assignmentId,
            )
          : existing.roleAssignments[0];
        if (accessInput.assignmentId && !assignment) {
          throw new Error("NOT_FOUND");
        }

        const countryId =
          accessInput.scopeType === "COUNTRY" ? accessInput.countryId : null;
        const teamId =
          accessInput.scopeType === "TEAM" ? accessInput.teamId : null;
        const scopeKey = scopeKeyFor({ countryId, teamId });
        const nextAssignment = {
          roleId: role.id,
          scopeType: accessInput.scopeType as ScopeType,
          countryId,
          teamId,
          scopeKey,
        };
        assignmentBefore = assignment
          ? {
              roleId: assignment.roleId,
              roleKey: assignment.role.key,
              roleName: assignment.role.name,
              scopeType: assignment.scopeType,
              countryId: assignment.countryId,
              teamId: assignment.teamId,
              scopeKey: assignment.scopeKey,
            }
          : null;
        assignmentAfter = {
          roleId: role.id,
          roleKey: role.key,
          roleName: role.name,
          scopeType: nextAssignment.scopeType,
          countryId,
          teamId,
          scopeKey,
        };

        if (assignment) {
          const changed =
            assignment.roleId !== role.id ||
            assignment.scopeKey !== scopeKey ||
            assignment.scopeType !== nextAssignment.scopeType;
          if (changed) {
            if (
              assignment.scopeType === ScopeType.GLOBAL &&
              assignment.role.permissions.some(({ permission }) => permission.key === "catalog:manage") &&
              (scope.scopeType !== "GLOBAL" ||
                !role.permissions.some(({ permission }) => permission.key === "catalog:manage"))
            ) {
              await assertNotLastGlobalAdministrator(transaction, {
                kind: "REVOKE_ASSIGNMENT",
                assignment: {
                  id: assignment.id,
                  scopeType: assignment.scopeType,
                  user: { accessStatus: existing.accessStatus },
                  role: { permissions: assignment.role.permissions },
                },
              });
            }
            await transaction.userRoleAssignment.update({
              where: { id: assignment.id },
              data: nextAssignment,
            });
          }
          if (changed) {
            const audit = await transaction.auditLog.create({
              data: {
                actorId: actor.id,
                entityType: "UserRoleAssignment",
                entityId: assignment.id,
                action: "UPDATE_ROLE_ASSIGNMENT",
                metadata: mutationMetadata(assignmentBefore, assignmentAfter, scope),
              },
              select: { id: true },
            });
            notificationIds = await queueAccountNotification(transaction, {
              eventId: audit.id,
              kind: "USER_ROLE_ASSIGNED",
              userId: existing.id,
              actorId: actor.id,
              roleName: role.name,
              scopeLabel: humanScopeLabel(scope, {
                countryName: country?.name ?? team?.country?.name,
                teamName: team?.name,
              }),
              scope,
            });
          }
        } else {
          const created = await transaction.userRoleAssignment.create({
            data: {
              ...nextAssignment,
              createdById: actor.id,
              userId: existing.id,
            },
          });
          const audit = await transaction.auditLog.create({
            data: {
              actorId: actor.id,
              entityType: "UserRoleAssignment",
              entityId: created.id,
              action: "ASSIGN_ROLE",
              metadata: mutationMetadata(null, assignmentAfter, scope),
            },
            select: { id: true },
          });
          notificationIds = await queueAccountNotification(transaction, {
            eventId: audit.id,
            kind: "USER_ROLE_ASSIGNED",
            userId: existing.id,
            actorId: actor.id,
            roleName: role.name,
            scopeLabel: humanScopeLabel(scope, {
              countryName: country?.name ?? team?.country?.name,
              teamName: team?.name,
            }),
            scope,
          });
        }
      }

      await transaction.auditLog.create({
        data: {
          actorId: actor.id,
          entityType: "User",
          entityId: user.id,
          action: "UPDATE_MANAGED_USER",
          metadata: mutationMetadata(
            { email: existing.email, name: existing.name, ...(assignmentBefore ? { assignment: assignmentBefore } : {}) },
            { email: user.email, name: user.name, ...(assignmentAfter ? { assignment: assignmentAfter } : {}) },
          ),
        },
      });
      return { user, notificationIds };
    });

    const emailStatus = await dispatchAccountBestEffort(updated.notificationIds);
    revalidateAuthorization();
    return {
      success: true,
      entityId: updated.user.id,
      ...(updated.notificationIds.length ? { emailStatus } : {}),
    };
  } catch (error) {
    return actionError(error);
  }
}

export async function setManagedUserStatus(
  input: UserAccessStatusInput,
): Promise<AuthorizationActionResult> {
  const parsed = userAccessStatusInputSchema.safeParse(input);
  if (!parsed.success) return { success: false, errorCode: "VALIDATION" };

  try {
    const administrator = await globalAdministrator();
    if (!administrator) return { success: false, errorCode: "UNAUTHORIZED" };
    if (administrator.actor.id === parsed.data.userId) {
      throw new AuthorizationError();
    }
    const notificationIds = await getPrisma().$transaction(async (transaction) => {
      const existing = await transaction.user.findUnique({
        where: { id: parsed.data.userId },
        select: { id: true, accessStatus: true },
      });
      if (!existing) throw new Error("NOT_FOUND");
      const updated = await transaction.user.update({
        where: { id: existing.id },
        data: { accessStatus: parsed.data.accessStatus as AccessStatus },
        select: { id: true, accessStatus: true },
      });
      const audit = await transaction.auditLog.create({
        data: {
          actorId: administrator.actor.id,
          entityType: "User",
          entityId: existing.id,
          action: "SET_ACCESS_STATUS",
          metadata: mutationMetadata(existing, updated),
        },
        select: { id: true },
      });
      return queueAccountNotification(transaction, {
        eventId: audit.id,
        kind: "USER_ACCESS_STATUS_CHANGED",
        userId: existing.id,
        actorId: administrator.actor.id,
        accessStatus: updated.accessStatus,
      });
    });
    const emailStatus = await dispatchAccountBestEffort(notificationIds);
    revalidateAuthorization();
    return { success: true, emailStatus };
  } catch (error) {
    return actionError(error);
  }
}

export async function resetTemporaryPassword(
  input: TemporaryPasswordResetInput,
): Promise<AuthorizationActionResult> {
  const parsed = temporaryPasswordResetInputSchema.safeParse(input);
  if (!parsed.success) return { success: false, errorCode: "VALIDATION" };

  try {
    const administrator = await globalAdministrator();
    if (!administrator) return { success: false, errorCode: "UNAUTHORIZED" };
    if (administrator.actor.id === parsed.data.userId) {
      throw new AuthorizationError();
    }
    const temporaryPassword = `Combi-${randomBytes(9).toString("base64url")}9!`;
    const passwordHash = await hashPassword(temporaryPassword);
    const credentialUser = await getPrisma().$transaction(async (transaction) => {
      const existing = await transaction.userCredential.findUnique({
        where: { userId: parsed.data.userId },
        select: { userId: true, mustChangePassword: true, changedAt: true },
      });
      if (!existing) throw new Error("NOT_FOUND");
      await transaction.userCredential.update({
        where: { userId: existing.userId },
        data: {
          passwordHash,
          mustChangePassword: true,
          changedAt: null,
        },
      });
      await transaction.auditLog.create({
        data: {
          actorId: administrator.actor.id,
          entityType: "UserCredential",
          entityId: existing.userId,
          action: "RESET_TEMPORARY_PASSWORD",
          metadata: mutationMetadata(
            {
              mustChangePassword: existing.mustChangePassword,
              changedAt: existing.changedAt,
            },
            { mustChangePassword: true, changedAt: null },
          ),
        },
      });
      return transaction.user.findUnique({
        where: { id: existing.userId },
        select: { id: true, email: true, name: true, accessStatus: true },
      });
    });
    const emailStatus = credentialUser?.email
      ? await sendEphemeralCredentialEmail({
          kind: "PASSWORD_RESET",
          user: {
            id: credentialUser.id,
            email: credentialUser.email,
            name: credentialUser.name ?? credentialUser.email,
          },
          authMethod: "LOCAL",
          temporaryPassword,
          accessStatus: credentialUser.accessStatus,
        })
      : "FAILED";
    revalidateAuthorization();
    return { success: true, temporaryPassword, emailStatus };
  } catch (error) {
    return actionError(error);
  }
}
