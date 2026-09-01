# Diseño del sistema dinámico de roles y permisos

## Objetivo y alcance de esta fase

Esta primera fase sustituye la matriz de permisos hardcodeada por datos persistidos en PostgreSQL, migra los cinco roles existentes sin cambiar las capacidades efectivas iniciales y endurece la asignación de roles, alcances y overrides. Incluye migración Prisma, seed idempotente, resolución de permisos, server actions y pruebas de seguridad. El refactor visual de `/team` y `/settings` queda explícitamente fuera de esta fase y comenzará solo después de reportar y aprobar este hito.

## Decisión arquitectónica

Se usará autorización relacional con una jerarquía explícita `Role.priority`. Esta opción es preferible a inferir privilegio por cantidad de permisos —dos permisos no tienen necesariamente el mismo riesgo— y a mantener una tabla de prioridades en TypeScript, que volvería a introducir hardcoding y no soportaría roles personalizados.

Los valores iniciales son:

| Rol | priority | isSystem |
| --- | ---: | --- |
| ADMIN | 500 | true |
| LIDER | 400 | true |
| COORDINADOR | 300 | true |
| TECNICO | 200 | true |
| AUDITOR | 100 | true |

La migración conserva los IDs existentes y renombra las claves actuales `LEAD`, `COORDINATOR` y `TECHNICIAN` a `LIDER`, `COORDINADOR` y `TECNICO`. Así, las asignaciones existentes no se pierden.

## Modelo de datos

`Role` incorpora `name`, `description`, `isSystem`, `priority`, relaciones con `RolePermission` y asignaciones. `Permission` contiene `key`, `label` y `category`. `RolePermission` usa una unicidad compuesta por rol y permiso.

`UserPermissionOverride` deriva su alcance así:

- `teamId` presente: alcance TEAM.
- `countryId` presente y `teamId` nulo: alcance COUNTRY.
- ambos nulos: alcance GLOBAL.

El `@@unique([userId, permissionId, countryId, teamId])` solicitado no evita duplicados cuando existen columnas nulas en PostgreSQL. Para garantizar la unicidad real se añadirá `scopeKey String` con valores `GLOBAL`, `COUNTRY:<id>` o `TEAM:<id>`, y `@@unique([userId, permissionId, scopeKey])`. Las validaciones impiden combinaciones incoherentes y verifican que un equipo pertenezca al país indicado cuando ambos datos intervienen.

`User` tendrá las relaciones de overrides recibidos y overrides creados. `createdById` quedará relacionado al actor. Se añadirá el enum `OverrideEffect { GRANT DENY }`.

## Catálogo y matriz inicial

Las diez capacidades actuales se conservan como catálogo inicial:

- Actividades: `activity:read`, `activity:create`, `activity:update`, `activity:assign`, `activity:comment`.
- Disponibilidad: `availability:read`, `availability:update`.
- Administración: `catalog:manage`, `team:manage`.
- Auditoría: `audit:read`.

El seed trasladará exactamente la matriz actual:

- ADMIN: las diez capacidades.
- LIDER: todas excepto `catalog:manage`.
- COORDINADOR: actividades completas y disponibilidad completa, sin catálogo, equipo ni auditoría.
- TECNICO: lectura/actualización/comentarios de actividades y lectura/actualización de disponibilidad.
- AUDITOR: lectura de actividades, lectura de disponibilidad y auditoría.

El seed será idempotente: actualizará nombre, descripción, prioridad e `isSystem`; creará permisos faltantes; sincronizará `RolePermission` con la matriz inicial sin duplicados; y mantendrá el administrador de prueba GLOBAL activo.

## Resolución de permisos efectivos

`getEffectivePermissions(userId, resource)` consultará asignaciones con sus permisos de rol y overrides aplicables al recurso.

Una asignación aplica cuando su alcance contiene el recurso:

- GLOBAL aplica a cualquier recurso.
- COUNTRY aplica cuando coincide `countryId`.
- TEAM aplica cuando coincide `teamId`.

Un override aplica con las mismas reglas. La resolución se realiza por permiso:

1. Se reúnen permisos heredados de todos los roles aplicables.
2. Se reúnen overrides aplicables.
3. Si existe al menos un `DENY`, el permiso se elimina siempre.
4. Si no existe DENY y existe un `GRANT`, el permiso se añade.
5. De lo contrario se conserva el resultado heredado.

Cuando no se entrega `resource`, solo se consideran asignaciones y overrides GLOBAL. Esto evita que un permiso COUNTRY habilite administración global accidentalmente.

El resultado expondrá roles dinámicos, permisos efectivos, fuentes heredadas/override para la UI posterior y `can(permissionKey)`.

## Política anti-escalación

La política se centralizará en funciones puras y reutilizables por todas las server actions.

### Protección del propio usuario

Ningún actor puede crear, actualizar o eliminar una `UserRoleAssignment` o `UserPermissionOverride` cuyo `userId` sea el suyo. Tampoco puede activar, suspender o restablecer su propia cuenta desde las acciones administrativas.

La edición del catálogo `Role`/`RolePermission` por un ADMIN GLOBAL es una operación de catálogo, no una modificación directa de su asignación personal. Esta distinción permite cumplir la edición de la matriz solicitada sin permitir que el actor se añada overrides o asignaciones.

### Jerarquía de roles

Para asignar un rol, el actor debe tener en el alcance objetivo una asignación con `priority` estrictamente mayor que la del rol objetivo. Un rol de prioridad igual o superior se rechaza con `FORBIDDEN`.

Los roles personalizados requieren una prioridad explícita. Un ADMIN GLOBAL solo puede crear roles con prioridad menor que su propia prioridad efectiva. Las prioridades son únicas para que la comparación sea determinista.

### Contención de alcance

La amplitud se valida por contención, no solo por el enum:

- GLOBAL puede asignar GLOBAL, COUNTRY o TEAM.
- COUNTRY puede asignar COUNTRY dentro de su mismo país o TEAM perteneciente a ese país.
- TEAM solo puede asignar TEAM para ese mismo equipo.

Ningún actor puede asignar fuera de sus territorios. Además debe poseer `team:manage` en el alcance objetivo. Esto corrige el hueco actual de `updateUserAccess`.

### Gestión de catálogo y overrides

Solo un actor con rol ADMIN, asignación GLOBAL y permiso efectivo correspondiente puede crear o modificar Role, Permission, RolePermission y UserPermissionOverride. Para un GRANT, el actor debe poseer el permiso que intenta conceder. Un DENY puede aplicarse a cualquier permiso del catálogo. Los roles de sistema no pueden eliminarse ni cambiar su `key`; sus asociaciones de permisos sí pueden editarse.

## Server actions

Se mantendrá `src/lib/permissions.ts` como fachada compatible para no romper las acciones existentes. La lógica se separará en módulos pequeños:

- catálogo tipado y datos iniciales;
- resolución de permisos efectivos;
- jerarquía y contención de alcance;
- políticas de mutación administrativa.

Las acciones administrativas cubrirán:

- crear/actualizar/eliminar roles no-sistema;
- asociar/desasociar permisos de rol;
- crear/actualizar/eliminar overrides;
- crear/eliminar asignaciones de usuario con delegación acotada;
- mantener las acciones de país/equipo y estado de usuario existentes.

Todas validarán entradas con Zod antes de consultar o escribir. Las comprobaciones de autorización y la mutación se repetirán dentro de la misma transacción para reducir ventanas TOCTOU.

## Auditoría

Cada mutación de `Role`, `RolePermission`, `UserPermissionOverride` y `UserRoleAssignment` se ejecutará en una transacción junto al `AuditLog` correspondiente.

La metadata tendrá forma estable:

```ts
{
  before: object | null,
  after: object | null,
  scope?: { scopeType: "GLOBAL" | "COUNTRY" | "TEAM"; countryId?: string; teamId?: string }
}
```

Acciones previstas: `CREATE_ROLE`, `UPDATE_ROLE`, `DELETE_ROLE`, `GRANT_ROLE_PERMISSION`, `REVOKE_ROLE_PERMISSION`, `CREATE_PERMISSION_OVERRIDE`, `UPDATE_PERMISSION_OVERRIDE`, `DELETE_PERMISSION_OVERRIDE`, `ASSIGN_ROLE` y `REVOKE_ROLE`.

## Estrategia de migración

1. Añadir tablas, columnas, enum, relaciones e índices.
2. Completar los campos nuevos de roles existentes y renombrar sus claves preservando IDs.
3. Insertar el catálogo de permisos.
4. Insertar la matriz `RolePermission` equivalente al código actual.
5. Hacer no nulos los campos obligatorios una vez completados.
6. Generar Prisma Client, ejecutar `prisma migrate deploy`, correr el seed y verificar conteos/matriz.

La migración será compatible con una base ya poblada. No se eliminarán asignaciones ni usuarios.

## Pruebas de seguridad obligatorias

Se escribirán antes de la implementación y deberán fallar por ausencia de la nueva lógica:

1. Anti-escalación: rechaza rol igual/superior, rol personalizado con prioridad inválida, permiso que el actor no posee y toda automodificación.
2. Delegación: COUNTRY rechaza otro país y acepta un rol inferior en su país; TEAM rechaza otro equipo y GLOBAL respeta la jerarquía.
3. Conflictos: DENY global/country/team gana frente a herencia y GRANT aplicables.
4. Roles de sistema: rechaza eliminación y cambio de key; permite sincronizar permisos por ADMIN GLOBAL.
5. Auditoría: cada mutación sensible escribe actor, entidad, acción y metadata before/after en la misma transacción.

También habrá pruebas de regresión que confirmen que los cinco roles obtienen exactamente la matriz anterior tras el seed.

## Criterios de aceptación de la fase

- `prisma validate`, generación de cliente y migración completan sin error.
- El seed puede ejecutarse dos veces y produce el mismo catálogo/matriz.
- Los cinco grupos de pruebas de seguridad pasan e incluyen intentos explícitos de escalación.
- La suite actual sigue pasando.
- La base persistida se consulta para verificar roles, permisos, asociaciones y administrador GLOBAL.
- No se modifica todavía la UI de `/team` ni `/settings`.
