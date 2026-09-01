# Contexto del proyecto

## Qué es Calendar

**Calendar** es una aplicación web interna de planificación operativa para **Soporte Técnico LATAM**. Centraliza la agenda del equipo, actividades técnicas, asignación de responsables, calendario, disponibilidad básica y administración de acceso territorial.

La descripción está respaldada por la metadata de `src/messages/common.ts`, la navegación de `src/components/layout/app-shell.tsx`, las rutas de `src/app/` y los modelos de `prisma/schema.prisma`.

## Problema que resuelve

El sistema busca evitar que la coordinación operativa dependa de agendas dispersas o de asignaciones sin trazabilidad. Proporciona:

- una vista común de trabajo planificado, en progreso, completado o bloqueado;
- coordinación por país, equipo y técnico;
- detección de conflictos de horario para técnicos;
- creación de series recurrentes;
- comentarios internos y auditoría asociada a actividades;
- control de acceso por roles dinámicos, permisos y alcance;
- administración de usuarios locales o vinculables con Zoho.

## Usuarios principales

Los roles seed describen cinco perfiles iniciales, pero el sistema permite roles personalizados. Las capacidades deben deducirse de permisos efectivos, no del nombre:

- **Administrador:** configuración global, catálogo, usuarios y autorización.
- **Líder:** liderazgo operativo y gestión acotada por scope.
- **Coordinador:** planificación, asignación y disponibilidad dentro de su scope.
- **Técnico:** ejecución y actualización de actividades permitidas.
- **Auditor:** consulta de operación y trazabilidad.

Consulta [`PERMISSIONS.md`](PERMISSIONS.md) para la matriz exacta y las restricciones de prioridad.

## Contexto territorial

El modelo organiza la operación así:

```text
País
└── Equipo
    ├── Usuarios con asignaciones de rol
    └── Actividades
```

El seed actual crea Panamá, México y Costa Rica con equipos técnicos de ejemplo. Son datos reproducibles de entorno, no una afirmación sobre la configuración definitiva de producción.

## Módulos visibles

| Ruta | Módulo | Propósito |
|---|---|---|
| `/` | Entrada | Redirige a `/dashboard`. |
| `/dashboard` | Agenda | Resumen operativo, filtros, lista/Kanban y acciones de actividad. |
| `/activities` | Actividades | Consulta, creación, edición, estados, comentarios y auditoría. |
| `/activities/[activityId]` | Acceso directo | Valida lectura por scope y redirige al detalle o responde 403/404 HTML. |
| `/calendar` | Calendario | Vistas mensual, semanal y por técnico sobre actividades reales. |
| `/team` | Equipo y accesos | Usuarios, estado, roles, alcance, permisos efectivos y overrides. |
| `/settings` | Administración | Países, equipos, usuarios resumidos y matriz de roles/permisos. |
| `/login` | Autenticación | Inicio con Zoho o credenciales locales. |
| `/access-pending` | Estado de acceso | Espera de activación o asignación válida. |
| `/change-password` | Seguridad local | Cambio obligatorio de contraseña temporal. |

`/e2e-action-probe` existe en el código como superficie técnica protegida y no aparece en la navegación de producto. No debe tratarse como módulo de negocio.

## Flujo general

```text
/login
  ├─ Zoho OAuth
  └─ Credenciales locales
        ↓
NextAuth emite JWT y consulta estado persistido
        ↓
PENDING ─────────────→ /access-pending
ACTIVE + contraseña temporal → /change-password
ACTIVE + rol válido ─→ /dashboard y AppShell
SUSPENDED/DENIED ────→ /login
        ↓
Rutas protegidas cargan datos filtrados por permisos y scope
        ↓
Mutaciones usan Server Actions + Zod + autorización + Prisma + AuditLog
```

## Módulos transversales

- **Autenticación y sesión:** NextAuth con JWT, Zoho y credenciales.
- **Autorización:** roles persistidos, permisos, scopes y overrides.
- **Auditoría:** `AuditLog` append-only; hay una pestaña de auditoría en el detalle de actividad.
- **Diseño:** tokens neutros, marca `#34B27B`, temas claro/oscuro y componentes ShadCN/Base UI.
- **Persistencia:** MySQL/MariaDB de Control Horario IMADA mediante Prisma y `@prisma/adapter-mariadb`; las tablas nuevas de Calendar usan el prefijo `calendar_`.

## Límites confirmados del producto actual

- No hay flujo de invitación: Administración crea usuarios directamente.
- No hay una bandeja global de auditoría en `/settings` o `/team`.
- `Notification` conserva la futura bandeja in-app. `EmailNotification` implementa un outbox Resend durable y `ActivityReminder` programa avisos por correo; no hay bandeja visible.
- `Availability` existe y se consulta en Equipo; no se observa un flujo completo de creación/edición de ausencias en la navegación actual.
- La UI de comentarios está integrada en el detalle de actividad, no como módulo independiente.
- No existe `README.md` en el repositorio auditado.
- Las carpetas `e2e/` y `scripts/` fueron eliminadas; algunos scripts de `package.json` conservan referencias residuales.

## Archivos que debes leer

- `src/messages/common.ts`
- `src/components/layout/app-shell.tsx`
- `src/app/(app)/`
- `src/features/`
- `src/lib/auth.ts`
- `src/lib/permissions.ts`
- `prisma/schema.prisma`
- [`MODULES.md`](MODULES.md)
- [`BUSINESS_RULES.md`](BUSINESS_RULES.md)

## Pendiente por confirmar

- Nombre y responsabilidades del propietario de negocio.
- Países, equipos y volumen de usuarios definitivos de producción.
- SLA, horarios de soporte y métricas operativas oficiales.
- Preferencias configurables por usuario y alcance futuro de ausencias.
