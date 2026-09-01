import type { Prisma } from "@prisma/client";
import { redirect } from "next/navigation";

import {
  TeamWorkspace,
  type TeamMember,
  type TeamWorkspaceModel,
} from "@/features/team/team-workspace";
import { resolveEffectivePermissions } from "@/lib/authorization/effective-permissions";
import { getCurrentUser } from "@/lib/auth";
import {
  getEffectivePermissions,
  type EffectivePermissions,
  type PermissionResource,
} from "@/lib/permissions";
import { getPrisma } from "@/lib/prisma";

function scopeLabel(input: {
  scopeType?: string;
  country?: { name: string } | null;
  team?: { name: string; country?: { name: string } } | null;
}) {
  if (input.scopeType === "GLOBAL") return "Global";
  if (input.team) {
    return input.team.country
      ? `${input.team.country.name} · ${input.team.name}`
      : input.team.name;
  }
  return input.country?.name ?? "Alcance sin definir";
}

export default async function TeamPage() {
  const currentUser = await getCurrentUser();
  if (!currentUser) redirect("/login?callbackUrl=/team");

  const prisma = getPrisma();
  const actorAssignments = await prisma.userRoleAssignment.findMany({
    where: { userId: currentUser.id },
    include: {
      role: { select: { priority: true } },
      team: { select: { countryId: true } },
    },
  });
  const hasGlobalScope = actorAssignments.some(
    (assignment) => assignment.scopeType === "GLOBAL",
  );
  const countryScopeIds = new Set(
    actorAssignments.flatMap((assignment) =>
      assignment.scopeType === "COUNTRY" && assignment.countryId
        ? [assignment.countryId]
        : [],
    ),
  );
  const visibleCountryIds = new Set(
    actorAssignments.flatMap((assignment) => {
      const countryId = assignment.countryId ?? assignment.team?.countryId;
      return countryId ? [countryId] : [];
    }),
  );
  const teamIds = new Set(
    actorAssignments.flatMap((assignment) =>
      assignment.teamId ? [assignment.teamId] : [],
    ),
  );
  const permissionResources: Array<PermissionResource | undefined> = hasGlobalScope
    ? [undefined]
    : [
        ...[...countryScopeIds].map((countryId) => ({ countryId })),
        ...actorAssignments.flatMap((assignment) =>
          assignment.teamId
            ? [{
                countryId: assignment.team?.countryId,
                teamId: assignment.teamId,
              }]
            : [],
        ),
      ];
  const actorPermissionSets = await Promise.all(
    permissionResources.map((resource) =>
      getEffectivePermissions(currentUser.id, resource),
    ),
  );
  if (
    !actorPermissionSets.some((permissions) =>
      permissions.can("availability:read"),
    )
  ) {
    redirect("/dashboard");
  }

  const usersWhere: Prisma.UserWhereInput | undefined = hasGlobalScope
    ? undefined
    : {
        OR: [
          { id: currentUser.id },
          {
            roleAssignments: {
              some: {
                OR: [
                  ...(countryScopeIds.size
                    ? [
                        { countryId: { in: [...countryScopeIds] } },
                        { team: { countryId: { in: [...countryScopeIds] } } },
                      ]
                    : []),
                  ...(teamIds.size
                    ? [{ teamId: { in: [...teamIds] } }]
                    : []),
                ],
              },
            },
          },
        ],
      };
  const countriesWhere: Prisma.CountryWhereInput | undefined = hasGlobalScope
    ? undefined
    : { id: { in: [...visibleCountryIds] } };
  const mergedActorPermissions: EffectivePermissions = {
    roles: [...new Set(actorPermissionSets.flatMap(({ roles }) => roles))],
    permissions: new Set(
      actorPermissionSets.flatMap(({ permissions }) => [...permissions]),
    ),
    sources: Object.assign(
      {},
      ...actorPermissionSets.map(({ sources }) => sources),
    ),
    can(permission) {
      return this.permissions.has(permission);
    },
  };
  const globalActorPermissions = hasGlobalScope
    ? actorPermissionSets[0]
    : null;

  const [users, roles, countries, permissions, actorPermissions] =
    await Promise.all([
      prisma.user.findMany({
        where: usersWhere,
        select: {
          id: true,
          name: true,
          email: true,
          accessStatus: true,
          credential: { select: { userId: true } },
          accounts: { select: { provider: true } },
          assignedActivities: {
            where: { startsAt: { gte: new Date() } },
            select: { id: true },
          },
          availability: {
            where: { endsAt: { gte: new Date() } },
            orderBy: { startsAt: "asc" },
            take: 1,
            select: { startsAt: true },
          },
          roleAssignments: {
            include: {
              role: {
                include: {
                  permissions: {
                    include: { permission: true },
                  },
                },
              },
              country: { select: { id: true, name: true } },
              team: {
                select: {
                  id: true,
                  name: true,
                  countryId: true,
                  country: { select: { name: true } },
                },
              },
            },
            orderBy: { role: { priority: "desc" } },
          },
          permissionOverrides: {
            include: {
              permission: true,
              country: { select: { name: true } },
              team: {
                select: {
                  name: true,
                  country: { select: { name: true } },
                },
              },
            },
            orderBy: { createdAt: "desc" },
          },
        },
        orderBy: [{ accessStatus: "asc" }, { name: "asc" }],
      }),
      prisma.role.findMany({ orderBy: { priority: "desc" } }),
      prisma.country.findMany({
        where: countriesWhere,
        include: {
          teams: {
            orderBy: { name: "asc" },
          },
        },
        orderBy: { name: "asc" },
      }),
      prisma.permission.findMany({
        orderBy: [{ category: "asc" }, { label: "asc" }],
      }),
      Promise.resolve(mergedActorPermissions),
    ]);

  const members: TeamMember[] = users.map((user) => {
    const assignments = user.roleAssignments.map((assignment) => ({
      id: assignment.id,
      roleId: assignment.roleId,
      roleKey: assignment.role.key,
      roleName: assignment.role.name,
      rolePriority: assignment.role.priority,
      scopeType: assignment.scopeType,
      countryId: assignment.countryId ?? assignment.team?.countryId ?? null,
      teamId: assignment.teamId,
      scopeLabel: scopeLabel(assignment),
    }));
    const rawAssignments = user.roleAssignments.map((assignment) => ({
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
    }));
    const rawOverrides = user.permissionOverrides.map((override) => ({
      permissionKey: override.permission.key,
      effect: override.effect,
      countryId: override.countryId,
      teamId: override.teamId,
    }));
    const scopeEntries = new Map<
      string,
      { label: string; countryId?: string | null; teamId?: string | null }
    >([["GLOBAL", { label: "Global" }]]);
    for (const assignment of user.roleAssignments) {
      const key = assignment.teamId
        ? `TEAM:${assignment.teamId}`
        : assignment.countryId
          ? `COUNTRY:${assignment.countryId}`
          : "GLOBAL";
      scopeEntries.set(key, {
        label: scopeLabel(assignment),
        countryId: assignment.countryId ?? assignment.team?.countryId,
        teamId: assignment.teamId,
      });
    }
    const permissionScopes = [...scopeEntries.entries()]
      .map(([key, scope]) => {
        const resolved = resolveEffectivePermissions({
          assignments: rawAssignments,
          overrides: rawOverrides,
          resource:
            key === "GLOBAL"
              ? undefined
              : { countryId: scope.countryId, teamId: scope.teamId },
        });
        return {
          key,
          label: scope.label,
          permissions: permissions
            .filter((permission) => resolved.can(permission.key))
            .map((permission) => ({
              key: permission.key,
              label: permission.label,
              category: permission.category,
              source:
                (resolved.sources[permission.key]?.grants ?? 0) > 0
                  ? ("override" as const)
                  : ("role" as const),
            })),
        };
      })
      .filter((scope) => scope.permissions.length > 0);

    return {
      id: user.id,
      name: user.name ?? "Sin nombre",
      email: user.email ?? "Sin correo",
      accessStatus: user.accessStatus,
      hasLocalCredential: Boolean(user.credential),
      hasZohoAccount: user.accounts.some((account) => account.provider === "zoho"),
      activities: user.assignedActivities.length,
      nextAbsence: user.availability[0]
        ? user.availability[0].startsAt.toLocaleDateString("es-PA", {
            day: "2-digit",
            month: "short",
          })
        : null,
      assignments,
      permissionScopes,
      overrides: user.permissionOverrides.map((override) => ({
        id: override.id,
        permissionId: override.permissionId,
        permissionKey: override.permission.key,
        permissionLabel: override.permission.label,
        category: override.permission.category,
        effect: override.effect,
        scopeLabel: scopeLabel({
          scopeType:
            override.teamId ? "TEAM" : override.countryId ? "COUNTRY" : "GLOBAL",
          country: override.country,
          team: override.team,
        }),
      })),
    };
  });

  const actorAssignment = users
    .find((user) => user.id === currentUser.id)
    ?.roleAssignments.reduce(
      (highest, assignment) =>
        assignment.role.priority > highest ? assignment.role.priority : highest,
      0,
    );
  const model: TeamWorkspaceModel = {
    currentUserId: currentUser.id,
    canManageUsers: actorPermissions.can("team:manage"),
    isGlobalAdmin:
      Boolean(globalActorPermissions?.roles.includes("ADMIN")) &&
      Boolean(globalActorPermissions?.can("catalog:manage")),
    actorPriority: actorAssignment ?? 0,
    members,
    roles: roles.map((role) => ({
      id: role.id,
      key: role.key,
      name: role.name,
      priority: role.priority,
    })),
    permissions: permissions.map((permission) => ({
      id: permission.id,
      key: permission.key,
      label: permission.label,
      category: permission.category,
    })),
    countries: countries.map((country) => ({
      id: country.id,
      name: country.name,
      teams: country.teams
        .filter(
          (team) =>
            hasGlobalScope ||
            countryScopeIds.has(country.id) ||
            teamIds.has(team.id),
        )
        .map((team) => ({ id: team.id, name: team.name })),
    })),
  };

  return <TeamWorkspace model={model} />;
}
