# Reglas de negocio

## Autenticación y estado de acceso

### Estados de usuario

- `PENDING`: puede establecer una sesión limitada y debe permanecer en `/access-pending`.
- `ACTIVE`: necesita al menos una `UserRoleAssignment` para entrar a la aplicación operativa.
- `SUSPENDED`: no puede mantener acceso; la decisión debe actualizarse desde base en la siguiente evaluación del JWT/request.

`getCurrentUser()` solo devuelve usuarios `ACTIVE` con alguna asignación de rol.

### Métodos de autenticación

- Zoho OAuth se habilita cuando existen `ZOHO_CLIENT_ID` y `ZOHO_CLIENT_SECRET`.
- Un usuario desconocido puede autenticarse por Zoho y quedar sujeto al estado persistido creado por el adapter.
- Una identidad almacenada con credencial local no se enlaza automáticamente con Zoho.
- Credenciales locales requieren un `UserCredential` y contraseña válida.
- No existe flujo de invitación: los usuarios se crean desde Equipo.

### Contraseñas y bloqueo

- Contraseñas nuevas: mínimo 12 y máximo 128 caracteres.
- Una credencial temporal se crea con `mustChangePassword = true`.
- El usuario con contraseña temporal debe pasar por `/change-password` y luego vuelve a iniciar sesión.
- Cinco intentos fallidos dentro de 15 minutos bloquean temporalmente el correo.
- Un login exitoso elimina intentos fallidos anteriores de ese correo.

## Actividades

### Datos obligatorios

Toda actividad requiere título, inicio, fin, país, tipo, estado, prioridad y creador. Equipo y técnico son opcionales. El título tiene entre 3 y 160 caracteres; la descripción, hasta 4000.

### Programación

- `endsAt` debe ser estrictamente posterior a `startsAt`.
- El fin de recurrencia no puede ser anterior al inicio de la primera actividad.
- Las fechas se manejan como `Date` en servidor y se presentan con helpers de zona operativa; la recurrencia seed usa `America/Panama` por defecto.
- Una actividad asignada no puede solaparse con otra actividad abierta del mismo técnico.
- La detección usa intervalos semiabiertos: conflicto cuando el inicio existente es anterior al nuevo fin y el fin existente es posterior al nuevo inicio.
- Actividades `COMPLETED` o `CANCELLED` no bloquean disponibilidad futura en la consulta de conflicto.

### Recurrencia

- Frecuencias soportadas: `DAILY`, `WEEKLY`, `MONTHLY`.
- Intervalo: entero entre 1 y 12.
- Máximo: 60 ocurrencias por operación.
- Todas las ocurrencias conservan duración, clasificación, asignación y `seriesId`.
- Si las ocurrencias de la propia serie se solapan, la creación se rechaza como conflicto.

### Permisos de mutación

- Crear requiere `activity:create` en el país/equipo destino.
- Asignar o cambiar técnico requiere además `activity:assign`.
- Editar requiere `activity:update` tanto sobre el recurso existente como sobre el destino propuesto.
- Cambiar estado y cancelar requieren `activity:update` sobre la actividad.
- Comentar requiere `activity:comment` sobre la actividad.
- Leer detalle o listados requiere `activity:read` en el scope aplicable.

### Estados y catálogos

Los estados seed son `PLANNED`, `IN_PROGRESS`, `COMPLETED`, `BLOCKED` y `CANCELLED`. La acción genérica de cambio de estado excluye `CANCELLED`; cancelar usa una acción dedicada. Tipos, estados y prioridades deben existir y estar activos para crear/editar.

## Visibilidad territorial

- Una asignación GLOBAL aplica a todos los recursos.
- COUNTRY aplica a recursos del mismo `countryId`.
- TEAM aplica únicamente al mismo `teamId`.
- Las consultas deben filtrar datos antes de serializarlos; no basta con ocultarlos en la UI.
- Un usuario puede combinar varias asignaciones y overrides.
- Sin recurso, solo aplican asignaciones y overrides globales.

## Roles, prioridades y delegación

- Los roles son datos persistidos; pueden existir roles personalizados.
- Prioridad mayor significa mayor privilegio administrativo.
- Un actor nunca puede asignarse roles o permisos a sí mismo mediante las operaciones administrativas.
- Para asignar o revocar un rol, el actor necesita `team:manage`, contener el scope destino y tener prioridad estrictamente mayor que el rol objetivo. Un administrador global puede delegar el rol `ADMIN` a otro usuario, manteniendo la prohibición de autoasignación y la protección del último administrador.
- Un actor COUNTRY o TEAM no puede delegar fuera de su propio alcance.
- Solo un administrador global gestiona roles, matriz de permisos y overrides individuales.
- Los roles `isSystem` no se eliminan ni cambian de key. El código actual también impide modificar directamente sus asociaciones de permisos.

## Permisos efectivos y overrides

- Los permisos de rol se agregan para todas las asignaciones aplicables.
- Un override `GRANT` puede añadir capacidad dentro de su scope.
- Un override `DENY` prevalece sobre cualquier rol o GRANT aplicable.
- La interfaz debe usar capacidades efectivas por recurso, pero el servidor debe recalcularlas antes de escribir.

Consulta [`PERMISSIONS.md`](PERMISSIONS.md) para el algoritmo y la matriz seed.

## Administración global

- `requireAdministrationAccess` exige simultáneamente rol `ADMIN` aplicable en GLOBAL y permiso `catalog:manage`.
- Un rol personalizado con `catalog:manage` puede contribuir a la protección de continuidad administrativa, pero no satisface por sí solo `requireAdministrationAccess`.
- No se puede revocar una asignación ni retirar un permiso crítico si el resultado deja cero usuarios activos con administración global efectiva.
- El conjunto crítico actual contiene `catalog:manage`.

## Usuarios gestionados

- Se crean con método `ZOHO` o `LOCAL`; LOCAL genera contraseña temporal y obliga cambio.
- El estado inicial permitido es `PENDING` o `ACTIVE`.
- La creación incluye una asignación inicial válida y auditada.
- Un actor no puede editar, suspender, resetear contraseña o cambiar su propia administración mediante estas acciones.
- El correo de un usuario ya vinculado con Zoho no se cambia desde la edición administrativa.
- Activar/suspender y resetear contraseña temporal son operaciones restringidas a administración global.

## Países, equipos y catálogos

- `Country.code` es único, de 2–3 letras mayúsculas según Zod.
- `Country.name` tiene 2–80 caracteres.
- Un equipo pertenece a un país y su nombre es único dentro del país.
- Crear país o equipo requiere acceso administrativo global y genera `AuditLog`.

## Auditoría

- `AuditLog` registra actor opcional, entidad, ID, acción, metadata y fecha.
- La migración inicial instala un trigger PostgreSQL que rechaza UPDATE y DELETE de AuditLog.
- Mutaciones de actividades, países, equipos, usuarios, roles, permisos, overrides, credenciales y asignaciones escriben eventos según sus Server Actions.
- La auditoría de una actividad solo se entrega si el actor tiene `audit:read` en ese recurso.

## Notificaciones por correo

- Crear, editar, reasignar, cambiar estado, cancelar o comentar una actividad genera un solo correo por evento.
- El técnico o usuario afectado ocupa `to`; creador y supervisores ocupan `cc`, sin direcciones duplicadas.
- Un supervisor de actividad debe tener `activity:read` y además `activity:assign` o `team:manage` efectivos en el país/equipo. DENY y scope se respetan.
- Los cambios de acceso copian únicamente a administradores con `team:manage` efectivo para el alcance.
- Los correos con contraseñas temporales se envían solo al usuario afectado, nunca con CC, y la contraseña no se persiste en el outbox ni AuditLog.
- El correo es secundario: un fallo de Resend no revierte la mutación y queda sujeto a reintento cuando no contiene secretos.
- Las actividades activas programan recordatorios 24 horas y 1 hora antes; editar horario los recalcula y completar/cancelar los elimina.

## Validación y errores esperados

Las Server Actions distinguen normalmente:

- `VALIDATION`: entrada inválida.
- `UNAUTHORIZED`: no hay actor autenticado.
- `FORBIDDEN`: actor sin permiso, prioridad o scope.
- `NOT_FOUND`: entidad o referencia inexistente.
- `CONFLICT`: solapamiento o unicidad operativa.
- `RECURRENCE_LIMIT`: más de 60 ocurrencias.
- `UNEXPECTED`: fallo no clasificado.

No cambies estos rechazos por fallos silenciosos ni errores 500 genéricos.

## Archivos que debes leer

- `src/lib/access-policy.ts`
- `src/lib/login-attempts.ts`
- `src/lib/validations/`
- `src/lib/activities/schedule.ts`
- `src/app/actions/activities.ts`
- `src/app/actions/authorization.ts`
- `src/lib/authorization/`
- `prisma/schema.prisma`
- migraciones de `prisma/migrations/`

## Pendiente por confirmar

- Transiciones de estado permitidas más allá de la exclusión especial de CANCELLED.
- Política empresarial para editar una sola ocurrencia frente a toda la serie; el código actual edita una actividad individual.
- Reglas formales de disponibilidad/ausencias fuera de la prevención de solapamientos.

## Registro de tarea

- Estados: `IN_PROGRESS`, `COMPLETION_PENDING`, `COMPLETED`.
- Un técnico solo puede tener una jornada activa; el reinicio de inicio ocurre una sola vez dentro de dos minutos.
- El propietario es siempre el usuario autenticado. Un administrador puede editar únicamente un borrador ya notificado y eliminar registros solo con administración global.
- Completar exige cliente, modelo/serie, ubicación (catálogo o manual) y descripción. Al finalizar se congelan las horas.
- No se implementan horas extras en esta fase.
