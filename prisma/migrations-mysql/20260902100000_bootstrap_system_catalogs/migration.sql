-- Bootstrap the Calendar catalogs without creating demo users.
-- This migration is intentionally idempotent so it can safely initialize a
-- legacy database that already contains the Calendar tables but no catalogs.

INSERT INTO `calendar_roles` (`id`, `key`, `name`, `description`, `isSystem`, `priority`)
VALUES
  ('role_calendar_admin_2026', 'ADMIN', 'Administrador', 'Administración global de la operación.', true, 500),
  ('role_calendar_tech_2026', 'TECNICO', 'Técnico', 'Ejecución de actividades técnicas asignadas.', true, 200)
ON DUPLICATE KEY UPDATE
  `name` = VALUES(`name`),
  `description` = VALUES(`description`),
  `isSystem` = VALUES(`isSystem`),
  `priority` = VALUES(`priority`);

INSERT INTO `calendar_permissions` (`id`, `key`, `label`, `category`)
VALUES
  ('perm_activity_read_2026', 'activity:read', 'Consultar actividades', 'Actividades'),
  ('perm_activity_create_2026', 'activity:create', 'Crear actividades', 'Actividades'),
  ('perm_activity_update_2026', 'activity:update', 'Actualizar actividades', 'Actividades'),
  ('perm_activity_assign_2026', 'activity:assign', 'Asignar actividades', 'Actividades'),
  ('perm_activity_comment_2026', 'activity:comment', 'Comentar actividades', 'Actividades'),
  ('perm_availability_read_2026', 'availability:read', 'Consultar disponibilidad', 'Disponibilidad'),
  ('perm_availability_update_2026', 'availability:update', 'Actualizar disponibilidad', 'Disponibilidad'),
  ('perm_catalog_manage_2026', 'catalog:manage', 'Gestionar catálogo', 'Administración'),
  ('perm_team_manage_2026', 'team:manage', 'Gestionar usuarios y equipo', 'Administración'),
  ('perm_audit_read_2026', 'audit:read', 'Consultar auditoría', 'Auditoría'),
  ('perm_worklog_read_2026', 'worklog:read', 'Consultar registros de tarea', 'Registro de tarea'),
  ('perm_worklog_create_2026', 'worklog:create', 'Iniciar registros de tarea', 'Registro de tarea'),
  ('perm_worklog_update_2026', 'worklog:update', 'Actualizar registros de tarea', 'Registro de tarea'),
  ('perm_worklog_finish_2026', 'worklog:finish', 'Marcar finalización de registros', 'Registro de tarea'),
  ('perm_worklog_complete_2026', 'worklog:complete', 'Completar registros de tarea', 'Registro de tarea'),
  ('perm_worklog_admin_update_2026', 'worklog:admin-update', 'Editar borradores de registros', 'Registro de tarea'),
  ('perm_worklog_delete_2026', 'worklog:delete', 'Eliminar registros de tarea', 'Registro de tarea')
ON DUPLICATE KEY UPDATE
  `label` = VALUES(`label`),
  `category` = VALUES(`category`);

INSERT IGNORE INTO `calendar_role_permissions` (`id`, `roleId`, `permissionId`)
SELECT CONCAT('rp_admin_', REPLACE(`permission`.`key`, ':', '_')), `role`.`id`, `permission`.`id`
FROM `calendar_roles` AS `role`
CROSS JOIN `calendar_permissions` AS `permission`
WHERE `role`.`key` = 'ADMIN';

INSERT IGNORE INTO `calendar_role_permissions` (`id`, `roleId`, `permissionId`)
SELECT CONCAT('rp_tech_', REPLACE(`permission`.`key`, ':', '_')), `role`.`id`, `permission`.`id`
FROM `calendar_roles` AS `role`
CROSS JOIN `calendar_permissions` AS `permission`
WHERE `role`.`key` = 'TECNICO'
  AND `permission`.`key` IN (
    'activity:read',
    'activity:update',
    'activity:comment',
    'availability:read',
    'availability:update',
    'worklog:read',
    'worklog:create',
    'worklog:update',
    'worklog:finish',
    'worklog:complete'
  );

INSERT INTO `calendar_countries` (`id`, `code`, `name`)
VALUES
  ('country_calendar_pa_2026', 'PA', 'Panamá'),
  ('country_calendar_mx_2026', 'MX', 'México'),
  ('country_calendar_cr_2026', 'CR', 'Costa Rica')
ON DUPLICATE KEY UPDATE `name` = VALUES(`name`);

INSERT INTO `calendar_teams` (`id`, `name`, `countryId`)
SELECT 'team_calendar_pa_support_2026', 'Soporte Técnico Panamá', `id`
FROM `calendar_countries` WHERE `code` = 'PA'
ON DUPLICATE KEY UPDATE `name` = VALUES(`name`), `countryId` = VALUES(`countryId`);

INSERT INTO `calendar_teams` (`id`, `name`, `countryId`)
SELECT 'team_calendar_pa_field_2026', 'Servicios de Campo Panamá', `id`
FROM `calendar_countries` WHERE `code` = 'PA'
ON DUPLICATE KEY UPDATE `name` = VALUES(`name`), `countryId` = VALUES(`countryId`);

INSERT INTO `calendar_teams` (`id`, `name`, `countryId`)
SELECT 'team_calendar_mx_support_2026', 'Soporte Técnico México', `id`
FROM `calendar_countries` WHERE `code` = 'MX'
ON DUPLICATE KEY UPDATE `name` = VALUES(`name`), `countryId` = VALUES(`countryId`);

INSERT INTO `calendar_teams` (`id`, `name`, `countryId`)
SELECT 'team_calendar_mx_field_2026', 'Servicios de Campo México', `id`
FROM `calendar_countries` WHERE `code` = 'MX'
ON DUPLICATE KEY UPDATE `name` = VALUES(`name`), `countryId` = VALUES(`countryId`);

INSERT INTO `calendar_teams` (`id`, `name`, `countryId`)
SELECT 'team_calendar_cr_support_2026', 'Soporte Técnico Costa Rica', `id`
FROM `calendar_countries` WHERE `code` = 'CR'
ON DUPLICATE KEY UPDATE `name` = VALUES(`name`), `countryId` = VALUES(`countryId`);

INSERT INTO `calendar_activity_types` (`id`, `code`, `name`, `color`, `sortOrder`, `isActive`)
VALUES
  ('activity_type_preventive_2026', 'PREVENTIVE_MAINTENANCE', 'Mantenimiento preventivo', '#3B82F6', 10, true),
  ('activity_type_corrective_2026', 'CORRECTIVE_MAINTENANCE', 'Mantenimiento correctivo', '#F59E0B', 20, true),
  ('activity_type_site_visit_2026', 'SITE_VISIT', 'Visita técnica', '#34B27B', 30, true),
  ('activity_type_meeting_2026', 'TEAM_MEETING', 'Reunión de equipo', '#A855F7', 40, true),
  ('activity_type_delivery_2026', 'EQUIPMENT_DELIVERY', 'Entrega de Equipo', '#0EA5E9', 50, true)
ON DUPLICATE KEY UPDATE
  `name` = VALUES(`name`), `color` = VALUES(`color`), `sortOrder` = VALUES(`sortOrder`),
  `isActive` = VALUES(`isActive`);

INSERT INTO `calendar_activity_statuses` (`id`, `code`, `name`, `color`, `sortOrder`, `isActive`)
VALUES
  ('activity_status_planned_2026', 'PLANNED', 'Planificada', '#3B82F6', 10, true),
  ('activity_status_progress_2026', 'IN_PROGRESS', 'En progreso', '#F59E0B', 20, true),
  ('activity_status_completed_2026', 'COMPLETED', 'Completada', '#34B27B', 30, true),
  ('activity_status_blocked_2026', 'BLOCKED', 'Bloqueada', '#EF4444', 40, true),
  ('activity_status_cancelled_2026', 'CANCELLED', 'Cancelada', '#64748B', 50, true)
ON DUPLICATE KEY UPDATE
  `name` = VALUES(`name`), `color` = VALUES(`color`), `sortOrder` = VALUES(`sortOrder`),
  `isActive` = VALUES(`isActive`);

INSERT INTO `calendar_priorities` (`id`, `code`, `name`, `level`, `color`, `sortOrder`, `isActive`)
VALUES
  ('priority_low_2026', 'LOW', 'Baja', 10, '#64748B', 10, true),
  ('priority_medium_2026', 'MEDIUM', 'Media', 20, '#3B82F6', 20, true),
  ('priority_high_2026', 'HIGH', 'Alta', 30, '#F59E0B', 30, true),
  ('priority_critical_2026', 'CRITICAL', 'Crítica', 40, '#DC2626', 40, true)
ON DUPLICATE KEY UPDATE
  `name` = VALUES(`name`), `color` = VALUES(`color`), `sortOrder` = VALUES(`sortOrder`),
  `isActive` = VALUES(`isActive`);

-- Existing active users without any role receive the default technician role.
-- Pending users are intentionally not activated by this migration.
INSERT IGNORE INTO `calendar_user_role_assignments`
  (`id`, `userId`, `roleId`, `scopeType`, `scopeKey`, `createdAt`, `createdById`)
SELECT CONCAT('ura_bootstrap_', `user`.`id`), `user`.`id`, `role`.`id`, 'GLOBAL', 'GLOBAL', NOW(3), `user`.`id`
FROM `calendar_users` AS `user`
CROSS JOIN `calendar_roles` AS `role`
WHERE `user`.`accessStatus` = 'ACTIVE'
  AND `role`.`key` = 'TECNICO'
  AND NOT EXISTS (
    SELECT 1
    FROM `calendar_user_role_assignments` AS `existing`
    WHERE `existing`.`userId` = `user`.`id`
  );
