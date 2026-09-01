export type AuthorizationScope = {
  scopeType: "GLOBAL" | "COUNTRY" | "TEAM";
  countryId: string | null;
  teamId: string | null;
};

export type ActorRoleAssignment = AuthorizationScope & {
  rolePriority: number;
};

export class AuthorizationError extends Error {
  constructor(message = "FORBIDDEN") {
    super(message);
    this.name = "AuthorizationError";
  }
}

function reject(): never {
  throw new AuthorizationError();
}

export function scopeContains(
  actorScope: AuthorizationScope | ActorRoleAssignment,
  targetScope: AuthorizationScope,
) {
  if (actorScope.scopeType === "GLOBAL") return true;

  if (actorScope.scopeType === "COUNTRY") {
    return (
      targetScope.scopeType !== "GLOBAL" &&
      actorScope.countryId !== null &&
      actorScope.countryId === targetScope.countryId
    );
  }

  return (
    targetScope.scopeType === "TEAM" &&
    actorScope.teamId !== null &&
    actorScope.teamId === targetScope.teamId
  );
}

export function assertCanAssignRole(input: {
  actorUserId: string;
  targetUserId: string;
  actorAssignments: ActorRoleAssignment[];
  actorCanManageTeam: boolean;
  isGlobalAdmin?: boolean;
  targetRolePriority: number;
  targetScope: AuthorizationScope;
}) {
  if (
    input.actorUserId === input.targetUserId ||
    !input.actorCanManageTeam
  ) {
    reject();
  }

  const permitted = input.actorAssignments.some(
    (assignment) =>
      (assignment.rolePriority > input.targetRolePriority ||
        (input.isGlobalAdmin &&
          assignment.rolePriority === input.targetRolePriority)) &&
      scopeContains(assignment, input.targetScope),
  );

  if (!permitted) reject();
}

export function assertCanManageOverride(input: {
  actorUserId: string;
  targetUserId: string;
  isGlobalAdmin: boolean;
  actorPermissions: Set<string>;
  permissionKey: string;
  effect: "GRANT" | "DENY";
}) {
  if (
    input.actorUserId === input.targetUserId ||
    !input.isGlobalAdmin ||
    (input.effect === "GRANT" &&
      !input.actorPermissions.has(input.permissionKey))
  ) {
    reject();
  }
}

export function assertSystemRoleMutation(input: {
  isSystem: boolean;
  currentKey: string;
  nextKey: string;
  deleting: boolean;
}) {
  if (
    input.isSystem &&
    (input.deleting || input.currentKey !== input.nextKey)
  ) {
    reject();
  }
}

export function assertCanMutateRolePermissions(input: {
  isSystem: boolean;
  actorPriority: number;
  targetRolePriority: number;
}) {
  if (
    input.isSystem ||
    input.actorPriority <= input.targetRolePriority
  ) {
    reject();
  }
}

export function assertCanCreateRole(input: {
  isGlobalAdmin: boolean;
  actorPriority: number;
  newPriority: number;
}) {
  if (!input.isGlobalAdmin || input.newPriority >= input.actorPriority) {
    reject();
  }
}

export function scopeKeyFor(input: {
  countryId: string | null;
  teamId: string | null;
}) {
  if (input.teamId) return `TEAM:${input.teamId}`;
  if (input.countryId) return `COUNTRY:${input.countryId}`;
  return "GLOBAL";
}
