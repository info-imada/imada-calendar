export type WorkLogPolicyStatus = "IN_PROGRESS" | "COMPLETION_PENDING" | "COMPLETED";

export function canStartWorkLog(input: {
  hasCreatePermission: boolean;
  hasActiveWorkLog: boolean;
  scopeAllowed: boolean;
}): boolean {
  return input.hasCreatePermission && !input.hasActiveWorkLog && input.scopeAllowed;
}

export function canReadWorkLog(input: {
  actorUserId: string;
  ownerUserId: string;
  hasReadPermission: boolean;
  scopeAllowed?: boolean;
}): boolean {
  if (input.scopeAllowed === false) return false;
  return input.actorUserId === input.ownerUserId || input.hasReadPermission;
}

export function canSaveWorkLog(input: {
  actorUserId: string;
  ownerUserId: string;
  status: WorkLogPolicyStatus;
  hasUpdatePermission: boolean;
}): boolean {
  return (
    input.actorUserId === input.ownerUserId &&
    input.hasUpdatePermission &&
    input.status !== "COMPLETED"
  );
}

export function canFinishWorkLog(input: {
  actorUserId: string;
  ownerUserId: string;
  status: WorkLogPolicyStatus;
  hasFinishPermission: boolean;
}): boolean {
  return (
    input.actorUserId === input.ownerUserId &&
    input.hasFinishPermission &&
    input.status === "IN_PROGRESS"
  );
}

export function canCompleteWorkLog(input: {
  actorUserId: string;
  ownerUserId: string;
  status: WorkLogPolicyStatus;
  hasCompletePermission: boolean;
}): boolean {
  return (
    input.actorUserId === input.ownerUserId &&
    input.hasCompletePermission &&
    input.status === "COMPLETION_PENDING"
  );
}

export function canDeleteWorkLog(input: {
  hasDeletePermission: boolean;
  isGlobalAdministrator: boolean;
}): boolean {
  return input.hasDeletePermission && input.isGlobalAdministrator;
}
