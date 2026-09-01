import type {
  ActivityCatalogItem,
  ActivityPresentation,
} from "@/features/activities/activity-types";

export const AGENDA_VIEW_STORAGE_KEY = "calendar:agenda-view";
export const AGENDA_VIEW_STORAGE_EVENT = "calendar:agenda-view-change";

export type AgendaViewMode = "list" | "kanban";
export type AgendaQuickFilter = "all" | "today" | "mine" | "unassigned" | "pending";

export function isAgendaViewMode(value: string | null): value is AgendaViewMode {
  return value === "list" || value === "kanban";
}

export function applyAgendaStatus(
  activities: ActivityPresentation[],
  activityId: string,
  status: ActivityCatalogItem,
) {
  return activities.map((activity) =>
    activity.id === activityId ? { ...activity, status } : activity,
  );
}

export function matchesAgendaQuickFilter(
  activity: ActivityPresentation,
  filter: AgendaQuickFilter,
  currentUserId: string,
  now: Date,
) {
  if (filter === "all") return true;
  if (filter === "mine") return activity.assignedTo?.id === currentUserId;
  if (filter === "unassigned") return activity.assignedTo === null;
  if (filter === "pending") {
    return activity.status.code !== "COMPLETED" && activity.status.code !== "CANCELLED";
  }

  const startsAt = new Date(activity.startsAt);
  return startsAt.getFullYear() === now.getFullYear()
    && startsAt.getMonth() === now.getMonth()
    && startsAt.getDate() === now.getDate();
}
