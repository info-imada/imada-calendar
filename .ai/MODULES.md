# Módulos

## Mapa rápido

| Módulo | Ruta principal | Feature | Datos/acciones |
|---|---|---|---|
| Autenticación | `/login` | `src/features/authentication/` | `src/lib/auth.ts`, `src/app/actions/authentication.ts` |
| Agenda | `/dashboard` | `src/features/agenda/` | read model de actividades y acciones de actividad |
| Actividades | `/activities` | `src/features/activities/` | `src/lib/activities/`, `src/app/actions/activities.ts` |
| Calendario | `/calendar` | `src/features/calendar/` | modelo compartido de actividades |
| Equipo | `/team` | `src/features/team/` | acciones de autorización y usuarios |
| Administración | `/settings` | `src/features/administration/` | territorios, clientes, roles y permisos |

## Autenticación

### Propósito

Establecer sesión por Zoho o credenciales locales y dirigir al usuario según acceso y obligación de cambio de contraseña.

### Archivos relacionados

- `src/app/(auth)/login/page.tsx`
- `src/app/(auth)/access-pending/page.tsx`
- `src/app/(auth)/change-password/page.tsx`
- `src/features/authentication/`
- `src/lib/auth.ts`
- `src/lib/auth-adapter.ts`
- `src/lib/access-policy.ts`
- `src/lib/login-attempts.ts`
- `src/proxy.ts`
- `src/types/next-auth.d.ts`

### Funcionalidades

- Zoho OAuth opcional según entorno.
- Login local mediante POST nativo de NextAuth y CSRF.
- Mostrar/ocultar contraseña y feedback de error.
- Sesión limitada PENDING.
- Redirección a cambio obligatorio de contraseña.
- Revalidación del estado persistido al actualizar JWT.

### Consideraciones

- No enlaces automáticamente una cuenta local con Zoho.
- Mantén las guardas bidireccionales de páginas de estado.
- `getCurrentUser()` exige ACTIVE y una asignación; no lo sustituyas por confiar solo en el token.

## Shell y navegación

### Propósito

Proporcionar navegación persistente, header, tema y contenedor responsive a rutas protegidas.

### Archivos relacionados

- `src/app/(app)/layout.tsx`
- `src/components/layout/app-shell.tsx`
- `src/components/app-sidebar.tsx`
- `src/components/site-header.tsx`
- `src/components/providers/theme-provider.tsx`
- `src/components/providers/theme-toggle.tsx`

### Consideraciones

- Usa `next/link` para navegación cliente; evita recargas completas con `<a>` interno.
- La ruta activa deriva de `usePathname`.
- Sidebar responsive y preferencia de tema deben seguir los componentes compartidos.

## Agenda

### Propósito

Dar una vista operativa compacta de actividades y coordinación diaria.

### Archivos relacionados

- `src/app/(app)/dashboard/page.tsx`
- `src/features/agenda/agenda-page.tsx`
- `src/features/agenda/agenda-view.tsx`
- `src/features/agenda/agenda-state.ts`
- `src/lib/activities/read-model.ts`

### Funcionalidades

- KPIs de hoy, sin asignar y disponibilidad.
- Filtros por búsqueda, país, técnico, estado y fecha.
- Vista lista o Kanban con preferencia local.
- Drag and drop de estado mediante acciones validadas.
- Reutilización de formularios y detalle de Actividades.

### Dependencias internas

Comparte `ActivityWorkspaceModel`, Server Actions, `ActivityFormPanel`, `ActivityDetailPanel`, toolbars y badges.

### Consideraciones

- Agenda no mantiene una fuente de datos independiente: debe usar el mismo read model de Actividades y Calendario.
- Los botones se condicionan por `model.canCreate` y capacidades por actividad.

## Actividades

### Propósito

Crear, consultar, editar, reasignar, cambiar estado, cancelar y comentar trabajo técnico con trazabilidad.

### Archivos relacionados

- `src/app/(app)/activities/page.tsx`
- `src/app/(app)/activities/[activityId]/route.ts`
- `src/features/activities/activity-workspace.tsx`
- `src/features/activities/activity-form-panel.tsx`
- `src/features/activities/activity-detail-panel.tsx`
- `src/features/activities/activity-types.ts`
- `src/lib/activities/read-model.ts`
- `src/lib/activities/schedule.ts`
- `src/lib/validations/activity.ts`
- `src/app/actions/activities.ts`

### Funcionalidades

- Tabla desktop y tarjetas mobile.
- Búsqueda rápida con Command.
- Filtros por país, técnico, estado, prioridad y rango de fechas.
- Sheet desktop/Drawer mobile para crear y editar.
- Recurrencia diaria, semanal o mensual.
- Detalle con resumen, comentarios y auditoría.
- Confirmación al cancelar o descartar cambios.
- Acceso directo por ID con rechazo 403 explícito fuera de scope.

### Consideraciones

- Validar referencias activas y permisos sobre origen/destino.
- Mantener detección transaccional de conflicto.
- No mostrar mutaciones si la capacidad efectiva no existe; el servidor siempre vuelve a autorizar.
- El detalle cerrado puede seguir mostrando comentarios/auditoría según permisos, aunque no acepte cambios operativos.

## Calendario

### Propósito

Visualizar y modificar la planificación sin perder el contexto temporal.

### Archivos relacionados

- `src/app/(app)/calendar/page.tsx`
- `src/features/calendar/calendar-workspace.tsx`
- `src/features/calendar/calendar-model.ts`
- `src/features/activities/activity-form-panel.tsx`
- `src/features/activities/activity-detail-panel.tsx`

### Funcionalidades

- Vista mes.
- Vista semana.
- Vista por técnico usando recursos de React Big Calendar.
- Filtros de país y técnico.
- Selección de slot para crear con fechas precargadas.
- Selección de evento para detalle/edición.

### Consideraciones

- React Big Calendar es la base de la cuadrícula; los controles externos son ShadCN.
- Semana y técnicos pueden usar scroll interno intencional, nunca overflow de página.
- Reutiliza las mismas validaciones y lógica de solapamiento que Actividades.

## Equipo y accesos

### Propósito

Listar personas visibles por scope y administrar cuentas, roles, alcances, permisos efectivos y excepciones.

### Archivos relacionados

- `src/app/(app)/team/page.tsx`
- `src/features/team/team-workspace.tsx`
- `src/features/team/managed-user-sheet.tsx`
- `src/app/actions/authorization.ts`
- `src/lib/authorization/`
- `src/lib/permissions.ts`

### Funcionalidades

- Estado Pendiente/Activo/Suspendido.
- Actividades próximas y próxima ausencia conocida.
- Detalle de roles y alcance.
- Permisos efectivos agrupados por scope.
- Overrides GRANT/DENY para administración global.
- Crear y editar usuarios sin invitación.
- Activar/suspender y resetear contraseña local temporal.
- Asignar/revocar roles con confirmación.

### Dependencias internas

Usa roles, permisos, países, equipos, credenciales, Accounts de NextAuth, Availability y acciones de autorización.

### Consideraciones

- La consulta de usuarios y países se recorta al scope del actor.
- `canManageUsers` deriva de `team:manage`; overrides y estado sensible requieren administración global.
- Nunca permitas auto-modificación administrativa ni asignar prioridad igual/superior.

## Administración

### Propósito

Gestionar catálogo territorial y modelo dinámico de roles/permisos.

### Archivos relacionados

- `src/app/(app)/settings/page.tsx`
- `src/features/administration/administration-page.tsx`
- `src/app/actions/administration.ts`
- `src/app/actions/authorization.ts`
- `src/lib/authorization/global-administrator.ts`
- `src/lib/validations/administration.ts`

### Funcionalidades

- Crear país y equipo.
- Consultar accesos resumidos.
- Crear roles personalizados.
- Matriz rol × permiso agrupada por categoría.
- Confirmar cambios sensibles de permisos.
- Navegar a Equipo para administración detallada de usuarios.

### Consideraciones

- La página exige ADMIN GLOBAL con `catalog:manage`.
- Los roles del sistema están protegidos.
- El actor solo crea/muta roles de menor prioridad.
- No retirar el último permiso crítico de administración global.

## Comentarios y auditoría de actividad

No son rutas independientes. Viven como pestañas de `ActivityDetailPanel`:

- comentarios requieren `activity:comment` para crear;
- auditoría solo se carga con `audit:read` en el recurso;
- ambos datos vienen del read model de actividades.

## Disponibilidad, recordatorios y notificaciones

`src/lib/notifications/` resuelve destinatarios por permisos/scope, crea el outbox, reconcilia recordatorios y despacha Resend. `src/lib/email/` contiene configuración, cliente y templates. `POST /api/jobs/notifications` procesa recordatorios y reintentos con autenticación propia. `Notification` sigue reservado para una futura bandeja in-app; no hay un módulo CRUD de disponibilidad confirmado.

## Superficie técnica residual

`src/app/(app)/e2e-action-probe/page.tsx` y `src/features/e2e/action-probe.tsx` existen, pero la infraestructura `e2e/` fue eliminada y la ruta no está en navegación. No dependas de ella como contrato de producto.

## Pendiente por confirmar

- Si la superficie `e2e-action-probe` debe conservarse o retirarse.
- Diseño final de módulos de notificaciones y disponibilidad.
- Reglas futuras para mutaciones de series recurrentes completas.

## Registro de tarea

El módulo vive en `src/features/work-logs/`, `src/app/(app)/work-logs/`, `src/lib/work-logs/` y `src/app/actions/work-logs.ts`. Incluye registro de jornada, historial, detalle, adjuntos, exportación y catálogo de ubicaciones dentro de Administración. La integración con actividad usa enlaces explícitos y nunca cambia estados automáticamente.
