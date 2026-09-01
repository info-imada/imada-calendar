# Guía de APIs y operaciones de servidor

## Modelo de interacción

Calendar no expone una API REST general. Usa tres superficies:

1. **NextAuth Route Handler** para autenticación.
2. **Route Handlers puntuales** para navegación HTTP con semántica explícita.
3. **Server Actions** para mutaciones del dominio desde componentes cliente.

Las consultas principales se ejecutan en Server Components/read models y se entregan como modelos serializables.

## Endpoints HTTP confirmados

### `/api/auth/[...nextauth]`

- Métodos: GET y POST exportados por NextAuth.
- Runtime: Node.js.
- Providers: Zoho cuando hay configuración y Credentials siempre.
- Sesión: JWT.
- Página de login: `/login`.
- El formulario local usa POST nativo a `/api/auth/callback/credentials` con `csrfToken` obtenido de NextAuth.

No implementes un endpoint paralelo de login ni manejes contraseñas fuera de `src/lib/auth.ts` y `src/lib/password.ts`.

### `GET /api/health`

Health/readiness público para Docker y Dokploy. Ejecuta una consulta mínima contra PostgreSQL mediante Prisma y responde:

- `200 { "status": "ok" }` si aplicación y base están disponibles;
- `503 { "status": "unavailable" }` ante cualquier fallo.

La respuesta usa `Cache-Control: no-store` y nunca devuelve el error interno, URLs de conexión o credenciales. No agregues datos operativos o de usuarios a este endpoint.

### `GET /activities/[activityId]`

Propósito: entrada directa segura hacia un detalle de actividad.

Comportamiento:

- sin usuario activo: redirect a `/login?callbackUrl=/activities`;
- ID inexistente: HTML 404 “Actividad no encontrada”;
- recurso fuera de scope/sin `activity:read`: HTML 403 “Acceso denegado”;
- permitido: redirect a `/activities?activityId=<id>`.

La respuesta 403 explícita evita convertir un IDOR en una página vacía o un 404 ambiguo.

## Server Actions

### Actividades — `src/app/actions/activities.ts`

| Acción | Entrada Zod | Permiso principal |
|---|---|---|
| `createActivity` | `activityInputSchema` | `activity:create`; `activity:assign` si asigna |
| `updateActivity` | `activityUpdateInputSchema` | `activity:update`; `activity:assign` si cambia asignado |
| `changeActivityStatus` | `activityStatusInputSchema` | `activity:update` |
| `cancelActivity` | `activityCancelInputSchema` | `activity:update` |
| `addActivityComment` | `activityCommentInputSchema` | `activity:comment` |

Contrato:

```ts
type ActivityActionResult =
  | {
      success: true;
      activityId: string;
      createdCount?: number;
      commentId?: string;
    }
  | {
      success: false;
      errorCode:
        | "UNAUTHORIZED"
        | "FORBIDDEN"
        | "VALIDATION"
        | "CONFLICT"
        | "NOT_FOUND"
        | "RECURRENCE_LIMIT"
        | "UNEXPECTED";
      fieldErrors?: Record<string, string[] | undefined>;
    };
```

Al completar una mutación se revalidan `/`, `/activities`, `/dashboard` y `/calendar`.

Las actividades nuevas validan cliente activo cuando el catálogo contiene clientes; el cliente es opcional para editar registros históricos. `partNumber` y `partUrl` son opcionales y el enlace debe ser una URL válida.

### Catálogo — `src/app/actions/administration.ts`

- `createCountry`
- `createTeam`
- `createCustomer`
- `updateCustomer`
- `setCustomerStatus`
- wrappers `updateUserAccess` y `setUserAccessStatus`

País/equipo requieren administración global, validación Zod, transacción y AuditLog. Los códigos habituales incluyen UNAUTHORIZED, FORBIDDEN, VALIDATION, CONFLICT, NOT_FOUND y UNEXPECTED.

### Roles, permisos y usuarios — `src/app/actions/authorization.ts`

- Roles: `createRole`, `updateRole`, `deleteRole`.
- Matriz: `setRolePermission`.
- Asignaciones: `assignUserRole`, `revokeUserRole`.
- Overrides: `setUserPermissionOverride`, `deleteUserPermissionOverride`.
- Usuarios: `createManagedUser`, `updateManagedUser`, `setManagedUserStatus`, `resetTemporaryPassword`.

Contrato general:

```ts
type AuthorizationActionResult =
  | { success: true; entityId?: string; temporaryPassword?: string }
  | {
      success: false;
      errorCode:
        | "UNAUTHORIZED"
        | "FORBIDDEN"
        | "VALIDATION"
        | "CONFLICT"
        | "NOT_FOUND"
        | "UNEXPECTED";
    };
```

La contraseña temporal solo se devuelve en la respuesta de creación/reset correspondiente; nunca se escribe en AuditLog.

### Cambio de contraseña — `src/app/actions/authentication.ts`

`changePassword` valida dos campos coincidentes, exige usuario con credencial, almacena hash, elimina `mustChangePassword` y registra `CHANGE_PASSWORD`. La UI cierra la sesión después para exigir un nuevo login.

## Convención para crear o modificar operaciones

### Validación

- Define o reutiliza un schema en `src/lib/validations/`.
- Usa `safeParse` antes de consultar o escribir.
- Normaliza email, key, código y strings en Zod, no de forma ad hoc en UI.
- Devuelve `VALIDATION` y errores de campo cuando el contrato los admite.

### Autenticación y autorización

- Obtén el actor con `getCurrentUser()`.
- Carga el recurso real por ID; no confíes en country/team enviados por el cliente.
- Resuelve `getEffectivePermissions(actorId, resource)`.
- Si la operación cambia scope o responsable, valida origen y destino.
- Para decisiones sensibles a concurrencia, reconsulta actor, permisos y recurso dentro de `$transaction` justo antes de escribir.

### Persistencia

- Agrupa escritura de entidad y AuditLog en la misma transacción.
- Usa upsert cuando exista una clave única lógica y se espere idempotencia.
- Convierte errores Prisma conocidos: `P2002` a CONFLICT y `P2025` a NOT_FOUND cuando corresponda.
- No captures `AuthorizationError` como UNEXPECTED.

### Respuesta y UI

- Mantén un union discriminado por `success`.
- No lances errores esperados hacia el navegador como 500.
- La UI debe mostrar Alert/Sonner y conservar datos del formulario tras un rechazo.
- Revalida únicamente las rutas afectadas.

## Formato de errores

| Código | Significado | Tratamiento esperado |
|---|---|---|
| `VALIDATION` | Payload inválido | Mostrar campos/mensaje, sin reintento automático. |
| `UNAUTHORIZED` | No existe actor válido | Reautenticar/redirigir. |
| `FORBIDDEN` | Sin permiso, prioridad o scope | Mensaje explícito; no ocultar como fallo genérico. |
| `NOT_FOUND` | Recurso/referencia inexistente | Informar recurso no disponible. |
| `CONFLICT` | Unicidad o solapamiento | Explicar conflicto corregible. |
| `RECURRENCE_LIMIT` | Serie superior a 60 | Pedir acortar recurrencia. |
| `UNEXPECTED` | Error no clasificado | Mensaje genérico y logging sin secretos. |

## Seguridad contra IDOR

Para toda operación que recibe un ID:

1. busca la entidad real;
2. obtiene su `countryId`/`teamId` desde base;
3. resuelve permisos para ese recurso;
4. rechaza explícitamente antes de devolver datos o escribir;
5. limita también listados y selects al scope, no solo la acción final.

Nunca uses “el registro no apareció en la lista” como protección suficiente.

## Autenticación y sesión

El JWT contiene `accessDecision` y `mustChangePassword`, pero `src/lib/auth.ts` reconsulta el usuario. Conserva esta revalidación para que suspensiones y cambios de contraseña tengan efecto en solicitudes posteriores.

El fallback de `NEXTAUTH_SECRET` es solo para desarrollo local. Producción debe suministrar un secreto real.

## Job interno de notificaciones

- `POST /api/jobs/notifications` requiere `Authorization: Bearer <NOTIFICATION_JOB_SECRET>`.
- Encola recordatorios vencidos y procesa hasta 50 entregas por ejecución.
- Solo devuelve conteos `claimed`, `sent`, `failed` y `skipped`; nunca destinatarios, payloads ni errores del proveedor.
- No reutilices este endpoint como API pública ni aceptes asunto, body o destinatarios desde la solicitud.

## Archivos que debes leer

- `src/app/api/auth/[...nextauth]/route.ts`
- `src/app/api/health/route.ts`
- `src/app/(app)/activities/[activityId]/route.ts`
- `src/app/actions/`
- `src/lib/validations/`
- `src/lib/auth.ts`
- `src/lib/permissions.ts`
- `src/lib/authorization/`
- [`PERMISSIONS.md`](PERMISSIONS.md)

## Pendiente por confirmar

- Necesidad futura de una API pública/versionada para integraciones.
- Política de rate limiting general fuera del bloqueo de credenciales.
- Observabilidad centralizada y formato de correlation IDs.

## Registro de tarea

- La pantalla está en `/work-logs`; las lecturas usan Server Components y las mutaciones usan Server Actions en `src/app/actions/work-logs.ts`.
- Acciones: `startWorkLog`, `saveWorkLogDraft`, `resetWorkLogStart`, `finishWorkLog`, `completeWorkLog`, `adminUpdateWorkLog` y `deleteWorkLog`.
- Los adjuntos se preparan con `POST /api/work-logs/attachments/presign` y se consultan mediante `/api/work-logs/:workLogId/attachments/:attachmentId`.
- La exportación usa `GET /api/work-logs/export` y conserva los filtros y el alcance efectivo del usuario.
- Toda hora se toma en servidor, se persiste en UTC y se presenta con la zona capturada por el técnico.
