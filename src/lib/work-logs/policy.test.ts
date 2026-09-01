import { describe, expect, it } from "vitest";

import {
  canCompleteWorkLog,
  canDeleteWorkLog,
  canFinishWorkLog,
  canReadWorkLog,
  canSaveWorkLog,
  canStartWorkLog,
} from "@/lib/work-logs/policy";

const owner = "owner";
const other = "other";

describe("work log policies", () => {
  it("requires create permission, scope and no active log to start", () => {
    expect(canStartWorkLog({ hasCreatePermission: true, hasActiveWorkLog: false, scopeAllowed: true })).toBe(true);
    expect(canStartWorkLog({ hasCreatePermission: true, hasActiveWorkLog: true, scopeAllowed: true })).toBe(false);
    expect(canStartWorkLog({ hasCreatePermission: true, hasActiveWorkLog: false, scopeAllowed: false })).toBe(false);
  });

  it("limits reads to the owner or an authorized scoped reader", () => {
    expect(canReadWorkLog({ actorUserId: owner, ownerUserId: owner, hasReadPermission: false })).toBe(true);
    expect(canReadWorkLog({ actorUserId: other, ownerUserId: owner, hasReadPermission: true })).toBe(true);
    expect(canReadWorkLog({ actorUserId: other, ownerUserId: owner, hasReadPermission: false })).toBe(false);
  });

  it("allows owner updates only in editable states", () => {
    expect(canSaveWorkLog({ actorUserId: owner, ownerUserId: owner, status: "IN_PROGRESS", hasUpdatePermission: true })).toBe(true);
    expect(canSaveWorkLog({ actorUserId: owner, ownerUserId: owner, status: "COMPLETED", hasUpdatePermission: true })).toBe(false);
    expect(canSaveWorkLog({ actorUserId: other, ownerUserId: owner, status: "IN_PROGRESS", hasUpdatePermission: true })).toBe(false);
  });

  it("separates finish and complete transitions", () => {
    expect(canFinishWorkLog({ actorUserId: owner, ownerUserId: owner, status: "IN_PROGRESS", hasFinishPermission: true })).toBe(true);
    expect(canCompleteWorkLog({ actorUserId: owner, ownerUserId: owner, status: "COMPLETION_PENDING", hasCompletePermission: true })).toBe(true);
    expect(canCompleteWorkLog({ actorUserId: owner, ownerUserId: owner, status: "IN_PROGRESS", hasCompletePermission: true })).toBe(false);
  });

  it("requires global administration for deletion", () => {
    expect(canDeleteWorkLog({ hasDeletePermission: true, isGlobalAdministrator: true })).toBe(true);
    expect(canDeleteWorkLog({ hasDeletePermission: true, isGlobalAdministrator: false })).toBe(false);
  });
});
