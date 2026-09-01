import { notFound } from "next/navigation";

import {
  ActionProbe,
  type ProbeOperation,
  type ProbePayload,
} from "@/features/e2e/action-probe";
import { getPrisma } from "@/lib/prisma";

const operations = new Set<ProbeOperation>([
  "update-foreign",
  "comment-foreign",
  "assign-foreign",
  "revoke-foreign",
  "suspend-a2",
  "revoke-self",
  "disable-critical",
  "create-own",
]);
const e2eId = (key: string) => `c${key.padEnd(24, "z").slice(0, 24)}`;

export default async function E2EActionProbePage({
  searchParams,
}: {
  searchParams: Promise<{ operation?: string }>;
}) {
  if (process.env.E2E_TEST_MODE !== "1") notFound();
  const requested = (await searchParams).operation as ProbeOperation | undefined;
  if (!requested || !operations.has(requested)) notFound();

  const prisma = getPrisma();
  const [activity, adminRole, targetRole, criticalPermission, assignmentA2, assignmentA13] =
    await Promise.all([
      prisma.activity.findUniqueOrThrow({
        where: { id: e2eId("e2eactivitypa2") },
        select: {
          id: true,
          allDay: true,
          assignedToId: true,
          countryId: true,
          description: true,
          endsAt: true,
          priorityId: true,
          startsAt: true,
          statusId: true,
          teamId: true,
          title: true,
          typeId: true,
        },
      }),
      prisma.role.findUniqueOrThrow({ where: { key: "ADMIN" }, select: { id: true } }),
      prisma.role.findUniqueOrThrow({ where: { key: "TECNICO" }, select: { id: true } }),
      prisma.permission.findUniqueOrThrow({ where: { key: "catalog:manage" }, select: { id: true } }),
      prisma.userRoleAssignment.findUniqueOrThrow({ where: { id: e2eId("e2eassignmenta2") }, select: { id: true } }),
      prisma.userRoleAssignment.findUniqueOrThrow({ where: { id: e2eId("e2eassignmenta13") }, select: { id: true } }),
    ]);

  const payload: ProbePayload = {
    activity: {
      activityId: activity.id,
      allDay: activity.allDay,
      assignedToId: activity.assignedToId ?? undefined,
      countryId: activity.countryId,
      description: activity.description ?? undefined,
      endsAt: activity.endsAt.toISOString(),
      priorityId: activity.priorityId,
      startsAt: activity.startsAt.toISOString(),
      statusId: activity.statusId,
      teamId: activity.teamId ?? undefined,
      title: `${activity.title} IDOR`,
      typeId: activity.typeId,
    },
    adminRoleId: adminRole.id,
    assignmentA2Id: assignmentA2.id,
    assignmentA13Id: assignmentA13.id,
    criticalPermissionId: criticalPermission.id,
    targetRoleId: targetRole.id,
    userA2Id: e2eId("e2eusera2"),
    userA4Id: e2eId("e2eusera4"),
    teamPA1Id: e2eId("e2eteampa1"),
  };

  return <ActionProbe operation={requested} payload={payload} />;
}
