export type PermissionResource = {
  countryId?: string | null;
  teamId?: string | null;
};

export type PermissionAssignment = {
  scopeType: "GLOBAL" | "COUNTRY" | "TEAM";
  countryId: string | null;
  teamId: string | null;
  role: {
    key: string;
    priority: number;
    permissions: string[];
  };
};

export type PermissionOverride = {
  permissionKey: string;
  effect: "GRANT" | "DENY";
  countryId: string | null;
  teamId: string | null;
};

export type PermissionSource = {
  inheritedFrom: string[];
  grants: number;
  denies: number;
  effect: "ALLOW" | "DENY";
};

export type ResolvedPermissions = {
  roles: string[];
  permissions: Set<string>;
  sources: Record<string, PermissionSource>;
  can: (permission: string) => boolean;
};

function assignmentApplies(
  assignment: PermissionAssignment,
  resource?: PermissionResource,
) {
  if (assignment.scopeType === "GLOBAL") return true;
  if (!resource) return false;
  if (assignment.scopeType === "COUNTRY") {
    return Boolean(
      resource.countryId && assignment.countryId === resource.countryId,
    );
  }
  return Boolean(resource.teamId && assignment.teamId === resource.teamId);
}

function overrideApplies(
  override: PermissionOverride,
  resource?: PermissionResource,
) {
  if (override.teamId) {
    return Boolean(resource?.teamId && override.teamId === resource.teamId);
  }
  if (override.countryId) {
    return Boolean(
      resource?.countryId && override.countryId === resource.countryId,
    );
  }
  return true;
}

export function resolveEffectivePermissions({
  assignments,
  overrides,
  resource,
}: {
  assignments: PermissionAssignment[];
  overrides: PermissionOverride[];
  resource?: PermissionResource;
}): ResolvedPermissions {
  const applicableAssignments = assignments.filter((assignment) =>
    assignmentApplies(assignment, resource),
  );
  const applicableOverrides = overrides.filter((override) =>
    overrideApplies(override, resource),
  );
  const sourceMap = new Map<
    string,
    { inheritedFrom: Set<string>; grants: number; denies: number }
  >();

  function sourceFor(permission: string) {
    const existing = sourceMap.get(permission);
    if (existing) return existing;
    const created = {
      inheritedFrom: new Set<string>(),
      grants: 0,
      denies: 0,
    };
    sourceMap.set(permission, created);
    return created;
  }

  for (const assignment of applicableAssignments) {
    for (const permission of assignment.role.permissions) {
      sourceFor(permission).inheritedFrom.add(assignment.role.key);
    }
  }
  for (const override of applicableOverrides) {
    const source = sourceFor(override.permissionKey);
    if (override.effect === "DENY") source.denies += 1;
    else source.grants += 1;
  }

  const permissions = new Set<string>();
  const sources: Record<string, PermissionSource> = {};
  for (const [permission, source] of sourceMap) {
    const denied = source.denies > 0;
    const allowed = !denied && (source.inheritedFrom.size > 0 || source.grants > 0);
    if (allowed) permissions.add(permission);
    sources[permission] = {
      inheritedFrom: [...source.inheritedFrom],
      grants: source.grants,
      denies: source.denies,
      effect: denied ? "DENY" : "ALLOW",
    };
  }

  return {
    roles: [...new Set(applicableAssignments.map(({ role }) => role.key))],
    permissions,
    sources,
    can: (permission) => permissions.has(permission),
  };
}
