# Matriz normativa E2E de roles, permisos y scopes

## Estado de la especificación

Esta matriz define el comportamiento esperado antes de crear el seed, configurar Playwright o escribir specs E2E. No describe el comportamiento observado. Cualquier diferencia obtenida durante la ejecución se reportará sin reescribir esta expectativa.

## Actores

| ID | Actor | Estado, scope y permisos |
|---|---|---|
| A1 | ADMIN | ACTIVE, GLOBAL, prioridad 500, todos los permisos. |
| A2 | LIDER-PA | ACTIVE, COUNTRY Panamá, prioridad 400, permisos estándar LIDER. |
| A3 | COORD-PA1 | ACTIVE, TEAM Soporte Panamá, prioridad 300, permisos estándar COORDINADOR. |
| A4 | TEC-PA1 | ACTIVE, TEAM Soporte Panamá, prioridad 200, permisos estándar TECNICO. |
| A5 | AUDITOR | ACTIVE, GLOBAL, prioridad 100, solo lectura. `audit:read` se comprueba únicamente en la pestaña Auditoría del detalle de una actividad visible; no existe una bandeja global de AuditLog. |
| A6 | PLANIFICADOR | ACTIVE, rol personalizado TEAM Soporte Panamá, prioridad 250; `activity:read`, `activity:create`, `activity:comment`, `availability:read`. |
| A7 | LIDER-DENY | ACTIVE, COUNTRY Panamá, LIDER con override DENY de `activity:update` en Panamá. |
| A8 | TEC-GRANT | ACTIVE, TEAM Campo Panamá, TECNICO con override GRANT de `activity:create` en ese equipo. |
| A9 | PENDING | PENDING, sin asignación de rol, credencial local conocida. |
| A10 | SUSPENDED | SUSPENDED; tuvo COORDINADOR TEAM Soporte Panamá y conserva credencial. |
| A11 | MUST-CHANGE | ACTIVE, TECNICO TEAM Soporte Panamá, credencial local con `mustChangePassword=true`. |
| A12 | LIDER-CR | ACTIVE, COUNTRY Costa Rica; Panamá es scope ajeno. |
| A13 | LAST-ADMIN | ACTIVE, ADMIN GLOBAL. En su escenario serial, el resto de asignaciones activas que conceden permisos críticos se suspenden o retiran, por lo que A13 queda como único administrador crítico global. |

## Convenciones

- `PA1`: Soporte Panamá; `PA2`: Campo Panamá; `CR1`: Soporte Costa Rica; `CR2`: Campo Costa Rica.
- `R`: leer; `C`: crear; `U`: actualizar/estado/cancelar/drag; `A`: asignar; `M`: comentar.
- `UM`: gestionar usuarios inferiores dentro del scope; `OV`: overrides; `CAT`: catálogo territorial; `RBAC`: roles/permisos.
- Las rutas operativas deben ocultar navegación no autorizada. La ausencia en listas nunca reemplaza la verificación IDOR directa.
- Las acciones prohibidas deben devolver `FORBIDDEN`/HTTP 403 y no modificar la base.

## Matriz de rutas

| Ruta | Rol | Scope del actor | Scope del recurso | Acceso esperado | Elementos UI esperados | Acciones permitidas |
|---|---|---|---|---|---|---|
| `/` | A1 ADMIN | GLOBAL | raíz | → `/dashboard` | Agenda global, navegación completa | R,C,U,A,M |
| `/` | A2 LIDER-PA | COUNTRY PA | raíz | → `/dashboard` | Agenda PA, Settings oculto | R,C,U,A,M en PA |
| `/` | A3 COORD-PA1 | TEAM PA1 | raíz | → `/dashboard` | Agenda PA1 | R,C,U,A,M en PA1 |
| `/` | A4 TEC-PA1 | TEAM PA1 | raíz | → `/dashboard` | Agenda PA1 sin crear/asignar | R,U,M |
| `/` | A5 AUDITOR | GLOBAL | raíz | → `/dashboard` | Agenda global de solo lectura | R |
| `/` | A6 PLANIFICADOR | TEAM PA1 | raíz | → `/dashboard` | UI por permisos, no por key del rol | R,C,M |
| `/` | A7 LIDER-DENY | COUNTRY PA | raíz | → `/dashboard` | Sin controles U | R,C,A,M |
| `/` | A8 TEC-GRANT | TEAM PA2 | raíz | → `/dashboard` | Crear habilitado por GRANT | R,C,U,M |
| `/` | A9 PENDING | sin scope | protegida | → `/access-pending` | tarjeta pendiente, sin AppShell | ninguna |
| `/` | A10 SUSPENDED | TEAM PA1 inactivo | protegida | sesión rechazada → `/login` | login, sin datos | ninguna |
| `/` | A11 MUST-CHANGE | TEAM PA1 | protegida | → `/change-password` | cambio obligatorio | cambiar contraseña |
| `/` | A12 LIDER-CR | COUNTRY CR | raíz | → `/dashboard` | Agenda CR, PA ausente | R,C,U,A,M en CR |
| `/dashboard` | A1 ADMIN | GLOBAL | PA1,PA2,CR1,CR2 | permitir global | “Agenda del equipo”, navegación completa | R,C,U,A,M |
| `/dashboard` | A2 LIDER-PA | COUNTRY PA | PA propio; CR ajeno | solo PA | actividades PA; CR ausente | R,C,U,A,M en PA |
| `/dashboard` | A3 COORD-PA1 | TEAM PA1 | PA1 propio; PA2 ajeno | solo PA1 | actividades/técnicos PA1 | R,C,U,A,M en PA1 |
| `/dashboard` | A4 TEC-PA1 | TEAM PA1 | PA1 propio | solo PA1/propias | sin Nueva actividad ni reasignación | R,U,M |
| `/dashboard` | A5 AUDITOR | GLOBAL | todos | solo lectura global | sin crear, editar, drag ni comentar | R |
| `/dashboard` | A6 PLANIFICADOR | TEAM PA1 | PA1 | solo PA1 | crear/comentar; sin U/A | R,C sin asignar,M |
| `/dashboard` | A7 LIDER-DENY | COUNTRY PA | PA | permitir con DENY | sin edición, drag, estado o cancelación | R,C,A,M |
| `/dashboard` | A8 TEC-GRANT | TEAM PA2 | PA2 | permitir con GRANT | crear sin selector de asignación | R,C sin asignar,U,M |
| `/dashboard` | A9 PENDING | sin scope | protegida | → `/access-pending` | sin AppShell | ninguna |
| `/dashboard` | A10 SUSPENDED | TEAM PA1 inactivo | protegida | → `/login` | sin datos | ninguna |
| `/dashboard` | A11 MUST-CHANGE | TEAM PA1 | protegida | → `/change-password` | solo cambio | cambiar contraseña |
| `/dashboard` | A12 LIDER-CR | COUNTRY CR | CR propio; PA ajeno | solo CR | títulos PA ausentes | R,C,U,A,M en CR |
| `/activities` | A1 ADMIN | GLOBAL | todos | permitir global | tabla/filtros globales, Nueva actividad | R,C,U,A,M |
| `/activities` | A2 LIDER-PA | COUNTRY PA | PA; CR ajeno | solo PA | CR ausente | R,C,U,A,M en PA |
| `/activities` | A3 COORD-PA1 | TEAM PA1 | PA1; PA2 ajeno | solo PA1 | PA2 y sus técnicos ausentes | R,C,U,A,M en PA1 |
| `/activities` | A4 TEC-PA1 | TEAM PA1 | PA1 | scope propio | sin crear/asignar | R,U,M |
| `/activities` | A5 AUDITOR | GLOBAL | todos | lectura global | detalle y pestaña Auditoría; mutaciones ocultas | R |
| `/activities` | A6 PLANIFICADOR | TEAM PA1 | PA1 | por permisos dinámicos | crear/comentar; U/A ocultos | R,C sin asignar,M |
| `/activities` | A7 LIDER-DENY | COUNTRY PA | PA | lectura con U denegado | crear/asignar/comentar; U oculto | R,C,A,M |
| `/activities` | A8 TEC-GRANT | TEAM PA2 | PA2 | crear por GRANT | crear y U/M; A oculto | R,C sin asignar,U,M |
| `/activities` | A9 PENDING | sin scope | protegida | → `/access-pending` | sin tabla | ninguna |
| `/activities` | A10 SUSPENDED | TEAM PA1 inactivo | protegida | → `/login` | sin tabla | ninguna |
| `/activities` | A11 MUST-CHANGE | TEAM PA1 | protegida | → `/change-password` | sin tabla | cambiar contraseña |
| `/activities` | A12 LIDER-CR | COUNTRY CR | CR; PA ajeno | solo CR | PA ausente | R,C,U,A,M en CR |
| `/calendar` | A1 ADMIN | GLOBAL | todos | permitir global | calendario/filtros globales | R,C,U,A,M |
| `/calendar` | A2 LIDER-PA | COUNTRY PA | PA; CR ajeno | solo PA | eventos CR ausentes | R,C,U,A,M en PA |
| `/calendar` | A3 COORD-PA1 | TEAM PA1 | PA1; PA2 ajeno | solo PA1 | eventos/técnicos PA1 | R,C,U,A,M en PA1 |
| `/calendar` | A4 TEC-PA1 | TEAM PA1 | PA1 | scope propio | sin crear/asignar | R,U,M |
| `/calendar` | A5 AUDITOR | GLOBAL | todos | lectura global | sin crear, editar ni drag | R |
| `/calendar` | A6 PLANIFICADOR | TEAM PA1 | PA1 | por permisos dinámicos | crear; U/A ocultos | R,C sin asignar,M |
| `/calendar` | A7 LIDER-DENY | COUNTRY PA | PA | permitir sin U | sin drag/edición/estado | R,C,A,M |
| `/calendar` | A8 TEC-GRANT | TEAM PA2 | PA2 | crear por GRANT | crear sin reasignar | R,C sin asignar,U,M |
| `/calendar` | A9 PENDING | sin scope | protegida | → `/access-pending` | sin calendario | ninguna |
| `/calendar` | A10 SUSPENDED | TEAM PA1 inactivo | protegida | → `/login` | sin calendario | ninguna |
| `/calendar` | A11 MUST-CHANGE | TEAM PA1 | protegida | → `/change-password` | sin calendario | cambiar contraseña |
| `/calendar` | A12 LIDER-CR | COUNTRY CR | CR; PA ajeno | solo CR | PA ausente | R,C,U,A,M en CR |
| `/team` | A1 ADMIN | GLOBAL | usuarios todos | permitir global | todos los usuarios y permisos efectivos | R,UM inferiores,OV,crear/editar |
| `/team` | A2 LIDER-PA | COUNTRY PA | usuarios PA; CR ajeno | solo PA | CR ausente/no gestionable | R,UM inferiores en PA |
| `/team` | A3 COORD-PA1 | TEAM PA1 | usuarios PA1; PA2 ajeno | lectura PA1 | sin controles de gestión | R |
| `/team` | A4 TEC-PA1 | TEAM PA1 | usuarios PA1 | lectura PA1 | sin mutaciones | R |
| `/team` | A5 AUDITOR | GLOBAL | usuarios todos | solo lectura global | sin mutaciones; no hay bandeja AuditLog | R |
| `/team` | A6 PLANIFICADOR | TEAM PA1 | usuarios PA1 | lectura por permiso | UI no depende del nombre del rol | R |
| `/team` | A7 LIDER-DENY | COUNTRY PA | usuarios PA | gestión PA | DENY de actividad no afecta team | R,UM inferiores en PA |
| `/team` | A8 TEC-GRANT | TEAM PA2 | usuarios PA2 | lectura PA2 | GRANT de actividad no concede gestión | R |
| `/team` | A9 PENDING | sin scope | protegida | → `/access-pending` | sin usuarios | ninguna |
| `/team` | A10 SUSPENDED | TEAM PA1 inactivo | protegida | → `/login` | sin usuarios | ninguna |
| `/team` | A11 MUST-CHANGE | TEAM PA1 | protegida | → `/change-password` | sin usuarios | cambiar contraseña |
| `/team` | A12 LIDER-CR | COUNTRY CR | usuarios CR; PA ajeno | solo CR | usuarios PA ausentes/no gestionables | R,UM inferiores en CR |
| `/team` | A13 LAST-ADMIN | GLOBAL, único crítico | asignación propia/rol crítico | permitir página, prohibir pérdida del último admin | controles propios de revocación ausentes o deshabilitados | revocar propia asignación y eliminar permiso crítico deben devolver FORBIDDEN; DB intacta |
| `/settings` | A1 ADMIN | GLOBAL | catálogo/RBAC | permitir | catálogo, matriz, usuarios | CAT,RBAC no-sistema,gestión |
| `/settings` | A2 LIDER-PA | COUNTRY PA | global | denegar sin modelo | alerta restringida; matriz ausente | ninguna |
| `/settings` | A3 COORD-PA1 | TEAM PA1 | global | denegar | matriz ausente | ninguna |
| `/settings` | A4 TEC-PA1 | TEAM PA1 | global | denegar | matriz ausente | ninguna |
| `/settings` | A5 AUDITOR | GLOBAL | global | denegar | sin matriz ni bandeja AuditLog | ninguna |
| `/settings` | A6 PLANIFICADOR | TEAM PA1 | global | denegar | key personalizada no concede acceso | ninguna |
| `/settings` | A7 LIDER-DENY | COUNTRY PA | global | denegar | matriz ausente | ninguna |
| `/settings` | A8 TEC-GRANT | TEAM PA2 | global | denegar | GRANT activity no concede settings | ninguna |
| `/settings` | A9 PENDING | sin scope | protegida | → `/access-pending` | sin configuración | ninguna |
| `/settings` | A10 SUSPENDED | TEAM PA1 inactivo | protegida | → `/login` | sin configuración | ninguna |
| `/settings` | A11 MUST-CHANGE | TEAM PA1 | protegida | → `/change-password` | sin configuración | cambiar contraseña |
| `/settings` | A12 LIDER-CR | COUNTRY CR | global | denegar | matriz ausente | ninguna |
| `/access-pending` | A1 ADMIN | GLOBAL | estado | → `/dashboard` | sin tarjeta pendiente | ninguna |
| `/access-pending` | A2 LIDER-PA | COUNTRY PA | estado | → `/dashboard` | sin tarjeta pendiente | ninguna |
| `/access-pending` | A3 COORD-PA1 | TEAM PA1 | estado | → `/dashboard` | sin tarjeta pendiente | ninguna |
| `/access-pending` | A4 TEC-PA1 | TEAM PA1 | estado | → `/dashboard` | sin tarjeta pendiente | ninguna |
| `/access-pending` | A5 AUDITOR | GLOBAL | estado | → `/dashboard` | sin tarjeta pendiente | ninguna |
| `/access-pending` | A6 PLANIFICADOR | TEAM PA1 | estado | → `/dashboard` | sin tarjeta pendiente | ninguna |
| `/access-pending` | A7 LIDER-DENY | COUNTRY PA | estado | → `/dashboard` | sin tarjeta pendiente | ninguna |
| `/access-pending` | A8 TEC-GRANT | TEAM PA2 | estado | → `/dashboard` | sin tarjeta pendiente | ninguna |
| `/access-pending` | A9 PENDING | sin scope | pendiente | permitir solo aquí | “Tu acceso está pendiente”, sin AppShell | cerrar sesión |
| `/access-pending` | A10 SUSPENDED | TEAM PA1 inactivo | suspendido | → `/login` | no tarjeta pendiente | ninguna |
| `/access-pending` | A11 MUST-CHANGE | TEAM PA1 | credencial temporal | → `/change-password` | cambio obligatorio | cambiar contraseña |
| `/access-pending` | A12 LIDER-CR | COUNTRY CR | estado | → `/dashboard` | sin tarjeta pendiente | ninguna |
| `/change-password` | A1 ADMIN | GLOBAL | credencial normal | → `/dashboard` | no formulario | ninguna |
| `/change-password` | A2 LIDER-PA | COUNTRY PA | credencial normal | → `/dashboard` | no formulario | ninguna |
| `/change-password` | A3 COORD-PA1 | TEAM PA1 | credencial normal | → `/dashboard` | no formulario | ninguna |
| `/change-password` | A4 TEC-PA1 | TEAM PA1 | credencial normal | → `/dashboard` | no formulario | ninguna |
| `/change-password` | A5 AUDITOR | GLOBAL | credencial normal | → `/dashboard` | no formulario | ninguna |
| `/change-password` | A6 PLANIFICADOR | TEAM PA1 | credencial normal | → `/dashboard` | no formulario | ninguna |
| `/change-password` | A7 LIDER-DENY | COUNTRY PA | credencial normal | → `/dashboard` | no formulario | ninguna |
| `/change-password` | A8 TEC-GRANT | TEAM PA2 | credencial normal | → `/dashboard` | no formulario | ninguna |
| `/change-password` | A9 PENDING | sin scope | pendiente | → `/access-pending` | no formulario | ninguna |
| `/change-password` | A10 SUSPENDED | TEAM PA1 inactivo | suspendido | → `/login` | login | ninguna |
| `/change-password` | A11 MUST-CHANGE | TEAM PA1 | temporal | permitir hasta completar | nueva contraseña/confirmación | guardar; luego `/dashboard` |
| `/change-password` | A12 LIDER-CR | COUNTRY CR | normal | → `/dashboard` | no formulario | ninguna |
| `/login` | A1 ADMIN | GLOBAL | credencial A1 | aceptar → `/dashboard` | formulario real | autenticar |
| `/login` | A2 LIDER-PA | COUNTRY PA | credencial A2 | aceptar → `/dashboard` | formulario real | autenticar |
| `/login` | A3 COORD-PA1 | TEAM PA1 | credencial A3 | aceptar → `/dashboard` | formulario real | autenticar |
| `/login` | A4 TEC-PA1 | TEAM PA1 | credencial A4 | aceptar → `/dashboard` | formulario real | autenticar |
| `/login` | A5 AUDITOR | GLOBAL | credencial A5 | aceptar → `/dashboard` | formulario real | autenticar |
| `/login` | A6 PLANIFICADOR | TEAM PA1 | credencial A6 | aceptar → `/dashboard` | comportamiento por permisos dinámicos | autenticar |
| `/login` | A7 LIDER-DENY | COUNTRY PA | credencial A7 | aceptar → `/dashboard` | DENY aplicado después del login | autenticar |
| `/login` | A8 TEC-GRANT | TEAM PA2 | credencial A8 | aceptar → `/dashboard` | GRANT aplicado después del login | autenticar |
| `/login` | A9 PENDING | sin scope | credencial A9 | aceptar sesión limitada → `/access-pending` | tarjeta pendiente, nunca AppShell | autenticar únicamente |
| `/login` | A10 SUSPENDED | TEAM PA1 inactivo | credencial A10 | rechazar; permanecer `/login` | error genérico | ninguna |
| `/login` | A11 MUST-CHANGE | TEAM PA1 | contraseña temporal | aceptar → `/change-password` | cambio obligatorio | autenticar/cambiar |
| `/login` | A12 LIDER-CR | COUNTRY CR | credencial A12 | aceptar → `/dashboard` | dashboard CR | autenticar |

## Casos IDOR obligatorios

| Ruta | Rol | Scope del actor | Scope del recurso | Acceso esperado | Elementos UI esperados | Acciones permitidas |
|---|---|---|---|---|---|---|
| `/activities/{activityPA2Id}` | A3 COORD-PA1 | TEAM PA1 | actividad TEAM PA2 | HTTP 403 explícito; nunca detalle ni 404 ambiguo | mensaje de acceso denegado, sin datos del recurso | ninguna |
| Server Action `updateActivity(activityPA2Id)` | A3 COORD-PA1 | TEAM PA1 | actividad TEAM PA2 | `{success:false,errorCode:"FORBIDDEN"}` | error explícito; actividad intacta | ninguna |
| Server Action `addActivityComment(activityPA2Id)` | A4 TEC-PA1 | TEAM PA1 | actividad TEAM PA2 | `{success:false,errorCode:"FORBIDDEN"}` | error explícito; comentario no creado | ninguna |
| Server Action `updateActivity(activityPA2Id)` | A4 TEC-PA1 | TEAM PA1 | actividad TEAM PA2 | `{success:false,errorCode:"FORBIDDEN"}` | error explícito; actividad intacta | ninguna |
| Server Action `assignUserRole(userPAId, role, scopePA)` | A12 LIDER-CR | COUNTRY CR | usuario COUNTRY PA | `{success:false,errorCode:"FORBIDDEN"}` | error explícito; asignación no creada | ninguna |
| Server Action `revokeUserRole(assignmentPAId)` | A12 LIDER-CR | COUNTRY CR | asignación COUNTRY PA | `{success:false,errorCode:"FORBIDDEN"}` | error explícito; asignación permanece | ninguna |

La aplicación actualmente no define `/activities/[activityId]`. La prueba normativa exige que una URL direccionable con un ID ajeno no degrade a una página vacía o a datos filtrados silenciosamente. Si el servidor responde 404 porque la superficie no existe, se reportará como discrepancia MEDIA de cobertura de seguridad/UX; las Server Actions siguen siendo la barrera obligatoria y un fallo que permita mutación será CRÍTICO.

## Suspensión en caliente

| Ruta | Rol | Scope del actor | Scope del recurso | Acceso esperado | Elementos UI esperados | Acciones permitidas |
|---|---|---|---|---|---|---|
| `/dashboard` siguiente request | A2 LIDER-PA con sesión ya abierta | COUNTRY PA, cambia ACTIVE→SUSPENDED | sesión JWT y datos PA | la siguiente navegación/request debe revalidar DB, invalidar la sesión y redirigir `/login` | no AppShell ni datos protegidos | ninguna; Server Actions posteriores devuelven UNAUTHORIZED |

El comportamiento recomendado y esperado es invalidación en la siguiente request. Si el JWT permanece aceptado y solo alguna página muestra un estado vacío, se registrará como hallazgo; nunca se ajustará esta expectativa al comportamiento observado.

## Último administrador crítico

El escenario de A13 se ejecuta serialmente después de restaurar el seed. Se suspenden temporalmente A1 y cualquier otro usuario con asignación GLOBAL que conceda una clave crítica. Se verifica en base que A13 sea el único activo antes de probar:

1. La UI de `/team` no ofrece revocar su propia asignación.
2. Una invocación directa de `revokeUserRole` contra su asignación devuelve FORBIDDEN y no elimina la fila.
3. La UI no permite deshabilitar el permiso crítico del rol de sistema; una invocación directa de `setRolePermission` devuelve FORBIDDEN y conserva el permiso.

## Arquitectura aprobada para los pasos 2–5

- PostgreSQL dedicado mediante `TEST_DATABASE_URL`; nunca se acepta que coincida con `DATABASE_URL` o `DIRECT_DATABASE_URL` de desarrollo.
- Migraciones reales con `prisma migrate deploy` y seed determinista idempotente.
- Playwright real con Chromium, Next.js levantado con variables E2E, login por credenciales y contextos aislados.
- Specs de autenticación/rutas, scopes/UI, Server Actions/IDOR y escenarios seriales sensibles.
- Evidencia automática: HTML report, JUnit/JSON, screenshots y traces en fallos.
- Reporte final generado desde resultados reales, con conteo ejecutado/no cubierto y tabla de discrepancias.
