export const seedRoles = [
  {
    key: "ADMIN",
    name: "Administrador",
    description: "Administración global de la operación.",
    isSystem: true,
    priority: 500,
  },
  {
    key: "TECNICO",
    name: "Técnico",
    description: "Ejecución de actividades técnicas asignadas.",
    isSystem: true,
    priority: 200,
  },
] as const;

export const seedPermissions = [
  { key: "activity:read", label: "Consultar actividades", category: "Actividades" },
  { key: "activity:create", label: "Crear actividades", category: "Actividades" },
  { key: "activity:update", label: "Actualizar actividades", category: "Actividades" },
  { key: "activity:assign", label: "Asignar actividades", category: "Actividades" },
  { key: "activity:comment", label: "Comentar actividades", category: "Actividades" },
  { key: "availability:read", label: "Consultar disponibilidad", category: "Disponibilidad" },
  { key: "availability:update", label: "Actualizar disponibilidad", category: "Disponibilidad" },
  { key: "catalog:manage", label: "Gestionar catálogo", category: "Administración" },
  { key: "team:manage", label: "Gestionar usuarios y equipo", category: "Administración" },
  { key: "audit:read", label: "Consultar auditoría", category: "Auditoría" },
  { key: "worklog:read", label: "Consultar registros de tarea", category: "Registro de tarea" },
  { key: "worklog:create", label: "Iniciar registros de tarea", category: "Registro de tarea" },
  { key: "worklog:update", label: "Actualizar registros de tarea", category: "Registro de tarea" },
  { key: "worklog:finish", label: "Marcar finalización de registros", category: "Registro de tarea" },
  { key: "worklog:complete", label: "Completar registros de tarea", category: "Registro de tarea" },
  { key: "worklog:admin-update", label: "Editar borradores de registros", category: "Registro de tarea" },
  { key: "worklog:delete", label: "Eliminar registros de tarea", category: "Registro de tarea" },
] as const;

export const seedRolePermissions = {
  ADMIN: seedPermissions.map(({ key }) => key),
  TECNICO: [
    "activity:read",
    "activity:update",
    "activity:comment",
    "availability:read",
    "availability:update",
    "worklog:read",
    "worklog:create",
    "worklog:update",
    "worklog:finish",
    "worklog:complete",
  ],
} as const;

export const seedCountries = [
  { code: "PA", name: "Panamá" },
  { code: "MX", name: "México" },
  { code: "CR", name: "Costa Rica" },
] as const;

export const seedTeams = [
  { countryCode: "PA", name: "Soporte Técnico Panamá" },
  { countryCode: "PA", name: "Servicios de Campo Panamá" },
  { countryCode: "MX", name: "Soporte Técnico México" },
  { countryCode: "MX", name: "Servicios de Campo México" },
  { countryCode: "CR", name: "Soporte Técnico Costa Rica" },
] as const;

export const seedAdminUser = {
  email: "admin.demo@combilift.test",
  name: "Administrador Demo",
  accessStatus: "ACTIVE",
  roleKey: "ADMIN",
  scopeType: "GLOBAL",
  passwordEnvironmentVariable: "SEED_ADMIN_PASSWORD",
} as const;

export const seedActivityTypes = [
  { code: "PREVENTIVE_MAINTENANCE", name: "Mantenimiento preventivo", color: "#3B82F6", sortOrder: 10 },
  { code: "CORRECTIVE_MAINTENANCE", name: "Mantenimiento correctivo", color: "#F59E0B", sortOrder: 20 },
  { code: "SITE_VISIT", name: "Visita técnica", color: "#34B27B", sortOrder: 30 },
  { code: "TEAM_MEETING", name: "Reunión de equipo", color: "#A855F7", sortOrder: 40 },
  { code: "EQUIPMENT_DELIVERY", name: "Entrega de Equipo", color: "#0EA5E9", sortOrder: 50 },
] as const;

export const seedActivityStatuses = [
  { code: "PLANNED", name: "Planificada", color: "#3B82F6", sortOrder: 10 },
  { code: "IN_PROGRESS", name: "En progreso", color: "#F59E0B", sortOrder: 20 },
  { code: "COMPLETED", name: "Completada", color: "#34B27B", sortOrder: 30 },
  { code: "BLOCKED", name: "Bloqueada", color: "#EF4444", sortOrder: 40 },
  { code: "CANCELLED", name: "Cancelada", color: "#64748B", sortOrder: 50 },
] as const;

export const seedPriorities = [
  { code: "LOW", name: "Baja", level: 10, color: "#64748B", sortOrder: 10 },
  { code: "MEDIUM", name: "Media", level: 20, color: "#3B82F6", sortOrder: 20 },
  { code: "HIGH", name: "Alta", level: 30, color: "#F59E0B", sortOrder: 30 },
  { code: "CRITICAL", name: "Crítica", level: 40, color: "#DC2626", sortOrder: 40 },
] as const;
