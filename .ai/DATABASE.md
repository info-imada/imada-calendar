# Base de datos

## Tecnología y conexión

Calendar usa **PostgreSQL** mediante **Prisma 7** y `@prisma/adapter-pg`. `src/lib/prisma.ts` crea un `pg.Pool` y reutiliza el cliente en desarrollo. `docs/database/dokploy-postgres.md` identifica PostgreSQL de Dokploy como base de producción.

Las URLs no viven en `schema.prisma`. `prisma.config.ts` selecciona:

1. `DIRECT_DATABASE_URL` para migraciones cuando está disponible;
2. `DATABASE_URL` como fallback;
3. una URL placeholder solo para permitir cargar configuración sin revelar credenciales.

No copies, registres ni documentes valores reales de conexión.

## Enums

| Enum | Valores | Uso |
|---|---|---|
| `ScopeType` | GLOBAL, COUNTRY, TEAM | Alcance de asignación de rol. |
| `AccessStatus` | PENDING, ACTIVE, SUSPENDED | Estado de acceso del usuario. |
| `RecurrenceFrequency` | DAILY, WEEKLY, MONTHLY | Frecuencia de series. |
| `ReminderChannel` | IN_APP, EMAIL | Canal de recordatorio. |
| `OverrideEffect` | GRANT, DENY | Excepción individual de permiso. |

## Modelos por dominio

### Identidad y autenticación

- `User`: identidad central, estado, relaciones de sesión, autorización, actividad y comunicación.
- `UserCredential`: relación 1:1 por `userId`, hash local, obligación de cambio y fechas.
- `LoginAttempt`: intentos por email y fecha para bloqueo temporal.
- `Account`, `Session`, `VerificationToken`: tablas del adapter de NextAuth.

Constraints relevantes:

- `User.email` es opcional y único.
- `UserCredential.userId` es PK y se elimina en cascada con User.
- `Account` usa PK compuesta `[provider, providerAccountId]`.
- `Session.sessionToken` es único y también PK.
- `VerificationToken` usa `@@unique([identifier, token])`.

### Territorio

- `Country`: código único, nombre, equipos, actividades, asignaciones y overrides.
- `Team`: pertenece a Country y usa `@@unique([countryId, name])`.
- `Customer`: catálogo local administrado por ADMIN, con nombre, código opcional y estado activo.

Eliminar un Country/Team tiene efectos distintos según la relación. Revisa `onDelete` en el esquema y datos existentes antes de añadir operaciones de borrado; la UI actual solo crea.

### Autorización dinámica

- `Role`: key y priority únicas, nombre, descripción, `isSystem`, permisos y asignaciones.
- `Permission`: key única, label, categoría, roles y overrides.
- `RolePermission`: join rol-permiso con `@@unique([roleId, permissionId])`; ambas FK eliminan en cascada.
- `UserRoleAssignment`: usuario, rol, `scopeType`, país/equipo opcional, `scopeKey`, creador y fecha.
- `UserPermissionOverride`: usuario, permiso, efecto, país/equipo opcional, `scopeKey`, creador y fecha.

Constraints Prisma actuales, copiados literalmente:

```prisma
// UserRoleAssignment
@@unique([userId, roleId, scopeKey])
@@index([userId, countryId, teamId])

// UserPermissionOverride
@@unique([userId, permissionId, scopeKey])
@@index([userId, countryId, teamId])
```

`UserRoleAssignment` sí tiene `scopeType` explícito. `UserPermissionOverride` no: su tipo lógico se deriva de `countryId`, `teamId` y `scopeKey`.

La base también aplica checks SQL:

- asignación GLOBAL: `scopeKey = 'GLOBAL'`, país/equipo nulos;
- COUNTRY: `scopeKey = 'COUNTRY:' || countryId`, country no nulo y team nulo;
- TEAM: `scopeKey = 'TEAM:' || teamId`, team no nulo y country nulo en asignaciones;
- override: patrón GLOBAL/COUNTRY/TEAM consistente con IDs; TEAM admite `countryId` auxiliar porque la acción lo deriva del equipo.

La aplicación genera claves con `scopeKeyFor()` en `src/lib/authorization/administration-policy.ts`. Nunca aceptes `scopeKey` arbitrario desde el cliente.

No existe `expiresAt` en `UserRoleAssignment` ni en `UserPermissionOverride`; las asignaciones y overrides no expiran automáticamente.

### Operación de actividades

- `ActivityType`, `ActivityStatus`, `Priority`: catálogos activos con código único, color y orden; Priority agrega `level` único.
- `Activity`: programación, territorio, cliente opcional, clasificación, asignado, creador, número/enlace de parte, serie, comentarios y recordatorios.
- `ActivitySeries`: agrupa ocurrencias.
- `RecurrenceRule`: relación 1:1 por `seriesId`, frecuencia, intervalo, días, fin y timezone.
- `ActivityComment`: texto y autor; se elimina en cascada con actividad.
- `ActivityReminder`: canal, programación y envío; se elimina en cascada con actividad.

Índices de Activity cubren país/inicio, equipo/inicio, cliente/inicio, asignado/inicio y estado/inicio. Las consultas de calendario y conflicto dependen de estos campos.

### Personas y comunicación

- `Availability`: ventana de ausencia/disponibilidad por usuario con índice `[userId, startsAt]`.
- `Notification`: título, cuerpo, lectura y fecha con índice `[userId, readAt, createdAt]`.

Su presencia en esquema no implica que exista una UI completa; consulta [`MODULES.md`](MODULES.md).

### Auditoría

`AuditLog` guarda `actorId?`, `entityType`, `entityId`, `action`, `metadata?` y `createdAt`. Tiene índice `[entityType, entityId, createdAt]`.

La migración inicial crea el trigger `AuditLog_immutable`, que ejecuta `prevent_audit_log_mutation()` y rechaza UPDATE o DELETE. La aplicación debe insertar eventos; nunca intentar “corregir” registros existentes.

## Relaciones críticas

```text
User ──< UserRoleAssignment >── Role ──< RolePermission >── Permission
User ──< UserPermissionOverride >────────────────────────── Permission

Country ──< Team
Country/Team ──< Activity >── User (assignedTo / createdBy)
Activity ──< ActivityComment
Activity ──< ActivityReminder
ActivitySeries ──1 RecurrenceRule
ActivitySeries ──< Activity
```

## Migraciones versionadas

| Migración | Propósito confirmado |
|---|---|
| `20260714113000_initial_foundation` | Identidad NextAuth, territorio, roles iniciales, actividades, disponibilidad, notificaciones y AuditLog inmutable. |
| `20260714114500_add_password_authentication` | `UserCredential` y `LoginAttempt`. |
| `20260716113000_dynamic_authorization` | Roles enriquecidos, Permission, RolePermission, overrides y checks de scope. |
| `20260716124500_harden_role_assignments` | `scopeKey` en asignaciones, deduplicación, unique compuesto y check de consistencia. |
| `20260813115900_bootstrap_system_catalogs` | Catálogos mínimos para bases nuevas antes de simplificar roles/clientes. |
| `20260813120000_simplify_roles_and_activity_customers` | Cliente local, campos de parte, tipo Entrega de Equipo y normalización a ADMIN/TECNICO. |
| `20260813130000_repair_equipment_delivery_activity_type_id` | Repara el ID catalogado de Entrega de Equipo para validación CUID. |

La migración de hardening elimina duplicados con `ROW_NUMBER()` antes de crear el índice único. El número histórico de filas eliminadas no está registrado en el repositorio y no debe inferirse.

## Seed

Las migraciones crean los catálogos mínimos necesarios para que una base nueva arranque sin depender del seed. `prisma/seed.ts` sigue siendo idempotente mediante upserts y crea/sincroniza:

- los roles de sistema con prioridades;
- diez permisos y su matriz;
- países/equipos LATAM de ejemplo;
- tipos, estados y prioridades de actividad;
- un administrador global seed;
- credencial local del administrador solo si `SEED_ADMIN_PASSWORD` existe y tiene mínimo 12 caracteres.

Riesgo importante: al ejecutar el seed, cada rol seed elimina asociaciones no incluidas en `seedRolePermissions` y recrea la matriz declarada. Además puede recrear el usuario seed si existe contraseña configurada. No ejecutes seed contra producción sin validar esta consecuencia.

## Flujo seguro para cambios de esquema

1. Lee esquema, migraciones relacionadas, seed y pruebas de contrato.
2. Evalúa filas existentes, nullability, defaults, unicidad y cascadas.
3. Diseña backfill antes de convertir una columna en NOT NULL.
4. Crea una migración nueva; no edites SQL ya aplicado.
5. Si una deduplicación o eliminación es necesaria, conserva trazabilidad explícita.
6. Actualiza Zod, queries, tipos de presentación, acciones, seed y documentación.
7. Ejecuta `pnpm exec prisma generate`.
8. Aplica la migración en una base aislada antes de producción.
9. Ejecuta pruebas de contrato, integración relevante y `npm run build`.

## Outbox de correo

- `EmailNotification` conserva tipo, entidad, payload sin secretos, `to`/`cc`, estado, intentos, lease, provider ID y error sanitizado.
- `dedupeKey` es único por evento lógico. El índice de estado/fecha/lease soporta claim y reintentos concurrentes.
- `ActivityReminder` es único por actividad, canal y fecha programada.
- `sentAt` en un reminder significa que el evento fue encolado; la entrega real se confirma en `EmailNotification.sentAt`.

## Comandos vigentes

```powershell
pnpm exec prisma generate
pnpm db:migrate
pnpm db:seed
```

`db:migrate` usa `prisma migrate deploy`, apropiado para aplicar migraciones existentes. Para crear una migración durante desarrollo usa Prisma CLI con un nombre explícito y una base no productiva.

## Archivos que debes leer

- `prisma/schema.prisma`
- `prisma/migrations/*/migration.sql`
- `prisma/seed.ts`
- `prisma/seed-data.ts`
- `prisma.config.ts`
- `src/lib/prisma.ts`
- `src/lib/authorization/`
- `docs/database/dokploy-postgres.md`

## Pendiente por confirmar

- Estrategia aprobada de backup/restore y ventanas de migración.
- Privilegios efectivos del rol PostgreSQL de runtime sobre AuditLog.
- Política para ejecutar seed en entornos compartidos.

## Registro de tarea

Se añadieron `WorkLog`, `WorkLogAttachment` y `CustomerLocation`, además de `User.timezone` y la relación opcional única desde `Activity`. `activeKey` nullable y único evita dos jornadas activas del mismo técnico. Los instantes se almacenan como UTC; `workDate` es la fecha local calculada con la zona capturada. Las migraciones nuevas son `20260831170000_add_work_logs`, `20260831180000_add_work_log_notifications` y `20260831181500_add_customer_location_order`.
