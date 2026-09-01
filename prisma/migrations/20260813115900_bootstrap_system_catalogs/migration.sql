-- Bootstrap data required by later schema/data migrations and by a fresh
-- production database. This migration intentionally does not create users,
-- credentials, activities, or demo data.

INSERT INTO "Role" ("id", "key", "name", "description", "isSystem", "priority")
VALUES
  ('c000000000000000000000001', 'ADMIN', 'Administrador', 'Administración global de la operación.', true, 500),
  ('c000000000000000000000002', 'TECNICO', 'Técnico', 'Ejecución de actividades técnicas asignadas.', true, 200)
ON CONFLICT ("key") DO UPDATE
SET
  "name" = EXCLUDED."name",
  "description" = EXCLUDED."description",
  "isSystem" = EXCLUDED."isSystem",
  "priority" = EXCLUDED."priority";

INSERT INTO "Permission" ("id", "key", "label", "category")
VALUES
  ('c000000000000000000000011', 'activity:read', 'Consultar actividades', 'Actividades'),
  ('c000000000000000000000012', 'activity:create', 'Crear actividades', 'Actividades'),
  ('c000000000000000000000013', 'activity:update', 'Actualizar actividades', 'Actividades'),
  ('c000000000000000000000014', 'activity:assign', 'Asignar actividades', 'Actividades'),
  ('c000000000000000000000015', 'activity:comment', 'Comentar actividades', 'Actividades'),
  ('c000000000000000000000016', 'availability:read', 'Consultar disponibilidad', 'Disponibilidad'),
  ('c000000000000000000000017', 'availability:update', 'Actualizar disponibilidad', 'Disponibilidad'),
  ('c000000000000000000000018', 'catalog:manage', 'Gestionar catálogo', 'Administración'),
  ('c000000000000000000000019', 'team:manage', 'Gestionar usuarios y equipo', 'Administración'),
  ('c000000000000000000000020', 'audit:read', 'Consultar auditoría', 'Auditoría')
ON CONFLICT ("key") DO UPDATE
SET
  "label" = EXCLUDED."label",
  "category" = EXCLUDED."category";

INSERT INTO "RolePermission" ("id", "roleId", "permissionId")
SELECT 'c000000000000000000000031', role."id", permission."id"
FROM "Role" role, "Permission" permission
WHERE role."key" = 'ADMIN' AND permission."key" = 'activity:read'
ON CONFLICT ("roleId", "permissionId") DO NOTHING;

INSERT INTO "RolePermission" ("id", "roleId", "permissionId")
SELECT 'c000000000000000000000032', role."id", permission."id"
FROM "Role" role, "Permission" permission
WHERE role."key" = 'ADMIN' AND permission."key" = 'activity:create'
ON CONFLICT ("roleId", "permissionId") DO NOTHING;

INSERT INTO "RolePermission" ("id", "roleId", "permissionId")
SELECT 'c000000000000000000000033', role."id", permission."id"
FROM "Role" role, "Permission" permission
WHERE role."key" = 'ADMIN' AND permission."key" = 'activity:update'
ON CONFLICT ("roleId", "permissionId") DO NOTHING;

INSERT INTO "RolePermission" ("id", "roleId", "permissionId")
SELECT 'c000000000000000000000034', role."id", permission."id"
FROM "Role" role, "Permission" permission
WHERE role."key" = 'ADMIN' AND permission."key" = 'activity:assign'
ON CONFLICT ("roleId", "permissionId") DO NOTHING;

INSERT INTO "RolePermission" ("id", "roleId", "permissionId")
SELECT 'c000000000000000000000035', role."id", permission."id"
FROM "Role" role, "Permission" permission
WHERE role."key" = 'ADMIN' AND permission."key" = 'activity:comment'
ON CONFLICT ("roleId", "permissionId") DO NOTHING;

INSERT INTO "RolePermission" ("id", "roleId", "permissionId")
SELECT 'c000000000000000000000036', role."id", permission."id"
FROM "Role" role, "Permission" permission
WHERE role."key" = 'ADMIN' AND permission."key" = 'availability:read'
ON CONFLICT ("roleId", "permissionId") DO NOTHING;

INSERT INTO "RolePermission" ("id", "roleId", "permissionId")
SELECT 'c000000000000000000000037', role."id", permission."id"
FROM "Role" role, "Permission" permission
WHERE role."key" = 'ADMIN' AND permission."key" = 'availability:update'
ON CONFLICT ("roleId", "permissionId") DO NOTHING;

INSERT INTO "RolePermission" ("id", "roleId", "permissionId")
SELECT 'c000000000000000000000038', role."id", permission."id"
FROM "Role" role, "Permission" permission
WHERE role."key" = 'ADMIN' AND permission."key" = 'catalog:manage'
ON CONFLICT ("roleId", "permissionId") DO NOTHING;

INSERT INTO "RolePermission" ("id", "roleId", "permissionId")
SELECT 'c000000000000000000000039', role."id", permission."id"
FROM "Role" role, "Permission" permission
WHERE role."key" = 'ADMIN' AND permission."key" = 'team:manage'
ON CONFLICT ("roleId", "permissionId") DO NOTHING;

INSERT INTO "RolePermission" ("id", "roleId", "permissionId")
SELECT 'c000000000000000000000040', role."id", permission."id"
FROM "Role" role, "Permission" permission
WHERE role."key" = 'ADMIN' AND permission."key" = 'audit:read'
ON CONFLICT ("roleId", "permissionId") DO NOTHING;

INSERT INTO "RolePermission" ("id", "roleId", "permissionId")
SELECT 'c000000000000000000000041', role."id", permission."id"
FROM "Role" role, "Permission" permission
WHERE role."key" = 'TECNICO' AND permission."key" = 'activity:read'
ON CONFLICT ("roleId", "permissionId") DO NOTHING;

INSERT INTO "RolePermission" ("id", "roleId", "permissionId")
SELECT 'c000000000000000000000042', role."id", permission."id"
FROM "Role" role, "Permission" permission
WHERE role."key" = 'TECNICO' AND permission."key" = 'activity:update'
ON CONFLICT ("roleId", "permissionId") DO NOTHING;

INSERT INTO "RolePermission" ("id", "roleId", "permissionId")
SELECT 'c000000000000000000000043', role."id", permission."id"
FROM "Role" role, "Permission" permission
WHERE role."key" = 'TECNICO' AND permission."key" = 'activity:comment'
ON CONFLICT ("roleId", "permissionId") DO NOTHING;

INSERT INTO "RolePermission" ("id", "roleId", "permissionId")
SELECT 'c000000000000000000000044', role."id", permission."id"
FROM "Role" role, "Permission" permission
WHERE role."key" = 'TECNICO' AND permission."key" = 'availability:read'
ON CONFLICT ("roleId", "permissionId") DO NOTHING;

INSERT INTO "RolePermission" ("id", "roleId", "permissionId")
SELECT 'c000000000000000000000045', role."id", permission."id"
FROM "Role" role, "Permission" permission
WHERE role."key" = 'TECNICO' AND permission."key" = 'availability:update'
ON CONFLICT ("roleId", "permissionId") DO NOTHING;

INSERT INTO "Country" ("id", "code", "name")
VALUES
  ('c000000000000000000000051', 'PA', 'Panamá'),
  ('c000000000000000000000052', 'MX', 'México'),
  ('c000000000000000000000053', 'CR', 'Costa Rica')
ON CONFLICT ("code") DO UPDATE
SET "name" = EXCLUDED."name";

INSERT INTO "Team" ("id", "countryId", "name")
SELECT 'c000000000000000000000061', country."id", 'Soporte Técnico Panamá'
FROM "Country" country
WHERE country."code" = 'PA'
ON CONFLICT ("countryId", "name") DO NOTHING;

INSERT INTO "Team" ("id", "countryId", "name")
SELECT 'c000000000000000000000062', country."id", 'Servicios de Campo Panamá'
FROM "Country" country
WHERE country."code" = 'PA'
ON CONFLICT ("countryId", "name") DO NOTHING;

INSERT INTO "Team" ("id", "countryId", "name")
SELECT 'c000000000000000000000063', country."id", 'Soporte Técnico México'
FROM "Country" country
WHERE country."code" = 'MX'
ON CONFLICT ("countryId", "name") DO NOTHING;

INSERT INTO "Team" ("id", "countryId", "name")
SELECT 'c000000000000000000000064', country."id", 'Servicios de Campo México'
FROM "Country" country
WHERE country."code" = 'MX'
ON CONFLICT ("countryId", "name") DO NOTHING;

INSERT INTO "Team" ("id", "countryId", "name")
SELECT 'c000000000000000000000065', country."id", 'Soporte Técnico Costa Rica'
FROM "Country" country
WHERE country."code" = 'CR'
ON CONFLICT ("countryId", "name") DO NOTHING;

INSERT INTO "ActivityType" ("id", "code", "name", "color", "sortOrder", "isActive")
VALUES
  ('c000000000000000000000071', 'PREVENTIVE_MAINTENANCE', 'Mantenimiento preventivo', '#3B82F6', 10, true),
  ('c000000000000000000000072', 'CORRECTIVE_MAINTENANCE', 'Mantenimiento correctivo', '#F59E0B', 20, true),
  ('c000000000000000000000073', 'SITE_VISIT', 'Visita técnica', '#34B27B', 30, true),
  ('c000000000000000000000074', 'TEAM_MEETING', 'Reunión de equipo', '#A855F7', 40, true),
  ('c000000000000000000000075', 'EQUIPMENT_DELIVERY', 'Entrega de Equipo', '#0EA5E9', 50, true)
ON CONFLICT ("code") DO UPDATE
SET
  "name" = EXCLUDED."name",
  "color" = EXCLUDED."color",
  "sortOrder" = EXCLUDED."sortOrder",
  "isActive" = EXCLUDED."isActive";

INSERT INTO "ActivityStatus" ("id", "code", "name", "color", "sortOrder", "isActive")
VALUES
  ('c000000000000000000000081', 'PLANNED', 'Planificada', '#3B82F6', 10, true),
  ('c000000000000000000000082', 'IN_PROGRESS', 'En progreso', '#F59E0B', 20, true),
  ('c000000000000000000000083', 'COMPLETED', 'Completada', '#34B27B', 30, true),
  ('c000000000000000000000084', 'BLOCKED', 'Bloqueada', '#EF4444', 40, true),
  ('c000000000000000000000085', 'CANCELLED', 'Cancelada', '#64748B', 50, true)
ON CONFLICT ("code") DO UPDATE
SET
  "name" = EXCLUDED."name",
  "color" = EXCLUDED."color",
  "sortOrder" = EXCLUDED."sortOrder",
  "isActive" = EXCLUDED."isActive";

INSERT INTO "Priority" ("id", "code", "name", "level", "color", "sortOrder", "isActive")
VALUES
  ('c000000000000000000000091', 'LOW', 'Baja', 10, '#64748B', 10, true),
  ('c000000000000000000000092', 'MEDIUM', 'Media', 20, '#3B82F6', 20, true),
  ('c000000000000000000000093', 'HIGH', 'Alta', 30, '#F59E0B', 30, true),
  ('c000000000000000000000094', 'CRITICAL', 'Crítica', 40, '#DC2626', 40, true)
ON CONFLICT ("code") DO UPDATE
SET
  "name" = EXCLUDED."name",
  "level" = EXCLUDED."level",
  "color" = EXCLUDED."color",
  "sortOrder" = EXCLUDED."sortOrder",
  "isActive" = EXCLUDED."isActive";
