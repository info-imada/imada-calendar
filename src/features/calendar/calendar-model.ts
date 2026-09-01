import type {
  ActivityPresentation,
  ActivityWorkspaceModel,
} from "@/features/activities/activity-types";

export const ALL_CALENDAR_FILTER = "ALL";
export const UNASSIGNED_RESOURCE_ID = "UNASSIGNED";

export type CalendarFilters = {
  countryId: string;
  technicianId: string;
};

export type CalendarEvent = {
  activity: ActivityPresentation;
  allDay: boolean;
  end: Date;
  id: string;
  resourceId: string;
  start: Date;
  title: string;
};

export type TechnicianResource = {
  id: string;
  title: string;
};

export function buildCalendarEvents(
  model: ActivityWorkspaceModel,
  filters: CalendarFilters,
): CalendarEvent[] {
  return model.activities
    .filter((activity) => (
      filters.countryId === ALL_CALENDAR_FILTER ||
      activity.country.id === filters.countryId
    ))
    .filter((activity) => {
      if (filters.technicianId === ALL_CALENDAR_FILTER) return true;
      if (filters.technicianId === UNASSIGNED_RESOURCE_ID) return !activity.assignedTo;
      return activity.assignedTo?.id === filters.technicianId;
    })
    .map((activity) => ({
      activity,
      allDay: activity.allDay,
      end: new Date(activity.endsAt),
      id: activity.id,
      resourceId: activity.assignedTo?.id ?? UNASSIGNED_RESOURCE_ID,
      start: new Date(activity.startsAt),
      title: activity.title,
    }));
}

export function buildTechnicianResources(
  model: ActivityWorkspaceModel,
): TechnicianResource[] {
  return [
    ...model.technicians.map((technician) => ({
      id: technician.id,
      title: technician.name || technician.email || "Sin nombre",
    })),
    { id: UNASSIGNED_RESOURCE_ID, title: "Sin asignar" },
  ];
}
