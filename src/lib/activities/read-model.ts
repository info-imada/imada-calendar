import "server-only";

import { AccessStatus, Prisma, ScopeType } from "@prisma/client";

import type { ActivityWorkspaceModel } from "@/features/activities/activity-types";
import { getEffectivePermissions, type PermissionResource } from "@/lib/permissions";
import { getPrisma } from "@/lib/prisma";

type ScopeAssignment = {
  scopeType: ScopeType;
  countryId: string | null;
  teamId: string | null;
};

export function buildActivityScopeWhere(
  userId: string,
  assignments: ScopeAssignment[],
): Prisma.ActivityWhereInput {
  if (assignments.some((assignment) => assignment.scopeType === ScopeType.GLOBAL)) return {};

  const countryIds = [...new Set(assignments.flatMap((assignment) => assignment.countryId ? [assignment.countryId] : []))];
  const teamIds = [...new Set(assignments.flatMap((assignment) => assignment.teamId ? [assignment.teamId] : []))];
  const OR: Prisma.ActivityWhereInput[] = [];
  if (countryIds.length) OR.push({ countryId: { in: countryIds } });
  if (teamIds.length) OR.push({ teamId: { in: teamIds } });
  OR.push({ assignedToId: userId }, { createdById: userId });
  return { OR };
}

export async function getActivityWorkspaceModel(userId: string): Promise<ActivityWorkspaceModel> {
  const prisma = getPrisma();
  const assignments = await prisma.userRoleAssignment.findMany({
    where: { userId },
    select: { scopeType: true, countryId: true, teamId: true },
  });
  const activityWhere = buildActivityScopeWhere(userId, assignments);
  const hasGlobalScope = assignments.some((assignment) => assignment.scopeType === ScopeType.GLOBAL);
  const countryIds = assignments.flatMap((assignment) => assignment.countryId ? [assignment.countryId] : []);
  const teamIds = assignments.flatMap((assignment) => assignment.teamId ? [assignment.teamId] : []);
  const countryWhere: Prisma.CountryWhereInput = hasGlobalScope
    ? {}
    : { OR: [{ id: { in: countryIds } }, { teams: { some: { id: { in: teamIds } } } }] };
  const technicianWhere: Prisma.UserWhereInput = hasGlobalScope
    ? { accessStatus: AccessStatus.ACTIVE, roleAssignments: { some: {} } }
    : {
        accessStatus: AccessStatus.ACTIVE,
        roleAssignments: {
          some: {
            OR: [
              { scopeType: ScopeType.GLOBAL },
              { scopeType: ScopeType.COUNTRY, countryId: { in: countryIds } },
              { scopeType: ScopeType.TEAM, teamId: { in: teamIds } },
            ],
          },
        },
      };

  const [activities, countries, technicians, types, statuses, priorities, customers] = await Promise.all([
    prisma.activity.findMany({
      where: activityWhere,
      include: {
        country: { select: { id: true, code: true, name: true } },
        team: { select: { id: true, name: true } },
        customer: { select: { id: true, name: true, code: true, isActive: true } },
        type: { select: { id: true, code: true, name: true, color: true } },
        status: { select: { id: true, code: true, name: true, color: true } },
        priority: { select: { id: true, code: true, name: true, color: true, level: true } },
        assignedTo: { select: { id: true, email: true, name: true } },
        createdBy: { select: { id: true, email: true, name: true } },
        workLog: { select: { id: true, status: true, userId: true } },
        series: { include: { recurrenceRule: true } },
        comments: {
          include: { author: { select: { id: true, email: true, name: true } } },
          orderBy: { createdAt: "desc" },
        },
      },
      orderBy: [{ startsAt: "desc" }, { createdAt: "desc" }],
      take: 250,
    }),
    prisma.country.findMany({
      where: countryWhere,
      select: { id: true, code: true, name: true, teams: { select: { id: true, name: true }, orderBy: { name: "asc" } } },
      orderBy: { name: "asc" },
    }),
    prisma.user.findMany({
      where: technicianWhere,
      select: { id: true, email: true, name: true },
      orderBy: [{ name: "asc" }, { email: "asc" }],
    }),
    prisma.activityType.findMany({ where: { isActive: true }, select: { id: true, code: true, name: true, color: true }, orderBy: { sortOrder: "asc" } }),
    prisma.activityStatus.findMany({ where: { isActive: true }, select: { id: true, code: true, name: true, color: true }, orderBy: { sortOrder: "asc" } }),
    prisma.priority.findMany({ where: { isActive: true }, select: { id: true, code: true, name: true, color: true, level: true }, orderBy: { sortOrder: "asc" } }),
    prisma.customer.findMany({ where: { isActive: true }, select: { id: true, name: true, code: true, isActive: true }, orderBy: { name: "asc" } }),
  ]);
  const activityIds = activities.map((activity) => activity.id);
  const audit = activityIds.length
    ? await prisma.auditLog.findMany({
        where: { entityType: "Activity", entityId: { in: activityIds } },
        select: { id: true, action: true, actorId: true, entityId: true, createdAt: true },
        orderBy: { createdAt: "desc" },
      })
    : [];
  const auditByActivity = new Map<string, typeof audit>();
  audit.forEach((entry) => auditByActivity.set(entry.entityId, [...(auditByActivity.get(entry.entityId) ?? []), entry]));
  const activityPermissions = await Promise.all(
    activities.map((activity) =>
      getEffectivePermissions(userId, {
        countryId: activity.country.id,
        teamId: activity.team?.id,
      }),
    ),
  );
  const teamCountryById = new Map(
    countries.flatMap((country) =>
      country.teams.map((team) => [team.id, country.id] as const),
    ),
  );
  const createResources: Array<PermissionResource | undefined> = hasGlobalScope
    ? [undefined]
    : assignments.flatMap<PermissionResource>((assignment) => {
        if (assignment.scopeType === ScopeType.COUNTRY && assignment.countryId) {
          return [{ countryId: assignment.countryId }];
        }
        if (assignment.scopeType === ScopeType.TEAM && assignment.teamId) {
          return [{
            countryId: teamCountryById.get(assignment.teamId),
            teamId: assignment.teamId,
          }];
        }
        return [];
      });
  const createPermissionSets = await Promise.all(
    createResources.map((resource) => getEffectivePermissions(userId, resource)),
  );

  return {
    currentUserId: userId,
    canCreate: createPermissionSets.some((permissions) =>
      permissions.can("activity:create"),
    ),
    countries,
    customers,
    technicians,
    types,
    statuses,
    priorities,
    activities: activities.map((activity, index) => ({
      ...activity,
      startsAt: activity.startsAt.toISOString(),
      endsAt: activity.endsAt.toISOString(),
      createdAt: activity.createdAt.toISOString(),
      updatedAt: activity.updatedAt.toISOString(),
      series: activity.series ? {
        id: activity.series.id,
        recurrenceRule: activity.series.recurrenceRule ? {
          frequency: activity.series.recurrenceRule.frequency,
          interval: activity.series.recurrenceRule.interval,
          endsAt: activity.series.recurrenceRule.endsAt?.toISOString() ?? null,
          timezone: activity.series.recurrenceRule.timezone,
        } : null,
      } : null,
      comments: activity.comments.map((comment) => ({ ...comment, createdAt: comment.createdAt.toISOString() })),
      audit: (activityPermissions[index].can("audit:read") ? auditByActivity.get(activity.id) ?? [] : []).map((entry) => ({
        id: entry.id,
        action: entry.action,
        actorId: entry.actorId,
        createdAt: entry.createdAt.toISOString(),
      })),
      capabilities: {
        canComment: activityPermissions[index].can("activity:comment"),
        canReadAudit: activityPermissions[index].can("audit:read"),
        canUpdate: activityPermissions[index].can("activity:update"),
        canCreateWorkLog: activityPermissions[index].can("worklog:create") && !activity.workLog,
        canOpenWorkLog: Boolean(activity.workLog) && (activity.workLog?.userId === userId || activityPermissions[index].can("worklog:read")),
      },
      workLog: activity.workLog ? { id: activity.workLog.id, status: activity.workLog.status } : null,
    })),
  };
}
