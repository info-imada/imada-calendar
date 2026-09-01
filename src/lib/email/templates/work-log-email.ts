import { formatWorkLogDateTime } from "@/lib/work-logs/time";
import { buildBaseEmail, type EmailContent } from "@/lib/email/templates/base-email";
import type { WorkLogNotificationPayload } from "@/lib/notifications/types";

const copy = {
  WORK_LOG_DRAFT: ["Registro de tarea iniciado", "Se guardó un borrador de trabajo en Calendar."],
  WORK_LOG_COMPLETED: ["Registro de tarea completado", "Se completó un registro de trabajo en Calendar."],
  WORK_LOG_ADMIN_UPDATED: ["Registro de tarea actualizado", "Un administrador actualizó un registro de trabajo."],
} as const;

export function buildWorkLogEmail(payload: WorkLogNotificationPayload, appUrl: string): EmailContent {
  const [title, intro] = copy[payload.kind];
  const workLogUrl = new URL(`/work-logs/${payload.workLog.id}`, appUrl).toString();
  const workLog = payload.workLog;
  const base = buildBaseEmail({
    title,
    intro,
    details: [
      { label: "Técnico", value: workLog.technician },
      { label: "Cliente", value: workLog.customer },
      { label: "Ubicación", value: [workLog.location, workLog.country, workLog.team].filter(Boolean).join(" · ") },
      { label: "Referencia", value: workLog.reference },
      { label: "Inicio", value: formatWorkLogDateTime(workLog.startedAt, workLog.timezone) },
      { label: "Fin", value: workLog.endedAt ? formatWorkLogDateTime(workLog.endedAt, workLog.timezone) : null },
      { label: "Duración", value: workLog.durationMinutes === null ? null : `${workLog.durationMinutes} min` },
      { label: "Estado", value: workLog.status },
      { label: "Descripción", value: workLog.description },
    ],
    actionLabel: "Ver registro",
    actionUrl: workLogUrl,
    note: `Zona horaria: ${workLog.timezone}`,
  });
  return { subject: `${title}: ${workLog.customer ?? "Trabajo"}`, ...base };
}
