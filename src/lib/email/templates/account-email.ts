import { buildBaseEmail, type EmailContent } from "@/lib/email/templates/base-email";
import type { AccountNotificationPayload } from "@/lib/notifications/types";

export function buildAccountEmail(
  payload: AccountNotificationPayload,
  appUrl: string,
): EmailContent {
  const loginUrl = new URL("/login", appUrl).toString();
  const variants = {
    USER_WELCOME: ["Bienvenido a Calendar", `Hola ${payload.user.name}, tu acceso a Calendar está listo.`],
    PASSWORD_RESET: ["Nueva contraseña temporal", `Hola ${payload.user.name}, se restableció tu acceso local.`],
    USER_ROLE_ASSIGNED: ["Acceso actualizado", `Se asignó un nuevo acceso a ${payload.user.name}.`],
    USER_ROLE_REVOKED: ["Acceso actualizado", `Se retiró un acceso de ${payload.user.name}.`],
    USER_ACCESS_STATUS_CHANGED: ["Estado de cuenta actualizado", `Cambió el estado de la cuenta de ${payload.user.name}.`],
  } as const;
  const [title, intro] = variants[payload.kind];
  const canAccess = payload.accessStatus !== "SUSPENDED";
  const base = buildBaseEmail({
    title,
    intro,
    details: [
      { label: "Correo", value: payload.user.email },
      { label: "Contraseña temporal", value: payload.temporaryPassword },
      { label: "Método de acceso", value: payload.authMethod === "ZOHO" ? "Continuar con Zoho" : payload.authMethod === "LOCAL" ? "Cuenta local" : null },
      { label: "Rol", value: payload.roleName },
      { label: "Alcance", value: payload.scopeLabel },
      { label: "Estado", value: payload.accessStatus },
      { label: "Actualizado por", value: payload.actorName },
    ],
    actionLabel: canAccess ? "Acceder a Calendar" : undefined,
    actionUrl: canAccess ? loginUrl : undefined,
    note: payload.temporaryPassword
      ? "Por seguridad, cambia esta contraseña al iniciar sesión por primera vez."
      : undefined,
  });
  return { subject: title, ...base };
}
