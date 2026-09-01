# Resend Notifications and Responsive Forms Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Incorporar notificaciones de correo confiables con Resend para los eventos operativos de Calendar y corregir todos los formularios para que sean legibles, ordenados y utilizables desde 320 px.

**Architecture:** Las mutaciones crearán un único envío persistente por evento dentro de la misma transacción de Prisma; el destinatario operativo irá en `to` y los supervisores autorizados irán deduplicados en `cc`. Un dispatcher intentará enviarlo después del commit y un job protegido reintentará las entregas fallidas. Las credenciales temporales se enviarán una sola vez inmediatamente después de crear o restablecer la cuenta, sin CC, y nunca se persistirán en texto plano. La capa visual reutilizará los componentes ShadCN existentes, con navegación de secciones específica para móvil y reglas compartidas de contención y acciones.

**Tech Stack:** Next.js 16 App Router, React 19, TypeScript, Server Actions, Prisma 7 + PostgreSQL, Resend, Zod, ShadCN/Base UI, Tailwind CSS 4, Vitest + React Testing Library, Playwright y agent-browser.

## Global Constraints

- Trabajar directamente en `master`; no crear worktrees ni ramas auxiliares.
- Preservar los cambios locales existentes en `src/features/activities/activity-form-panel.tsx` y `src/features/team/team-workspace.tsx`; no restaurarlos ni sobrescribirlos.
- No modificar migraciones ya aplicadas; crear una migración nueva para el outbox de correo.
- Las operaciones de negocio deben completarse aunque Resend falle.
- No persistir contraseñas temporales, API keys ni secretos de cron en texto plano.
- Mantener autorización en servidor, alcance por recurso, precedencia DENY, prevención de solapamientos y AuditLog.
- Resolver supervisores por permisos efectivos y alcance, nunca únicamente por el nombre del rol: `activity:read` junto con `activity:assign` o `team:manage` para actividad, y `team:manage` para acceso.
- No crear un endpoint genérico para enviar correos; solo servicios internos y un endpoint de job protegido.
- Todos los correos deben incluir versiones HTML y texto plano, escapar contenido de usuarios y usar URLs absolutas.
- La aplicación debe ser utilizable sin overflow horizontal desde 320 px y mantener objetivos táctiles mínimos de 44 px.
- Aplicar TDD: cada comportamiento comienza con una prueba fallida, seguida de la implementación mínima y la verificación.

---

## Política funcional aprobable

| Evento | Destinatarios | Comportamiento |
| --- | --- | --- |
| Actividad creada | `to`: técnico asignado o creador; `cc`: creador restante y supervisores con alcance | Un solo correo con título, fecha, estado, prioridad, territorio y enlace al detalle. |
| Actividad editada | `to`: técnico asignado o creador; `cc`: creador restante y supervisores con alcance | Un solo correo con resumen de los campos relevantes modificados. |
| Actividad reasignada | `to`: técnico nuevo; `cc`: técnico anterior, creador y supervisores con alcance | Indica claramente la asignación anterior y la nueva. |
| Estado cambiado | `to`: técnico asignado o creador; `cc`: creador restante y supervisores con alcance | Estado anterior, estado nuevo y siguiente acción. |
| Actividad cancelada | `to`: técnico asignado o creador; `cc`: creador restante y supervisores con alcance | Mensaje explícito de cancelación y enlace al historial. |
| Comentario agregado | `to`: técnico asignado o creador; `cc`: creador restante y supervisores con alcance | Autor y extracto seguro del comentario. |
| Recordatorio | `to`: técnico asignado; `cc`: supervisores con alcance | Dos recordatorios por correo: 24 horas y 1 hora antes, solo si todavía están en el futuro. |
| Usuario local creado | nuevo usuario | Bienvenida con correo, contraseña temporal y enlace de acceso; obliga cambio de contraseña. |
| Usuario Zoho creado | nuevo usuario | Bienvenida con enlace y explicación para acceder con Zoho, sin contraseña local. |
| Contraseña temporal restablecida | usuario afectado | Nueva contraseña temporal y enlace; no se conserva el valor en el outbox. |
| Rol o alcance asignado/revocado | `to`: usuario afectado; `cc`: administradores con `team:manage` aplicable | Un solo correo con explicación cotidiana del acceso concedido o retirado. |
| Cuenta activada, pendiente o suspendida | `to`: usuario afectado; `cc`: administradores con `team:manage` aplicable | Un solo correo con estado nuevo y acción disponible; una suspensión no incluye CTA de acceso. |

Reglas transversales:

- Los supervisores se resuelven con permisos efectivos y alcance del recurso; una denegación efectiva impide que sean copiados aunque su rol normalmente permita supervisión.
- Cada evento genera una sola llamada a Resend. Los destinatarios se deduplican por correo normalizado y ninguna dirección puede aparecer a la vez en `to` y `cc`.
- El actor se conserva si coincide con el destinatario operativo o supervisor; Resend envía una sola copia porque la dirección queda deduplicada.
- Los correos que contienen una contraseña temporal se envían únicamente al usuario afectado, sin CC, para no compartir credenciales con administradores.
- Una serie recurrente creada en una sola operación genera un único correo resumen por destinatario, no un correo por ocurrencia.
- Los recordatorios pendientes se recalculan al cambiar horario o asignación y se cancelan al completar o cancelar la actividad.
- Reintentos: inmediato tras el commit y luego por job con espera exponencial de 1, 5, 15, 60 y 360 minutos; máximo seis intentos.
- Después de seis fallos, la entrega queda `FAILED`; el error se registra sanitizado y nunca incluye contenido sensible.

## Estructura de archivos prevista

**Crear**

- `src/lib/email/resend.ts`: cliente Resend lazy y contrato tipado de envío.
- `src/lib/email/config.ts`: remitente, URL pública y validación server-only.
- `src/lib/email/escape-html.ts`: escape de datos y sanitización de cabeceras.
- `src/lib/email/templates/base-email.ts`: layout responsive compartido HTML/texto.
- `src/lib/email/templates/activity-email.ts`: plantillas de actividades y recordatorios.
- `src/lib/email/templates/account-email.ts`: bienvenida, contraseña y acceso.
- `src/lib/notifications/types.ts`: tipos de eventos, payloads y resultados.
- `src/lib/notifications/recipients.ts`: deduplicación y política de `to`/`cc`, incluidos supervisores por permisos efectivos y scope.
- `src/lib/notifications/activity-notifications.ts`: creación transaccional de outbox y recordatorios.
- `src/lib/notifications/account-notifications.ts`: envío de credenciales y cola de acceso no sensible.
- `src/lib/notifications/dispatcher.ts`: claim, envío, reintentos y estados finales.
- `src/app/api/jobs/notifications/route.ts`: ejecución protegida del outbox y recordatorios vencidos.
- Pruebas unitarias adyacentes para cada servicio anterior.
- `src/features/team/member-detail-navigation.tsx`: selector móvil y tabs de escritorio sincronizados.
- `src/features/team/member-detail-navigation.test.tsx`.
- `src/components/product/responsive-form.test.tsx`.
- `prisma/migrations/<timestamp>_add_email_notification_outbox/migration.sql`.

**Modificar**

- `package.json` y `pnpm-lock.yaml`: dependencia `resend`.
- `prisma/schema.prisma`: modelo `EmailNotification` de un envío por evento y unicidad de recordatorios; `Notification` permanece como bandeja in-app independiente.
- `.env.example`, `src/lib/env.ts` y `docs/deployment/dokploy.md`: configuración Resend/job.
- `src/app/actions/activities.ts` y `src/app/actions/activities.test.ts`: eventos de actividad y reconciliación de recordatorios.
- `src/app/actions/authorization.ts`, `src/app/actions/authorization.test.ts` y `src/app/actions/managed-users.test.ts`: bienvenida, credenciales y cambios de acceso.
- `src/components/product/forms.tsx`: contención móvil compartida.
- `src/components/ui/tabs.tsx`: wrapping seguro sin alterar semántica Base UI.
- `src/features/team/team-workspace.tsx` y su prueba: navegación móvil del detalle mostrada en la captura.
- `src/features/team/managed-user-sheet.tsx` y su prueba: estado de entrega de bienvenida y layout.
- Formularios de actividades, calendario, administración y autenticación, junto con sus pruebas actuales, solo donde la auditoría de 320 px encuentre una violación concreta.
- `.ai/PROJECT_CONTEXT.md`, `.ai/BUSINESS_RULES.md`, `.ai/ARCHITECTURE.md`, `.ai/MODULES.md`, `.ai/DATABASE.md`, `.ai/API_GUIDE.md`, `.ai/UI_GUIDE.md`, `.ai/DEVELOPMENT_GUIDE.md` y `.ai/CHANGELOG_CONTEXT.md`.

---

### Task 1: Contrato de datos y migración del outbox

**Files:**
- Modify: `prisma/schema.prisma`
- Create: `prisma/migrations/<timestamp>_add_email_notification_outbox/migration.sql`
- Modify: `src/lib/authorization/schema-contract.test.ts`

**Interfaces:**
- Produces: `NotificationKind`, `EmailDeliveryStatus` y un `EmailNotification` idempotente por `dedupeKey`, con `toRecipients String[]` y `ccRecipients String[]`.
- Produces: índice consultable por `emailStatus`, `emailNextAttemptAt` y `emailLockedAt`.

- [ ] **Step 1: Escribir la prueba de contrato fallida** que compruebe los enums, campos e índices nuevos y la restricción única de recordatorios.
- [ ] **Step 2: Ejecutar** `pnpm vitest run src/lib/authorization/schema-contract.test.ts` y confirmar que falla porque el contrato aún no existe.
- [ ] **Step 3: Añadir al schema** los enums `NotificationKind` y `EmailDeliveryStatus`, y el modelo `EmailNotification` con `kind`, `entityType`, `entityId`, `payload Json`, `dedupeKey @unique`, `toRecipients String[]`, `ccRecipients String[]`, `status`, `attemptCount`, `nextAttemptAt`, `lockedAt`, `sentAt`, `providerId`, `lastError` y timestamps.
- [ ] **Step 4: Añadir** `@@unique([activityId, channel, scheduledAt])` a `ActivityReminder` para hacer idempotente la reconciliación.
- [ ] **Step 5: Generar una migración nueva** que conserve todas las notificaciones existentes mediante defaults seguros (`GENERIC`, `SKIPPED`) antes de hacer obligatorio `dedupeKey`.
- [ ] **Step 6: Ejecutar** `pnpm prisma validate`, `pnpm prisma generate` y la prueba de contrato hasta obtener PASS.
- [ ] **Step 7: Revisar el SQL** para confirmar que no elimina tablas, columnas ni datos existentes.
- [ ] **Step 8: Commit previsto:** `feat(notifications): add durable email outbox schema`.

### Task 2: Cliente Resend, configuración segura y utilidades

**Files:**
- Modify: `package.json`
- Modify: `pnpm-lock.yaml`
- Create: `src/lib/email/config.ts`
- Create: `src/lib/email/resend.ts`
- Create: `src/lib/email/resend.test.ts`
- Create: `src/lib/email/escape-html.ts`
- Create: `src/lib/email/escape-html.test.ts`
- Modify: `src/lib/env.ts`
- Modify: `.env.example`

**Interfaces:**
- Produces: `sendEmail(input: SendEmailInput): Promise<SendEmailResult>`.
- Produces: `getEmailConfig(): { from: string; replyTo?: string; appUrl: string }`.
- Produces: `escapeHtml(value: string): string` y `sanitizeHeader(value: string): string`.

- [ ] **Step 1: Instalar** `resend` con `pnpm add resend`, manteniendo el lockfile coherente.
- [ ] **Step 2: Escribir pruebas fallidas** para cliente lazy, destinatario string/array, respuesta exitosa, error del proveedor, excepción de red y ausencia de `RESEND_API_KEY`.
- [ ] **Step 3: Implementar el wrapper** siguiendo CombiSales: singleton lazy, HTML/texto, `replyTo`, arrays de destinatarios y resultado discriminado; no inicializar el SDK durante build/import.
- [ ] **Step 4: Escribir pruebas fallidas** para escape de `& < > " '` y rechazo de CR/LF en subject, from y reply-to.
- [ ] **Step 5: Implementar las utilidades** y evitar que logs incluyan body, destinatarios completos o credenciales.
- [ ] **Step 6: Validar en `src/lib/env.ts`** `RESEND_API_KEY`, `RESEND_FROM_EMAIL`, `RESEND_FROM_NAME`, `RESEND_REPLY_TO` y `NOTIFICATION_JOB_SECRET`; mantenerlos opcionales durante build pero obligatorios al ejecutar envíos/job.
- [ ] **Step 7: Documentar nombres sin valores** en `.env.example`; usar `NEXTAUTH_URL` como URL pública canónica.
- [ ] **Step 8: Ejecutar** `pnpm vitest run src/lib/email/resend.test.ts src/lib/email/escape-html.test.ts`.
- [ ] **Step 9: Commit previsto:** `feat(email): add secure Resend client`.

### Task 3: Sistema visual de plantillas de correo

**Files:**
- Create: `src/lib/email/templates/base-email.ts`
- Create: `src/lib/email/templates/activity-email.ts`
- Create: `src/lib/email/templates/account-email.ts`
- Create: `src/lib/email/templates/email-templates.test.ts`

**Interfaces:**
- Produces: `EmailContent = { subject: string; html: string; text: string }`.
- Produces: `buildActivityEmail(event: ActivityNotificationPayload): EmailContent`.
- Produces: `buildAccountEmail(event: AccountNotificationPayload): EmailContent`.

- [ ] **Step 1: Escribir snapshots semánticos fallidos** para bienvenida local, bienvenida Zoho, contraseña restablecida, actividad creada/editada/reasignada/cambiada/cancelada/comentada y recordatorio.
- [ ] **Step 2: Verificar que los tests exigen** `lang="es"`, viewport, tabla de presentación, ancho máximo 640 px, CTA mínimo de 44 px, enlace visible en texto plano y contenido escapado.
- [ ] **Step 3: Implementar un layout común** inspirado en CombiSales: logo Combilift configurable, verde de marca limitado a header/CTA, superficies neutrales, una sola acción principal y footer de mensaje automático.
- [ ] **Step 4: Implementar plantillas de actividad** con la misma jerarquía: razón del correo, datos esenciales, cambio ocurrido y CTA `Ver actividad` apuntando a `/dashboard?activity=<id>`.
- [ ] **Step 5: Implementar plantillas de cuenta**; la variante local acepta la contraseña solo como argumento efímero y advierte del cambio obligatorio, mientras la variante Zoho nunca renderiza una contraseña.
- [ ] **Step 6: Ejecutar** `pnpm vitest run src/lib/email/templates/email-templates.test.ts` y revisar manualmente que ningún snapshot contenga valores no escapados.
- [ ] **Step 7: Commit previsto:** `feat(email): add responsive Calendar templates`.

### Task 4: Política de destinatarios e idempotencia

**Files:**
- Create: `src/lib/notifications/types.ts`
- Create: `src/lib/notifications/recipients.ts`
- Create: `src/lib/notifications/recipients.test.ts`

**Interfaces:**
- Produces: `ActivityNotificationPayload`, `AccountNotificationPayload` y `NotificationRecipient`.
- Produces: `resolveActivityRecipients({ directRecipients, supervisors }): { to: string[]; cc: string[] }`.
- Produces: `resolveActivitySupervisors(transaction, resource): Promise<NotificationRecipient[]>`, filtrando `activity:read` y (`activity:assign` o `team:manage`) con alcance efectivo.
- Produces: `notificationDedupeKey(eventId: string, kind: NotificationKind): string`.

- [ ] **Step 1: Escribir pruebas fallidas** para la matriz de `to`/`cc`, incluyendo actor=creador, actor=asignado, reasignación, administradores globales, líderes/coordinadores dentro y fuera del scope, DENY y usuarios sin email.
- [ ] **Step 2: Añadir casos** que prueben deduplicación por correo normalizado, precedencia de `to` sobre `cc` y keys estables por evento/tipo.
- [ ] **Step 3: Implementar funciones puras de composición** y un resolver server-only que evalúe permisos efectivos por país/equipo; no autorizar ni seleccionar únicamente por `role.key`.
- [ ] **Step 4: Ejecutar** `pnpm vitest run src/lib/notifications/recipients.test.ts`.
- [ ] **Step 5: Commit previsto:** `feat(notifications): define recipient policy`.

### Task 5: Dispatcher persistente y reintentos

**Files:**
- Create: `src/lib/notifications/dispatcher.ts`
- Create: `src/lib/notifications/dispatcher.test.ts`

**Interfaces:**
- Consumes: `sendEmail`, builders de plantillas y filas `EmailNotification` con un conjunto `to`/`cc` por evento.
- Produces: `dispatchNotificationIds(ids: string[]): Promise<DispatchSummary>`.
- Produces: `dispatchPendingNotifications(options?: { limit?: number; now?: Date }): Promise<DispatchSummary>`.

- [ ] **Step 1: Escribir pruebas fallidas** para claim atómico de `PENDING`/`FAILED`, recuperación de lease vencido, un único envío con `to`/`cc`, fallo reintentable, máximo de seis intentos y destinatario principal ausente.
- [ ] **Step 2: Añadir una prueba de concurrencia** donde dos dispatchers intentan reclamar la misma fila y solo uno llama a Resend.
- [ ] **Step 3: Implementar el claim** mediante `updateMany` condicionado por estado/lease antes de cargar la fila; marcar `PROCESSING` con `emailLockedAt`.
- [ ] **Step 4: Implementar backoff** `[1, 5, 15, 60, 360]` minutos y estado final `FAILED` en el sexto error.
- [ ] **Step 5: En éxito**, guardar `SENT`, `emailSentAt`, `emailProviderId`, limpiar lock/error y nunca duplicar una fila `SENT`.
- [ ] **Step 6: En error**, guardar solo un mensaje sanitizado de longitud acotada y devolver resumen sin lanzar sobre la operación de negocio.
- [ ] **Step 7: Ejecutar** `pnpm vitest run src/lib/notifications/dispatcher.test.ts`.
- [ ] **Step 8: Commit previsto:** `feat(notifications): add reliable email dispatcher`.

### Task 6: Eventos, emails y recordatorios de actividades

**Files:**
- Create: `src/lib/notifications/activity-notifications.ts`
- Create: `src/lib/notifications/activity-notifications.test.ts`
- Modify: `src/app/actions/activities.ts`
- Modify: `src/app/actions/activities.test.ts`

**Interfaces:**
- Produces: `queueActivityNotification(transaction, event): Promise<string[]>`.
- Produces: `reconcileActivityEmailReminders(transaction, activityId, startsAt, statusCode): Promise<void>`.
- Consumes: dispatcher post-commit; nunca espera el resultado para decidir el éxito de la acción.

- [ ] **Step 1: Escribir pruebas fallidas del servicio** para crear una fila de outbox por evento con payload mínimo, `to`/`cc` correctos, supervisores dentro del scope, una sola notificación por serie y keys basadas en el `AuditLog.id`.
- [ ] **Step 2: Escribir pruebas fallidas de recordatorios** para 24 h/1 h, fechas ya pasadas, cambio de horario, reasignación, cancelación y finalización.
- [ ] **Step 3: Implementar cola y reconciliación** dentro de la transacción que modifica Activity/AuditLog, usando `upsert` para evitar duplicados.
- [ ] **Step 4: Extender los tests de Server Actions** para `createActivity`, `updateActivity`, `changeActivityStatus`, `cancelActivity` y `addActivityComment`; comprobar que un error simulado de Resend no cambia el resultado exitoso.
- [ ] **Step 5: Integrar eventos** después de crear cada AuditLog; en update comparar valores anteriores/nuevos para escoger `ACTIVITY_UPDATED`, `ACTIVITY_REASSIGNED` o ambos sin duplicar destinatarios.
- [ ] **Step 6: Lanzar un envío best-effort post-commit** con los IDs creados mediante una función que capture y registre el error sin propagarlo.
- [ ] **Step 7: Ejecutar** `pnpm vitest run src/lib/notifications/activity-notifications.test.ts src/app/actions/activities.test.ts`.
- [ ] **Step 8: Commit previsto:** `feat(activities): notify operational events`.

### Task 7: Bienvenida, credenciales y cambios de acceso

**Files:**
- Create: `src/lib/notifications/account-notifications.ts`
- Create: `src/lib/notifications/account-notifications.test.ts`
- Modify: `src/app/actions/authorization.ts`
- Modify: `src/app/actions/authorization.test.ts`
- Modify: `src/app/actions/managed-users.test.ts`
- Modify: `src/features/team/managed-user-sheet.tsx`
- Modify: `src/features/team/managed-user-sheet.test.tsx`

**Interfaces:**
- Produces: `sendEphemeralCredentialEmail(input): Promise<"SENT" | "FAILED">` que jamás persiste `temporaryPassword`.
- Produces: `queueAccountNotification(transaction, event): Promise<string[]>` para eventos sin secretos.
- Extiende éxito de `AuthorizationActionResult` con `emailStatus?: "SENT" | "QUEUED" | "FAILED"` sin retirar `temporaryPassword`.

- [ ] **Step 1: Escribir pruebas fallidas** para creación local exitosa/fallida, creación Zoho, reset de contraseña, asignación/revocación de rol y cambio de estado.
- [ ] **Step 2: Verificar en tests** que Prisma/AuditLog nunca reciben la contraseña temporal ni el HTML del correo.
- [ ] **Step 3: Implementar bienvenida local post-commit** con la contraseña en memoria; si falla, devolver `emailStatus: "FAILED"` manteniendo usuario y contraseña visible para entrega manual.
- [ ] **Step 4: Implementar reset post-commit** con la misma regla; la acción continúa devolviendo la nueva contraseña una sola vez.
- [ ] **Step 5: Encolar de forma durable** bienvenida Zoho y cambios de rol/alcance/estado, porque sus payloads no contienen secretos.
- [ ] **Step 6: Añadir feedback UI**: `Correo enviado`, `Correo en cola` o `No se pudo enviar; copia la contraseña y entrégala por un canal seguro`; no mostrar un éxito ambiguo.
- [ ] **Step 7: Ejecutar** `pnpm vitest run src/lib/notifications/account-notifications.test.ts src/app/actions/authorization.test.ts src/app/actions/managed-users.test.ts src/features/team/managed-user-sheet.test.tsx`.
- [ ] **Step 8: Commit previsto:** `feat(team): email account and access notifications`.

### Task 8: Job protegido de envío y recordatorios

**Files:**
- Create: `src/app/api/jobs/notifications/route.ts`
- Create: `src/app/api/jobs/notifications/route.test.ts`
- Modify: `docs/deployment/dokploy.md`

**Interfaces:**
- Produces: `POST /api/jobs/notifications` protegido por `Authorization: Bearer <NOTIFICATION_JOB_SECRET>`.
- Consumes: recordatorios vencidos y `dispatchPendingNotifications({ limit: 50 })`.

- [ ] **Step 1: Escribir pruebas fallidas** para secreto ausente, token incorrecto, token correcto, máximo de lote y error interno sanitizado.
- [ ] **Step 2: Implementar comparación segura** del bearer token y responder 401 sin revelar qué parte falló.
- [ ] **Step 3: Reclamar recordatorios vencidos** de actividades activas, crear su outbox idempotente y marcar `sentAt` solo cuando el evento haya quedado encolado.
- [ ] **Step 4: Despachar hasta 50 notificaciones** y devolver únicamente conteos `claimed`, `sent`, `failed`, `skipped`.
- [ ] **Step 5: Documentar en Dokploy** un job cada minuto con POST, header bearer y secreto suministrado por variable; no incluir secretos reales ni comandos que los impriman.
- [ ] **Step 6: Ejecutar** `pnpm vitest run src/app/api/jobs/notifications/route.test.ts`.
- [ ] **Step 7: Commit previsto:** `feat(notifications): process email queue from protected job`.

### Task 9: Navegación responsive del detalle de usuario

**Files:**
- Create: `src/features/team/member-detail-navigation.tsx`
- Create: `src/features/team/member-detail-navigation.test.tsx`
- Modify: `src/features/team/team-workspace.tsx`
- Modify: `src/features/team/team-workspace.test.tsx`

**Interfaces:**
- Produces: `MemberDetailNavigation({ value, onValueChange, showAdvanced })`.
- En móvil muestra un `Select` de ancho completo; desde `sm` muestra TabsList con dos o tres tabs.

- [ ] **Step 1: Escribir una prueba fallida** que exija un selector móvil con `Resumen`, `Acceso` y `Configuración avanzada`, y tabs equivalentes en escritorio.
- [ ] **Step 2: Añadir pruebas** de sincronización: cambiar el selector activa el TabsContent correcto y cambiar un tab actualiza el valor controlado.
- [ ] **Step 3: Implementar el componente** con labels completos, objetivos de 44 px, `min-w-0`, texto truncado solo en el trigger cerrado y nombre completo accesible.
- [ ] **Step 4: Convertir `MemberDetail` a Tabs controladas** e integrar el selector móvil; conservar el cambio local actual de copy y resolver el desborde sin depender de abreviar el significado.
- [ ] **Step 5: Ajustar header, metadata y botón Editar** para apilarse a 320 px y alinearse horizontalmente desde `sm`.
- [ ] **Step 6: Ejecutar** `pnpm vitest run src/features/team/member-detail-navigation.test.tsx src/features/team/team-workspace.test.tsx`.
- [ ] **Step 7: Commit previsto:** `fix(team): prevent mobile detail navigation overflow`.

### Task 10: Reglas compartidas para formularios mobile-first

**Files:**
- Modify: `src/components/product/forms.tsx`
- Modify: `src/components/ui/tabs.tsx`
- Create: `src/components/product/responsive-form.test.tsx`
- Modify: pruebas existentes de formularios afectadas.

**Interfaces:**
- `ResponsiveSheet` garantiza una columna contenida con scroll vertical interno y sin overflow de página.
- `FormActions` produce botones de ancho completo en móvil y ancho automático desde `sm`.
- `FormSection` permite que labels, descripciones, inputs y selects reduzcan ancho con `min-w-0`.

- [ ] **Step 1: Escribir pruebas estructurales fallidas** para clases de contención, body con `min-w-0 overflow-x-hidden`, footer seguro y botones táctiles.
- [ ] **Step 2: Añadir pruebas de tabs** para wrapping accesible y ausencia de anchos mínimos rígidos en triggers.
- [ ] **Step 3: Implementar las reglas compartidas** sin cambiar el contrato público ni la semántica de Drawer/Sheet/Tabs.
- [ ] **Step 4: Auditar y corregir** `activity-form-panel.tsx`, `activity-detail-panel.tsx`, `managed-user-sheet.tsx`, `administration-page.tsx`, `login-form.tsx` y `change-password-form.tsx`: grids de una columna en móvil, `min-w-0`, labels con wrap, inputs al 100%, mensajes sin posicionamiento absoluto y CTA persistente no solapado.
- [ ] **Step 5: Auditar los controles de calendario** y trasladar filtros/acciones secundarios a su superficie responsive existente cuando no quepan a 320 px.
- [ ] **Step 6: Ejecutar todas las pruebas RTL** de actividades, equipo, administración, calendario y autenticación.
- [ ] **Step 7: Commit previsto:** `fix(ui): make forms resilient on narrow screens`.

### Task 11: Documentación de arquitectura y operación

**Files:**
- Modify: `.ai/PROJECT_CONTEXT.md`
- Modify: `.ai/BUSINESS_RULES.md`
- Modify: `.ai/ARCHITECTURE.md`
- Modify: `.ai/MODULES.md`
- Modify: `.ai/DATABASE.md`
- Modify: `.ai/API_GUIDE.md`
- Modify: `.ai/UI_GUIDE.md`
- Modify: `.ai/DEVELOPMENT_GUIDE.md`
- Modify: `.ai/CHANGELOG_CONTEXT.md`

**Interfaces:**
- Documenta la matriz de eventos, contratos, env vars, job, reintentos y diagnóstico sin secretos.

- [ ] **Step 1: Actualizar reglas de negocio** con destinatarios, exclusión del actor, recordatorios y comportamiento no bloqueante.
- [ ] **Step 2: Actualizar arquitectura/módulos/base de datos/API** con outbox, dispatcher, endpoint protegido y estados de entrega.
- [ ] **Step 3: Actualizar UI Guide** con selector móvil para secciones largas y checklist de formularios a 320 px.
- [ ] **Step 4: Actualizar deployment/development** con configuración, ejecución del job y consulta segura de entregas fallidas.
- [ ] **Step 5: Registrar el cambio** en CHANGELOG_CONTEXT sin afirmar despliegue ni configuración externa completada.
- [ ] **Step 6: Ejecutar** `git diff --check` y buscar accidentalmente secretos con `rg -n "re_[A-Za-z0-9]{20,}|NOTIFICATION_JOB_SECRET=" . --glob '!pnpm-lock.yaml' --glob '!.env'`.
- [ ] **Step 7: Commit previsto:** `docs: document email notification operations`.

### Task 12: Verificación integral y aceptación visual

**Files:**
- No crear archivos de producción salvo correcciones derivadas de fallos comprobados.
- Modify: pruebas específicas únicamente si revelan una expectativa incorrecta documentada.

**Interfaces:**
- Produce evidencia reproducible de funcionalidad, accesibilidad y responsive.

- [ ] **Step 1: Ejecutar pruebas focalizadas** de email, notificaciones, Server Actions, equipo y formularios.
- [ ] **Step 2: Ejecutar** `pnpm test`, `pnpm lint`, `pnpm build` y `git diff --check`; cualquier fallo se depura con `superpowers:systematic-debugging` antes de tocar código.
- [ ] **Step 3: Levantar la aplicación** con una base de prueba y configuración Resend de sandbox; no usar usuarios ni destinatarios de producción.
- [ ] **Step 4: Verificar con agent-browser** creación/edición/estado/cancelación/comentario de actividad, creación local/Zoho, reset y cambios de acceso; comprobar un solo correo por destinatario/evento.
- [ ] **Step 5: Simular fallo temporal de Resend** y comprobar que la mutación termina, la fila queda reintentable y el job la envía una sola vez al recuperarse.
- [ ] **Step 6: Verificar por teclado, foco y contraste** todos los formularios en claro/oscuro y con reduced motion.
- [ ] **Step 7: Capturar evidencia visual** a 320×568, 390×844, 768×1024, 1024×768, 1440×900 y 1920×1080; confirmar que no hay overflow horizontal de página ni tabs superpuestos.
- [ ] **Step 8: Revisar el diff completo** para preservar los cambios locales previos, limitar el alcance y confirmar que ningún log, fixture, snapshot o documento contiene credenciales.
- [ ] **Step 9: Commit previsto:** `test: verify notifications and responsive forms` solo si esta etapa añade pruebas o correcciones reales.

## Criterios de aceptación

- Crear una actividad genera exactamente un correo con destinatario operativo en `to` y supervisores autorizados en `cc`; una serie recurrente no produce una ráfaga de correos.
- Editar, reasignar, cambiar estado, cancelar o comentar genera el template correcto y respeta exclusión/deduplicación.
- Una caída de Resend no revierte ninguna actividad, usuario, rol, estado ni AuditLog.
- Una entrega reintentada nunca se envía dos veces, incluso con dos workers concurrentes.
- Los recordatorios se envían 24 horas y 1 hora antes, se recalculan al editar y no se envían para actividades completadas/canceladas.
- El usuario local recibe credenciales; la contraseña temporal solo existe en memoria, en la respuesta de una sola vez y en el mensaje enviado.
- El usuario Zoho recibe bienvenida sin contraseña local.
- Los cambios sensibles de acceso conservan sus verificaciones actuales de autorización y auditoría.
- La navegación de detalle mostrada en la captura no se solapa ni desborda a 320 px y conserva el label completo accesible.
- Todos los formularios pueden completarse con teclado y touch sin zoom, corte, solapamiento ni overflow horizontal.
- `pnpm test`, `pnpm lint`, `pnpm build` y `git diff --check` finalizan correctamente.

## Fuera de alcance

- Centro visual de notificaciones o restauración de la campana eliminada.
- Preferencias configurables por usuario, resúmenes diarios o notificaciones SMS/push.
- Webhooks de Resend para métricas de apertura/clic; el proveedor ID queda preparado para incorporarlos después.
- Cambio del proveedor de autenticación, reglas de permisos o modelo territorial.
- Envío a listas globales o direcciones administrativas hardcodeadas; la supervisión se deriva de permisos efectivos y scope.

## Supuestos que requieren aprobación junto con el plan

- Cada evento usa un único correo; el técnico/usuario afectado ocupa `to` y administradores, líderes o coordinadores capaces de consultar/supervisar ese recurso ocupan `cc`.
- Los recordatorios estándar serán 24 horas y 1 hora antes.
- Los fallos de correo no bloquean las operaciones y se reintentan, excepto mensajes con contraseña temporal porque el secreto no se persiste.
- El job se ejecutará cada minuto desde Dokploy con `NOTIFICATION_JOB_SECRET`.
- Se usará el logo y la dirección visual de CombiSales como referencia, pero remitente, dominio y nombre serán propios de Calendar y configurables por entorno.
