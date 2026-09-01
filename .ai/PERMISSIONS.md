# Roles y permisos

## Principio fundamental

La autorización es **dinámica y persistida**. El nombre del rol describe una configuración seed, pero una capacidad real depende de:

1. asignaciones de rol aplicables al recurso;
2. permisos asociados actualmente a esos roles;
3. overrides individuales aplicables;
4. estado y scope del actor;
5. políticas administrativas de prioridad y anti-escalación.

La UI refleja capacidades; el servidor decide.

## Roles de sistema seed

| Key | Nombre | Prioridad | Propósito inicial |
|---|---|---:|---|
| `ADMIN` | Administrador | 500 | Administración global. |
| `LIDER` | Líder | 400 | Liderazgo operativo y equipo. |
| `COORDINADOR` | Coordinador | 300 | Coordinación de actividades. |
| `TECNICO` | Técnico | 200 | Ejecución técnica. |
| `AUDITOR` | Auditor | 100 | Consulta y trazabilidad. |

Todos tienen `isSystem = true`. Pueden crearse roles adicionales con key propia y prioridad única inferior a la del actor creador.

## Catálogo de permisos

| Categoría | Key | Significado |
|---|---|---|
| Actividades | `activity:read` | Consultar actividades. |
| Actividades | `activity:create` | Crear actividades. |
| Actividades | `activity:update` | Editar, cambiar estado o cancelar. |
| Actividades | `activity:assign` | Asignar/reasignar técnico. |
| Actividades | `activity:comment` | Crear notas internas. |
| Disponibilidad | `availability:read` | Consultar disponibilidad/equipo. |
| Disponibilidad | `availability:update` | Actualizar disponibilidad. |
| Administración | `catalog:manage` | Entrar y gestionar Administración global. |
| Administración | `team:manage` | Gestionar usuarios/asignaciones dentro de reglas de scope. |
| Auditoría | `audit:read` | Consultar eventos auditables permitidos. |

## Matriz seed

| Permiso | ADMIN | LIDER | COORDINADOR | TECNICO | AUDITOR |
|---|:---:|:---:|:---:|:---:|:---:|
| `activity:read` | ✓ | ✓ | ✓ | ✓ | ✓ |
| `activity:create` | ✓ | ✓ | ✓ | — | — |
| `activity:update` | ✓ | ✓ | ✓ | ✓ | — |
| `activity:assign` | ✓ | ✓ | ✓ | — | — |
| `activity:comment` | ✓ | ✓ | ✓ | ✓ | — |
| `availability:read` | ✓ | ✓ | ✓ | ✓ | ✓ |
| `availability:update` | ✓ | ✓ | ✓ | ✓ | — |
| `catalog:manage` | ✓ | — | — | — | — |
| `team:manage` | ✓ | ✓ | — | — | — |
| `audit:read` | ✓ | ✓ | — | — | ✓ |

Esta tabla describe `prisma/seed-data.ts`. La base puede diferir después de cambios administrativos. Consulta siempre RolePermission persistido.

## Scopes

### GLOBAL

Aplica a cualquier recurso. `scopeKey = "GLOBAL"`, sin country/team.

### COUNTRY

Aplica si `resource.countryId === assignment.countryId`. `scopeKey = "COUNTRY:<countryId>"`.

### TEAM

Aplica si `resource.teamId === assignment.teamId`. `scopeKey = "TEAM:<teamId>"`.

Un scope COUNTRY contiene teams del mismo país para delegación administrativa. Un scope TEAM no contiene otros equipos aunque pertenezcan al mismo país.

Cuando `getEffectivePermissions` se llama sin recurso, solo aplican asignaciones y overrides globales.

## Algoritmo de permisos efectivos

`src/lib/authorization/effective-permissions.ts` realiza:

1. filtrar asignaciones aplicables;
2. filtrar overrides aplicables;
3. agregar permisos heredados por key de rol;
4. contar GRANT y DENY por permiso;
5. permitir solo si no hay ningún DENY y existe al menos un rol o GRANT.

Regla exacta:

```ts
const denied = source.denies > 0;
const allowed = !denied &&
  (source.inheritedFrom.size > 0 || source.grants > 0);
```

Por tanto, **DENY siempre gana**. Ejemplo: `activity:update` heredado de un rol GLOBAL más DENY TEAM para el equipo A produce DENY al evaluar un recurso del equipo A; fuera de ese equipo el override no aplica y el permiso global permanece.

No hay una regla de “TEAM más específico gana” que anule un DENY global: si dos fuentes aplican, cualquier DENY bloquea.

## Fuentes y explicabilidad

El resultado incluye:

- `roles`: keys de roles aplicables;
- `permissions`: Set permitido;
- `sources[permission].inheritedFrom`;
- conteo de `grants` y `denies`;
- `effect` final ALLOW/DENY;
- helper `can(permission)`.

Equipo usa estas fuentes para mostrar permisos efectivos por scope.

## Acceso a módulos

| Superficie | Requisito confirmado |
|---|---|
| Agenda/Actividades/Calendario | `activity:read` para datos; controles por create/update/comment. |
| Equipo | Al menos `availability:read` en algún scope visible; gestión con `team:manage`. |
| Administración | ADMIN aplicable globalmente y `catalog:manage`. |
| Auditoría de actividad | `audit:read` en el recurso. |
| Crear/asignar actividad | `activity:create`; además `activity:assign` si hay responsable. |

No existe una bandeja global de auditoría que deba mostrarse por `audit:read`.

## Políticas administrativas

### Asignar o revocar roles

`assertCanAssignRole` rechaza si:

- actor y objetivo son el mismo usuario;
- el actor no tiene `team:manage` efectivo en el destino;
- ninguna asignación del actor contiene el scope destino;
- la prioridad del actor no es estrictamente mayor que la del rol objetivo; un administrador global puede asignar un rol de igual prioridad a otro usuario (nunca a sí mismo).

Las lecturas de actor, permisos y recurso se repiten dentro de la transacción para reducir TOCTOU. La creación usa upsert atómico sobre `[userId, roleId, scopeKey]`.

### Roles

- Crear requiere administración global y `newPriority < actorPriority`.
- Key de rol es única, normalizada a mayúscula por Zod.
- Priority es única.
- Un rol de sistema no puede eliminarse ni cambiar su key.
- `assertCanMutateRolePermissions` bloquea cambios de permisos de roles `isSystem` y de roles con prioridad igual/superior al actor.
- Al habilitar un permiso, el actor debe poseerlo.

### Overrides

- Solo ADMIN GLOBAL con acceso administrativo puede gestionarlos.
- No puede modificar sus propios overrides.
- Para GRANT, el actor debe poseer el permiso que concede.
- DENY no exige posesión del permiso, pero sí administración global.
- `scopeKeyFor()` deriva el scope; el cliente no lo envía.

### Continuidad administrativa

`CRITICAL_ADMINISTRATION_PERMISSION_KEYS` contiene actualmente:

```ts
["catalog:manage"]
```

Antes de revocar una asignación GLOBAL activa o deshabilitar ese permiso en un rol, se cuentan usuarios activos que conservarían acceso crítico por cualquier rol u override aplicable. La protección no depende de que el role key sea `ADMIN`.

Importante: `requireAdministrationAccess` sí exige específicamente `roles.includes("ADMIN")` además de `catalog:manage`. La protección de continuidad y el acceso a `/settings` no son exactamente el mismo predicado; no los fusiones sin una decisión de seguridad explícita.

## Estado del usuario

Los permisos no sustituyen `AccessStatus`:

- PENDING tiene sesión limitada, sin acceso operativo.
- ACTIVE necesita asignación.
- SUSPENDED es DENIED aunque conserve roles en base.

Ocultar navegación no es suficiente: layout, read models y Server Actions deben rechazar.

## Auditoría de autorización

Mutaciones de Role, RolePermission, UserRoleAssignment, UserPermissionOverride, usuarios y credenciales crean AuditLog con actor, entidad, acción y metadata before/after cuando corresponde. AuditLog es inmutable a nivel de base.

## Checklist para un nuevo permiso

1. Añadir Permission persistido/migración o seed según estrategia acordada.
2. Decidir categoría, label y roles seed iniciales.
3. Identificar recursos y estructura de `PermissionResource`.
4. Aplicarlo en read model y Server Action; no solo en UI.
5. Añadir capacidades serializables mínimas para controles.
6. Probar GLOBAL, COUNTRY, TEAM, GRANT, DENY e IDOR directo.
7. Evaluar si es crítico para continuidad administrativa.
8. Actualizar este documento y [`BUSINESS_RULES.md`](BUSINESS_RULES.md).

## Archivos que debes leer

- `prisma/seed-data.ts`
- `src/lib/permissions.ts`
- `src/lib/authorization/effective-permissions.ts`
- `src/lib/authorization/administration-policy.ts`
- `src/lib/authorization/global-administrator.ts`
- `src/app/actions/authorization.ts`
- `src/lib/authorization/*.test.ts`
- `src/app/actions/authorization.test.ts`

## Pendiente por confirmar

- Si roles de sistema deben volver a permitir edición de su matriz; el código actual la bloquea.
- Si un rol personalizado crítico debe satisfacer también `requireAdministrationAccess`; hoy no lo hace.
- Proceso empresarial de revisión periódica y expiración; no hay `expiresAt`.

## Registro de tarea

Permisos dinámicos añadidos: `worklog:read`, `worklog:create`, `worklog:update`, `worklog:finish`, `worklog:complete`, `worklog:admin-update` y `worklog:delete`. `TECNICO` recibe lectura, creación, actualización, finalización y completado; `ADMIN` recibe la matriz completa. Las consultas filtran propietario/scope en servidor y vuelven a resolver permisos por recurso; la UI no es una frontera de seguridad.
