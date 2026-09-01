import type { NotificationKind } from "@prisma/client";

export type NotificationRecipient = {
  id: string;
  email: string | null;
  name: string | null;
};

export type ActivityNotificationPayload = {
  kind:
    | "ACTIVITY_CREATED"
    | "ACTIVITY_UPDATED"
    | "ACTIVITY_REASSIGNED"
    | "ACTIVITY_STATUS_CHANGED"
    | "ACTIVITY_CANCELLED"
    | "ACTIVITY_COMMENTED"
    | "ACTIVITY_REMINDER";
  activity: {
    id: string;
    title: string;
    startsAt: string;
    endsAt: string;
    allDay: boolean;
    country: string;
    team?: string | null;
    customer?: string | null;
    partNumber?: string | null;
    partUrl?: string | null;
    type: string;
    status: string;
    priority: string;
    assignedToName?: string | null;
  };
  actorName?: string | null;
  previousStatus?: string | null;
  previousAssigneeName?: string | null;
  commentExcerpt?: string | null;
  occurrenceCount?: number;
  reminderMinutes?: number;
};

export type AccountNotificationPayload = {
  kind:
    | "USER_WELCOME"
    | "PASSWORD_RESET"
    | "USER_ROLE_ASSIGNED"
    | "USER_ROLE_REVOKED"
    | "USER_ACCESS_STATUS_CHANGED";
  user: { id: string; email: string; name: string };
  authMethod?: "LOCAL" | "ZOHO";
  temporaryPassword?: string;
  roleName?: string;
  scopeLabel?: string;
  accessStatus?: string;
  actorName?: string | null;
};

export type WorkLogNotificationPayload = {
  kind: "WORK_LOG_DRAFT" | "WORK_LOG_COMPLETED" | "WORK_LOG_ADMIN_UPDATED";
  workLog: {
    id: string;
    technician: string | null;
    country: string;
    team: string | null;
    customer: string | null;
    location: string | null;
    reference: string | null;
    workDate: string;
    timezone: string;
    startedAt: string;
    endedAt: string | null;
    durationMinutes: number | null;
    status: string;
    description: string | null;
  };
  actorId?: string | null;
};

export type EmailPayload = ActivityNotificationPayload | AccountNotificationPayload | WorkLogNotificationPayload;

export function isActivityKind(kind: NotificationKind) {
  return kind.startsWith("ACTIVITY_");
}
