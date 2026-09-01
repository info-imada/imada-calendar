import { describe, expect, it } from "vitest";

import type { ActivityWorkspaceModel } from "@/features/activities/activity-types";
import {
  buildCalendarEvents,
  buildTechnicianResources,
  UNASSIGNED_RESOURCE_ID,
} from "@/features/calendar/calendar-model";

const model: ActivityWorkspaceModel = {
  currentUserId: "tech-pa",
  canCreate: true,
  countries: [
    { id: "country-pa", code: "PA", name: "Panamá", teams: [] },
    { id: "country-mx", code: "MX", name: "México", teams: [] },
  ],
  technicians: [
    { id: "tech-pa", name: "Ana Torres", email: "ana@example.com" },
    { id: "tech-mx", name: "Luis Vega", email: "luis@example.com" },
  ],
  types: [{ id: "type-1", code: "VISIT", name: "Visita", color: "#34b27b" }],
  statuses: [{ id: "status-1", code: "PLANNED", name: "Planificada", color: "#3b82f6" }],
  priorities: [{ id: "priority-1", code: "HIGH", name: "Alta", color: "#f59e0b", level: 30 }],
  activities: [
    {
      id: "activity-pa",
      title: "Mantenimiento Panamá",
      description: null,
      startsAt: "2026-07-15T13:00:00.000Z",
      endsAt: "2026-07-15T15:00:00.000Z",
      allDay: false,
      country: { id: "country-pa", code: "PA", name: "Panamá" },
      team: null,
      type: { id: "type-1", code: "VISIT", name: "Visita", color: "#34b27b" },
      status: { id: "status-1", code: "PLANNED", name: "Planificada", color: "#3b82f6" },
      priority: { id: "priority-1", code: "HIGH", name: "Alta", color: "#f59e0b", level: 30 },
      assignedTo: { id: "tech-pa", name: "Ana Torres", email: "ana@example.com" },
      createdBy: { id: "tech-pa", name: "Ana Torres", email: "ana@example.com" },
      series: null,
      comments: [],
      audit: [],
      createdAt: "2026-07-14T13:00:00.000Z",
      updatedAt: "2026-07-14T13:00:00.000Z",
      capabilities: { canComment: true, canUpdate: true },
    },
    {
      id: "activity-mx",
      title: "Visita México",
      description: null,
      startsAt: "2026-07-16T13:00:00.000Z",
      endsAt: "2026-07-16T15:00:00.000Z",
      allDay: false,
      country: { id: "country-mx", code: "MX", name: "México" },
      team: null,
      type: { id: "type-1", code: "VISIT", name: "Visita", color: "#34b27b" },
      status: { id: "status-1", code: "PLANNED", name: "Planificada", color: "#3b82f6" },
      priority: { id: "priority-1", code: "HIGH", name: "Alta", color: "#f59e0b", level: 30 },
      assignedTo: null,
      createdBy: { id: "tech-pa", name: "Ana Torres", email: "ana@example.com" },
      series: null,
      comments: [],
      audit: [],
      createdAt: "2026-07-14T13:00:00.000Z",
      updatedAt: "2026-07-14T13:00:00.000Z",
      capabilities: { canComment: true, canUpdate: true },
    },
  ],
};

describe("calendar model", () => {
  it("converts persisted activities into real Date events", () => {
    const events = buildCalendarEvents(model, { countryId: "ALL", technicianId: "ALL" });

    expect(events).toHaveLength(2);
    expect(events[0].start).toBeInstanceOf(Date);
    expect(events[0].end).toBeInstanceOf(Date);
    expect(events[0].resourceId).toBe("tech-pa");
    expect(events[1].resourceId).toBe(UNASSIGNED_RESOURCE_ID);
    expect(events[0].activity.id).toBe("activity-pa");
  });

  it("applies country and technician filters without mutating the read model", () => {
    const original = structuredClone(model.activities);
    const events = buildCalendarEvents(model, { countryId: "country-mx", technicianId: UNASSIGNED_RESOURCE_ID });

    expect(events.map((event) => event.id)).toEqual(["activity-mx"]);
    expect(model.activities).toEqual(original);
  });

  it("builds named technician resources plus an unassigned lane", () => {
    expect(buildTechnicianResources(model)).toEqual([
      { id: "tech-pa", title: "Ana Torres" },
      { id: "tech-mx", title: "Luis Vega" },
      { id: UNASSIGNED_RESOURCE_ID, title: "Sin asignar" },
    ]);
  });
});
