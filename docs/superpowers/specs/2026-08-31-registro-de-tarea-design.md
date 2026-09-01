# Registro de tarea - Diseño aprobado

## Objetivo

Integrar en Calendar un módulo mobile-first para registrar jornadas reales de técnicos, documentar el trabajo realizado, adjuntar evidencias y consultar/exportar el historial.

## Arquitectura y sincronización

Calendar seguirá siendo un monolito Next.js con Server Components para lectura, Server Actions para mutaciones, Prisma/PostgreSQL para persistencia y el RBAC dinámico existente. `Activity` representa trabajo planificado y `WorkLog` representa trabajo ejecutado.

El vínculo entre ambos es opcional y 1:1 mediante `Activity.workLog`. Crear desde una actividad precarga cliente y scope; Registro de tarea también permite jornadas no planificadas. El inicio, finalización y completado del registro no cambian silenciosamente el estado de la actividad. Después de cada operación se ofrecerán acciones explícitas y autorizadas para marcar la actividad como `IN_PROGRESS` o `COMPLETED`. Si una actividad se elimina, el registro histórico queda conservado y desvinculado.

## Ciclo de vida

- `IN_PROGRESS`: jornada abierta; el técnico puede editar datos y adjuntos.
- `COMPLETION_PENDING`: la hora de finalización y duración están congeladas; el técnico puede completar datos faltantes.
- `COMPLETED`: jornada cerrada, solo lectura y sin `activeKey`.

El servidor captura siempre las horas en UTC. Cada registro guarda la zona horaria del técnico y `workDate` representa la fecha local de la jornada. Las zonas iniciales son `America/Panama` y `Europe/Madrid`. Solo existe una jornada activa por técnico mediante `activeKey` única nullable. El reinicio de inicio es opcional, único y válido durante los dos minutos posteriores al inicio. No se implementan pausas ni horas extras.

El primer guardado de borrador registra `draftNotifiedAt` y encola un único correo con PDF. `finishWorkLog` captura la hora de finalización del servidor y pasa a `COMPLETION_PENDING`. `completeWorkLog` exige cliente, modelo/serie, descripción y referencias válidas; libera la jornada, registra `completedAt` y encola el correo final.

## Datos y autorización

`WorkLog` guarda `userId`, `countryId`, `teamId`, `customerId`, `customerLocationId`, `activityId`, referencias de máquina, descripción, horas, duración, estado y claves de importación legacy. Los registros enlazados heredan el scope de la actividad; los no planificados requieren seleccionar un scope permitido antes de iniciar.

Se añadirán los permisos dinámicos `worklog:read`, `worklog:create`, `worklog:update`, `worklog:finish`, `worklog:complete`, `worklog:admin-update` y `worklog:delete`. La UI refleja capacidades efectivas, pero cada lectura y mutación recalcula actor, recurso, scope y permisos en servidor. Las mutaciones sensibles escriben `AuditLog` dentro de la misma transacción. La eliminación destructiva de registros requiere administración global. La edición administrativa solo aplica a borradores notificados.

Clientes tendrán ubicaciones activas con unicidad por cliente/nombre. Los clientes con registros no se eliminan; se desactivan y el hard delete devuelve `CONFLICT`.

## Adjuntos, correo y exportación

Los adjuntos se crean temporalmente, se suben directamente a Cloudflare R2 mediante URL prefirmada y se vinculan después de verificar propietario, existencia, MIME y tamaño. El límite es de cinco archivos y 100 MB por archivo. Se aceptan JPEG, PNG, WEBP, HEIC, MP4, MOV y WEBM.

El outbox `EmailNotification` existente se amplía con eventos de borrador, registro final y actualización administrativa. Los binarios no se guardan en PostgreSQL. El PDF Letter se genera en servidor con horas locales, zona, duración, descripción, imágenes y enlaces de vídeo. El historial y la exportación Excel usan el mismo read model y respetan exactamente el scope y los filtros.

## UI/UX

La navegación añadirá Registro de tarea. El formulario usará `PageHeader`, `FormSection`, `ResponsiveSheet`, `FormActions`, ShadCN y estados accesibles. En móvil será una experiencia vertical con CTA persistente; los filtros se abrirán en Drawer y el historial será de tarjetas. En tablet habrá grids deliberados de dos columnas; escritorio usará vista densa. Se verificarán 320 px, menos de 640 px, 640-1024 px y más de 1024 px en ambos temas, sin overflow horizontal.

## Migración

La importación consumirá un dump SQL del legado, un manifest de objetos R2 y un mapeo explícito de país/equipo. Será idempotente mediante `legacySource`/`legacyId`, generará reportes de filas no mapeadas y no modificará datos existentes durante `--dry-run`. Los usuarios no coincidentes se crearán como `PENDING` sin credencial. El flujo legacy de horas extras queda fuera de esta integración.

## Criterios de aceptación

Se deben probar inicio server-side, jornada única, reinicio único, borradores, adjuntos, finalización inmutable, completado validado, correos/PDF sin duplicados, permisos GLOBAL/COUNTRY/TEAM con GRANT/DENY, IDOR, edición administrativa, zonas Panamá/Madrid, historial/filtros/Excel, eliminación segura, importación repetible y UI responsive accesible.
