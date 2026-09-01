import { describe, expect, it } from "vitest";

import type { ActivityWorkspaceModel } from "@/features/activities/activity-types";
import {
  applyAgendaStatus,
  isAgendaViewMode,
  matchesAgendaQuickFilter,
} from "@/features/agenda/agenda-state";

const activity = {
  id: "activity-1",
  status: { id: "planned", code: "PLANNED", name: "Planificada", color: "#3b82f6" },
} as ActivityWorkspaceModel["activities"][number];

describe("agenda state", () => {
  it("changes only the requested activity status without mutating the source", () => {
    const nextStatus = { id: "progress", code: "IN_PROGRESS", name: "En progreso", color: "#f59e0b" };
    const source = [activity];

    const next = applyAgendaStatus(source, activity.id, nextStatus);

    expect(next[0].status).toEqual(nextStatus);
    expect(source[0].status.code).toBe("PLANNED");
  });

  it("accepts only supported persisted view modes", () => {
    expect(isAgendaViewMode("list")).toBe(true);
    expect(isAgendaViewMode("kanban")).toBe(true);
    expect(isAgendaViewMode("board")).toBe(false);
    expect(isAgendaViewMode(null)).toBe(false);
  });

  it("applies quick filters without dropping cancelled activities from history", () => {
    const base = {
      ...activity,
      startsAt: "2026-08-12T15:00:00.000Z",
      assignedTo: { id: "tech-1", name: "Ana", email: "ana@example.com" },
    } as ActivityWorkspaceModel["activities"][number];

    expect(matchesAgendaQuickFilter(base, "today", "tech-1", new Date("2026-08-12T18:00:00.000Z"))).toBe(true);
    expect(matchesAgendaQuickFilter(base, "mine", "tech-1", new Date())).toBe(true);
    expect(matchesAgendaQuickFilter({ ...base, assignedTo: null }, "unassigned", "tech-1", new Date())).toBe(true);
    expect(matchesAgendaQuickFilter(base, "pending", "tech-1", new Date())).toBe(true);
    expect(matchesAgendaQuickFilter({ ...base, status: { ...base.status, code: "CANCELLED" } }, "all", "tech-1", new Date())).toBe(true);
  });
});
