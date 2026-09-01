-- Keep existing environments in sync when the work-log module is deployed
-- without requiring a separate seed run.

INSERT INTO "Permission" ("id", "key", "label", "category")
VALUES
  ('c00000000000000000000101', 'worklog:read', 'Consultar registros de tarea', 'Registro de tarea'),
  ('c00000000000000000000102', 'worklog:create', 'Iniciar registros de tarea', 'Registro de tarea'),
  ('c00000000000000000000103', 'worklog:update', 'Actualizar registros de tarea', 'Registro de tarea'),
  ('c00000000000000000000104', 'worklog:finish', 'Marcar finalización de registros', 'Registro de tarea'),
  ('c00000000000000000000105', 'worklog:complete', 'Completar registros de tarea', 'Registro de tarea'),
  ('c00000000000000000000106', 'worklog:admin-update', 'Editar borradores de registros', 'Registro de tarea'),
  ('c00000000000000000000107', 'worklog:delete', 'Eliminar registros de tarea', 'Registro de tarea')
ON CONFLICT ("key") DO UPDATE
SET
  "label" = EXCLUDED."label",
  "category" = EXCLUDED."category";

INSERT INTO "RolePermission" ("id", "roleId", "permissionId")
SELECT
  'c000000000000000000002' || right(permission."id", 3),
  role."id",
  permission."id"
FROM "Role" role
JOIN "Permission" permission ON permission."key" IN (
  'worklog:read',
  'worklog:create',
  'worklog:update',
  'worklog:finish',
  'worklog:complete',
  'worklog:admin-update',
  'worklog:delete'
)
WHERE role."key" = 'ADMIN'
ON CONFLICT ("roleId", "permissionId") DO NOTHING;

INSERT INTO "RolePermission" ("id", "roleId", "permissionId")
SELECT
  'c000000000000000000003' || right(permission."id", 3),
  role."id",
  permission."id"
FROM "Role" role
JOIN "Permission" permission ON permission."key" IN (
  'worklog:read',
  'worklog:create',
  'worklog:update',
  'worklog:finish',
  'worklog:complete'
)
WHERE role."key" = 'TECNICO'
ON CONFLICT ("roleId", "permissionId") DO NOTHING;
