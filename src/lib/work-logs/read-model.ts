import "server-only";

import type { Prisma, ScopeType } from "@prisma/client";

import type {
  WorkLogActivityOption,
  WorkLogFilters,
  WorkLogHistoryModel,
  WorkLogPresentation,
  WorkLogScope,
  WorkLogWorkspaceModel,
} from "@/features/work-logs/work-log-types";
import { canDeleteWorkLog, canReadWorkLog } from "@/lib/work-logs/policy";
import { getEffectivePermissions } from "@/lib/permissions";
import { getPrisma } from "@/lib/prisma";

type ScopeAssignment = {
  scopeType: ScopeType | "GLOBAL" | "COUNTRY" | "TEAM";
  countryId: string | null;
  teamId: string | null;
};

export function buildWorkLogScopeWhere(
  userId: string,
  assignments: ScopeAssignment[],
): Prisma.WorkLogWhereInput {
  if (assignments.some((assignment) => assignment.scopeType === "GLOBAL")) return {};

  const countryIds = [...new Set(assignments.flatMap((assignment) => assignment.countryId ? [assignment.countryId] : []))];
  const teamIds = [...new Set(assignments.flatMap((assignment) => assignment.teamId ? [assignment.teamId] : []))];
  const OR: Prisma.WorkLogWhereInput[] = [{ userId }];
  if (countryIds.length) OR.push({ countryId: { in: countryIds } });
  if (teamIds.length) OR.push({ teamId: { in: teamIds } });
  if (OR.length === 1 && !countryIds.length && !teamIds.length) {
    return { id: { equals: "__work-log-scope-denied__" } };
  }
  return { OR };
}

export function buildWorkLogHistoryWhere(
  userId: string,
  filters: WorkLogFilters,
  scopeWhere: Prisma.WorkLogWhereInput = { OR: [{ userId }] },
): Prisma.WorkLogWhereInput {
  const AND: Prisma.WorkLogWhereInput[] = [scopeWhere];
  if (filters.dateFrom || filters.dateTo) {
    AND.push({ workDate: { gte: filters.dateFrom, lte: filters.dateTo } });
  }
  if (filters.userId) AND.push({ userId: filters.userId });
  if (filters.customerId) AND.push({ customerId: filters.customerId });
  const reference = filters.reference?.trim();
  if (reference) AND.push({ machineReference: { contains: reference } });
  if (filters.status) AND.push({ status: filters.status });
  return { AND };
}

type WorkLogReadRecord = {
  id: string;
  userId: string;
  activityId: string | null;
  workDate: Date;
  timezone: string;
  startedAt: Date;
  endedAt: Date | null;
  durationMinutes: number | null;
  status: "IN_PROGRESS" | "COMPLETION_PENDING" | "COMPLETED";
  startResetUsedAt: Date | null;
  completedAt: Date | null;
  draftNotifiedAt: Date | null;
  machineReference: string | null;
  location: string | null;
  description: string | null;
  createdAt: Date;
  updatedAt: Date;
  user: { id: string; name: string | null; email: string | null };
  activity: { id: string; title: string } | null;
  country: { id: string; code: string; name: string };
  team: { id: string; name: string } | null;
  customer: { id: string; name: string; code: string | null; isActive: boolean } | null;
  customerLocation: { id: string; name: string; isActive: boolean } | null;
  attachments: {
    id: string;
    uploadUuid: string;
    originalName: string;
    mimeType: string;
    sizeBytes: number;
    referenceUrl: string | null;
  }[];
};

type WorkLogCapabilitySet = {
  canUpdate: boolean;
  canFinish: boolean;
  canComplete: boolean;
  canAdminUpdate: boolean;
  canDelete: boolean;
};

export function serializeWorkLog(
  workLog: WorkLogReadRecord,
  capabilities: WorkLogCapabilitySet,
): WorkLogPresentation {
  return {
    id: workLog.id,
    userId: workLog.userId,
    technician: workLog.user,
    activityId: workLog.activityId,
    activity: workLog.activity,
    country: workLog.country,
    team: workLog.team,
    customer: workLog.customer,
    customerLocation: workLog.customerLocation,
    workDate: workLog.workDate.toISOString().slice(0, 10),
    timezone: workLog.timezone,
    startedAt: workLog.startedAt.toISOString(),
    endedAt: workLog.endedAt?.toISOString() ?? null,
    durationMinutes: workLog.durationMinutes,
    status: workLog.status,
    startResetUsedAt: workLog.startResetUsedAt?.toISOString() ?? null,
    completedAt: workLog.completedAt?.toISOString() ?? null,
    draftNotifiedAt: workLog.draftNotifiedAt?.toISOString() ?? null,
    machineReference: workLog.machineReference,
    location: workLog.location,
    description: workLog.description,
    attachments: workLog.attachments,
    createdAt: workLog.createdAt.toISOString(),
    updatedAt: workLog.updatedAt.toISOString(),
    capabilities,
  };
}

const workLogInclude = {
  user: { select: { id: true, name: true, email: true } },
  activity: { select: { id: true, title: true } },
  country: { select: { id: true, code: true, name: true } },
  team: { select: { id: true, name: true } },
  customer: { select: { id: true, name: true, code: true, isActive: true } },
  customerLocation: { select: { id: true, name: true, isActive: true } },
  attachments: {
    select: {
      id: true,
      uploadUuid: true,
      originalName: true,
      mimeType: true,
      sizeBytes: true,
      referenceUrl: true,
    },
    orderBy: { createdAt: "asc" as const },
  },
} satisfies Prisma.WorkLogInclude;

type WorkLogWithRelations = Prisma.WorkLogGetPayload<{ include: typeof workLogInclude }>;

async function getUserAssignments(userId: string) {
  const prisma = getPrisma();
  return prisma.userRoleAssignment.findMany({
    where: { userId },
    select: { scopeType: true, countryId: true, teamId: true },
  });
}

async function getWorkLogCapabilities(userId: string, workLog: WorkLogReadRecord): Promise<WorkLogCapabilitySet> {
  const permissions = await getEffectivePermissions(userId, {
    countryId: workLog.country.id,
    teamId: workLog.team?.id,
  });
  const isOwner = userId === workLog.userId;
  const isGlobalAdministrator = permissions.roles.includes("ADMIN") && permissions.can("worklog:delete");
  return {
    canUpdate: isOwner && permissions.can("worklog:update") && workLog.status !== "COMPLETED",
    canFinish: isOwner && permissions.can("worklog:finish") && workLog.status === "IN_PROGRESS",
    canComplete: isOwner && permissions.can("worklog:complete") && workLog.status === "COMPLETION_PENDING",
    canAdminUpdate: permissions.can("worklog:admin-update") && workLog.status === "IN_PROGRESS" && Boolean(workLog.draftNotifiedAt),
    canDelete: canDeleteWorkLog({ hasDeletePermission: permissions.can("worklog:delete"), isGlobalAdministrator }),
  };
}

async function serializeWorkLogRecord(userId: string, workLog: WorkLogWithRelations) {
  return serializeWorkLog(workLog, await getWorkLogCapabilities(userId, workLog));
}

function uniqueScopes(scopes: WorkLogScope[]) {
  const seen = new Set<string>();
  return scopes.filter((scope) => {
    const key = `${scope.country.id}:${scope.team?.id ?? "country"}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

export async function getWorkLogWorkspaceModel(userId: string): Promise<WorkLogWorkspaceModel> {
  const prisma = getPrisma();
  const [user, assignments, countries, activeWorkLog] = await Promise.all([
    prisma.user.findUnique({ select: { id: true, name: true, email: true, timezone: true }, where: { id: userId } }),
    getUserAssignments(userId),
    prisma.country.findMany({
      select: { id: true, code: true, name: true, teams: { select: { id: true, name: true }, orderBy: { name: "asc" } } },
      orderBy: { name: "asc" },
    }),
    prisma.workLog.findFirst({ where: { userId, activeKey: { not: null } }, include: workLogInclude, orderBy: { startedAt: "desc" } }),
  ]);
  if (!user) throw new Error("NOT_FOUND");

  const globalPermissions = await getEffectivePermissions(userId);
  const hasGlobalScope = assignments.some((assignment) => assignment.scopeType === "GLOBAL");
  const candidates: Array<{ country: { id: string; code: string; name: string }; team: { id: string; name: string } | null; scopeType: "GLOBAL" | "COUNTRY" | "TEAM" }> = [];
  for (const country of countries) {
    if (hasGlobalScope) {
      candidates.push({ country, team: null, scopeType: "GLOBAL" });
      country.teams.forEach((team) => candidates.push({ country, team, scopeType: "GLOBAL" }));
      continue;
    }
    if (assignments.some((assignment) => assignment.scopeType === "COUNTRY" && assignment.countryId === country.id)) {
      candidates.push({ country, team: null, scopeType: "COUNTRY" });
      country.teams.forEach((team) => candidates.push({ country, team, scopeType: "COUNTRY" }));
    }
    country.teams.forEach((team) => {
      if (assignments.some((assignment) => assignment.scopeType === "TEAM" && assignment.teamId === team.id)) {
        candidates.push({ country, team, scopeType: "TEAM" });
      }
    });
  }
  const scopes = uniqueScopes((await Promise.all(candidates.map(async (candidate) => {
    const permissions = candidate.scopeType === "GLOBAL"
      ? globalPermissions
      : await getEffectivePermissions(userId, { countryId: candidate.country.id, teamId: candidate.team?.id });
    return permissions.can("worklog:create") ? { ...candidate, canStart: true } : null;
  }))).filter((scope): scope is WorkLogScope => Boolean(scope)));

  const [customers, activities] = await Promise.all([
    prisma.customer.findMany({
      where: { isActive: true },
      select: {
        id: true,
        name: true,
        code: true,
        isActive: true,
        locations: { where: { isActive: true }, select: { id: true, name: true, isActive: true }, orderBy: { name: "asc" } },
      },
      orderBy: { name: "asc" },
    }),
    prisma.activity.findMany({
      where: {
        workLog: null,
        OR: hasGlobalScope
          ? undefined
          : [
              { countryId: { in: assignments.flatMap((assignment) => assignment.countryId ? [assignment.countryId] : []) } },
              { teamId: { in: assignments.flatMap((assignment) => assignment.teamId ? [assignment.teamId] : []) } },
              { assignedToId: userId },
              { createdById: userId },
            ],
      },
      select: {
        id: true,
        title: true,
        startsAt: true,
        endsAt: true,
        country: { select: { id: true, code: true, name: true } },
        team: { select: { id: true, name: true } },
        customer: { select: { id: true, name: true, code: true, isActive: true } },
        assignedTo: { select: { id: true, name: true, email: true } },
      },
      orderBy: [{ startsAt: "desc" }, { createdAt: "desc" }],
      take: 250,
    }),
  ]);

  const permittedActivities = (await Promise.all(activities.map(async (activity) => {
    const permissions = await getEffectivePermissions(userId, { countryId: activity.country.id, teamId: activity.team?.id });
    if (!permissions.can("worklog:create")) return null;
    return {
      ...activity,
      startsAt: activity.startsAt.toISOString(),
      endsAt: activity.endsAt.toISOString(),
    } satisfies WorkLogActivityOption;
  }))).filter((activity): activity is WorkLogActivityOption => Boolean(activity));
  const activePresentation = activeWorkLog ? await serializeWorkLogRecord(userId, activeWorkLog) : null;

  return {
    currentUser: user,
    activeWorkLog: activePresentation,
    scopes,
    customers,
    activities: permittedActivities,
    capabilities: {
      canRead: globalPermissions.can("worklog:read"),
      canCreate: scopes.length > 0,
      canUpdate: globalPermissions.can("worklog:update"),
      canFinish: globalPermissions.can("worklog:finish"),
      canComplete: globalPermissions.can("worklog:complete"),
      canAdminUpdate: globalPermissions.can("worklog:admin-update"),
      canDelete: globalPermissions.can("worklog:delete") && globalPermissions.roles.includes("ADMIN"),
    },
  };
}

export async function getWorkLogHistoryModel(
  userId: string,
  filters: WorkLogFilters = {},
  options: { page?: number; pageSize?: number } = {},
): Promise<WorkLogHistoryModel> {
  const prisma = getPrisma();
  const [assignments, globalPermissions] = await Promise.all([
    getUserAssignments(userId),
    getEffectivePermissions(userId),
  ]);
  const isAdministrator = globalPermissions.roles.includes("ADMIN");
  const baseScope = isAdministrator ? buildWorkLogScopeWhere(userId, assignments) : { OR: [{ userId }] };
  const where = buildWorkLogHistoryWhere(userId, {
    ...filters,
    userId: isAdministrator ? filters.userId : userId,
  }, baseScope);
  const page = Math.max(1, options.page ?? 1);
  const pageSize = Math.min(100, Math.max(1, options.pageSize ?? 50));
  const [records, total] = await Promise.all([
    prisma.workLog.findMany({
      where,
      include: workLogInclude,
      orderBy: [{ workDate: "desc" }, { startedAt: "desc" }],
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
    prisma.workLog.count({ where }),
  ]);
  const visibleRecords = (await Promise.all(records.map(async (record) => {
    const resourcePermissions = await getEffectivePermissions(userId, { countryId: record.country.id, teamId: record.team?.id });
    const canRead = canReadWorkLog({
      actorUserId: userId,
      ownerUserId: record.userId,
      hasReadPermission: resourcePermissions.can("worklog:read"),
      scopeAllowed: isAdministrator || record.userId === userId,
    });
    return canRead ? record : null;
  }))).filter((record): record is WorkLogWithRelations => Boolean(record));

  return {
    items: await Promise.all(visibleRecords.map((record) => serializeWorkLogRecord(userId, record))),
    page,
    pageSize,
    total,
    hasNextPage: page * pageSize < total,
  };
}
