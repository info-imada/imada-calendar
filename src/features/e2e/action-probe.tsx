"use client";

import { useState, useTransition } from "react";

import { addActivityComment, createActivity, updateActivity } from "@/app/actions/activities";
import {
  assignUserRole,
  revokeUserRole,
  setManagedUserStatus,
  setRolePermission,
} from "@/app/actions/authorization";
import { Button } from "@/components/ui/button";

type ProbeOperation =
  | "update-foreign"
  | "comment-foreign"
  | "assign-foreign"
  | "revoke-foreign"
  | "suspend-a2"
  | "revoke-self"
  | "disable-critical"
  | "create-own";

type ProbePayload = {
  activity: {
    activityId: string;
    allDay: boolean;
    assignedToId?: string;
    countryId: string;
    description?: string;
    endsAt: string;
    priorityId: string;
    startsAt: string;
    statusId: string;
    teamId?: string;
    title: string;
    typeId: string;
  };
  adminRoleId: string;
  assignmentA2Id: string;
  assignmentA13Id: string;
  criticalPermissionId: string;
  targetRoleId: string;
  userA2Id: string;
  userA4Id: string;
  teamPA1Id: string;
};

export function ActionProbe({ operation, payload }: { operation: ProbeOperation; payload: ProbePayload }) {
  const [pending, startTransition] = useTransition();
  const [result, setResult] = useState<unknown>(null);

  function run() {
    startTransition(async () => {
      let next: unknown;
      switch (operation) {
        case "update-foreign":
          next = await updateActivity({
            ...payload.activity,
            startsAt: new Date(payload.activity.startsAt),
            endsAt: new Date(payload.activity.endsAt),
          });
          break;
        case "comment-foreign":
          next = await addActivityComment({
            activityId: payload.activity.activityId,
            body: "Intento IDOR E2E fuera de alcance",
          });
          break;
        case "assign-foreign":
          next = await assignUserRole({
            userId: payload.userA4Id,
            roleId: payload.targetRoleId,
            scopeType: "TEAM",
            teamId: payload.teamPA1Id,
          });
          break;
        case "revoke-foreign":
          next = await revokeUserRole({ assignmentId: payload.assignmentA2Id });
          break;
        case "suspend-a2":
          next = await setManagedUserStatus({ userId: payload.userA2Id, accessStatus: "SUSPENDED" });
          break;
        case "revoke-self":
          next = await revokeUserRole({ assignmentId: payload.assignmentA13Id });
          break;
        case "disable-critical":
          next = await setRolePermission({
            roleId: payload.adminRoleId,
            permissionId: payload.criticalPermissionId,
            enabled: false,
          });
          break;
        case "create-own":
          const { activityId, ...activityInput } = payload.activity;
          if (!activityId) throw new Error("El probe E2E requiere un activityId base.");
          next = await createActivity({
            ...activityInput,
            title: `E2E GRANT create ${Date.now()}`,
            assignedToId: undefined,
            startsAt: new Date("2026-08-04T14:00:00.000Z"),
            endsAt: new Date("2026-08-04T16:00:00.000Z"),
          });
          break;
      }
      setResult(next);
    });
  }

  return (
    <main className="p-8">
      <h1 className="text-xl font-semibold">E2E Server Action probe</h1>
      <p data-testid="probe-operation">{operation}</p>
      <Button disabled={pending} onClick={run}>Ejecutar acción real</Button>
      <pre data-testid="action-result">{result === null ? "PENDING" : JSON.stringify(result)}</pre>
    </main>
  );
}

export type { ProbeOperation, ProbePayload };
