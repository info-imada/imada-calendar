import type { ActivityNotificationPayload } from "@/lib/notifications/types";
import { buildBaseEmail, type EmailContent } from "@/lib/email/templates/base-email";

const copy = {
  ACTIVITY_CREATED: ["Nueva actividad", "Se ha creado una actividad en Calendar."],
  ACTIVITY_UPDATED: ["Actividad actualizada", "Se actualizaron los datos de una actividad."],
  ACTIVITY_REASSIGNED: ["Actividad reasignada", "Cambió la persona responsable de una actividad."],
  ACTIVITY_STATUS_CHANGED: ["Estado actualizado", "Cambió el estado de una actividad."],
  ACTIVITY_CANCELLED: ["Actividad cancelada", "Una actividad fue cancelada."],
  ACTIVITY_COMMENTED: ["Nuevo comentario", "Se agregó un comentario a una actividad."],
  ACTIVITY_REMINDER: ["Recordatorio de actividad", "Una actividad asignada está próxima a comenzar."],
} as const;

function formatDate(value: string) {
  return new Intl.DateTimeFormat("es", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "UTC",
  }).format(new Date(value));
}

export function buildActivityEmail(
  payload: ActivityNotificationPayload,
  appUrl: string,
): EmailContent {
  const [title, intro] = copy[payload.kind];
  const url = new URL("/dashboard", appUrl);
  url.searchParams.set("activity", payload.activity.id);
  const base = buildBaseEmail({
    title,
    intro,
    details: [
      { label: "Actividad", value: payload.activity.title },
      { label: "Inicio", value: formatDate(payload.activity.startsAt) },
      { label: "Responsable", value: payload.activity.assignedToName },
      { label: "Estado", value: payload.activity.status },
      { label: "Prioridad", value: payload.activity.priority },
      { label: "Territorio", value: [payload.activity.country, payload.activity.team].filter(Boolean).join(" · ") },
      { label: "Cliente", value: payload.activity.customer },
      { label: "Número de parte", value: payload.activity.partNumber },
      { label: "Estado anterior", value: payload.previousStatus },
      { label: "Responsable anterior", value: payload.previousAssigneeName },
      { label: "Comentario", value: payload.commentExcerpt },
      { label: "Creado por", value: payload.actorName },
      { label: "Ocurrencias", value: payload.occurrenceCount && payload.occurrenceCount > 1 ? String(payload.occurrenceCount) : null },
      { label: "Aviso", value: payload.reminderMinutes ? (payload.reminderMinutes === 60 ? "Comienza en 1 hora" : "Comienza en 24 horas") : null },
    ],
    actionLabel: "Ver actividad",
    actionUrl: url.toString(),
  });
  return { subject: `${title}: ${payload.activity.title}`, ...base };
}
