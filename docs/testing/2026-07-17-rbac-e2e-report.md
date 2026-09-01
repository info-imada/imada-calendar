# Reporte E2E real de roles, permisos y scopes

Fecha de ejecución: 17 de julio de 2026

Runner: Playwright 1.61.1, Chromium Desktop, un worker

Aplicación: Next.js levantada en `http://localhost:3100` con `E2E_TEST_MODE=1`

Base: PostgreSQL/Neon dedicada `calendar_e2e`; nunca se utilizó la base de desarrollo

## 1. Especificación previa y alcance

La expectativa normativa se congeló antes de crear los specs en [2026-07-17-rbac-e2e-matrix-design.md](../superpowers/specs/2026-07-17-rbac-e2e-matrix-design.md), commit `72d1ba9`. Contiene:

- 109 filas de rutas: 12 actores sobre 9 rutas, más el escenario específico A13 en `/team`.
- 6 casos IDOR por URL o Server Action.
- 1 caso de suspensión en caliente.
- 1 escenario de último administrador global crítico.
- Total normativo: 117 escenarios.

Se ejecutó al menos una aserción real de URL, DOM, respuesta de Server Action o estado persistido para los 117 escenarios: **117 ejecutados, 0 completamente sin ejecutar**. Varias filas de ruta incluyen más de una aserción. Esto no significa que se haya invocado cada permutación imaginable de cada acción permitida; las mutaciones profundas se concentraron en IDOR, overrides, controles de actividad y último administrador.

## 2. Datos reales y aislamiento

El setup está implementado en:

- [create-e2e-database.ts](../../scripts/create-e2e-database.ts): deriva y crea la base dedicada, y rechaza continuar si coincide con la URL de desarrollo.
- [seed-e2e.ts](../../scripts/seed-e2e.ts): limpia únicamente la base E2E y crea los fixtures determinísticos.
- [catalog.ts](../../e2e/fixtures/catalog.ts): IDs CUID válidos, actores, scopes, actividades y credenciales conocidas.
- [global-setup.ts](../../e2e/global-setup.ts): crea la base, aplica `prisma migrate deploy` y ejecuta el seed antes de Playwright.
- [e2e-environment.ts](../../e2e/support/e2e-environment.ts): guardas de entorno y URL.

El seed persiste:

- Panamá y Costa Rica.
- PA1 Soporte Panamá, PA2 Campo Panamá, CR1 Soporte Costa Rica y CR2 Campo Costa Rica.
- A1–A13, con estados ACTIVE/PENDING/SUSPENDED y credenciales bcrypt reales.
- ADMIN 500, LIDER 400, COORDINADOR 300, PLANIFICADOR personalizado 250, TECNICO 200 y AUDITOR 100.
- Cuatro actividades, una por equipo, con responsables/creadores distintos.
- A7 con override `DENY activity:update` en Panamá.
- A8 con override `GRANT activity:create` en PA2.

La prueba [seed-contract.spec.ts](../../e2e/specs/seed-contract.spec.ts) validó el fixture contra Prisma y aprobó.

## 3. Ejecución

Comando final:

```text
pnpm exec playwright test
```

Resultado verificable:

- 46 tests Playwright.
- 25 aprobados.
- 21 fallidos por discrepancias entre la matriz y el producto.
- Duración: 609,998 ms (10.2 minutos).
- 22 screenshots, 21 traces y 20 videos retenidos.
- Las 4 migraciones Prisma estaban aplicadas y no había migraciones pendientes.

Los dos falsos negativos del harness detectados en la primera corrida fueron aislados y corregidos: el selector de alert de A10 ya no colisiona con `__next-route-announcer__`, y el flujo A11 se valida por texto porque `CardTitle` no expone un heading semántico. La reejecución focalizada dio 2/2 aprobadas y la corrida completa final confirmó ambos casos.

## 4. Tabla final de discrepancias y coincidencias

Cada “Sí” de esta tabla proviene de aserciones Playwright/Prisma reales. Las filas agrupan actores solo cuando compartieron exactamente la misma expectativa y observación.

| Ruta | Actor | Esperado (Paso 1) | Observado (Paso 3) | ¿Coincide? | Severidad si no coincide |
|---|---|---|---|---|---|
| `/login` | A1–A8, A12, A13 | Credenciales válidas → `/dashboard` | Login real completado; heading de Agenda visible | Sí | — |
| `/login` | A9 PENDING | Crear sesión limitada → `/access-pending` | El provider de credenciales rechaza la sesión y permanece en `/login` | No | MEDIA |
| `/login` | A10 SUSPENDED | Rechazar sesión y permanecer en `/login` | Sesión rechazada con error genérico; acceso directo protegido vuelve a login | Sí | — |
| `/login` | A11 MUST-CHANGE | Login → `/change-password` | Login real redirige a `/change-password`; las rutas protegidas no se abren | Sí | — |
| `/` | A1–A3, A6–A8, A12 | → `/dashboard`, datos limitados por scope y controles según permiso | Redirección y títulos de actividades coinciden con GLOBAL/COUNTRY/TEAM | Sí | — |
| `/` | A4 TEC-PA1 | Agenda PA1 sin crear/asignar | Scope correcto, pero “Nueva actividad” está visible | No | ALTA |
| `/` | A5 AUDITOR | Agenda global de solo lectura | Scope global correcto, pero “Nueva actividad” está visible | No | ALTA |
| `/` | A9 PENDING | → `/access-pending` | → `/login?callbackUrl=%2F` por inexistencia de sesión limitada | No | MEDIA |
| `/` | A10 SUSPENDED | → `/login` | → `/login` | Sí | — |
| `/` | A11 MUST-CHANGE | → `/change-password` | → `/change-password` | Sí | — |
| `/dashboard` | A1–A3, A6–A8, A12 | Datos visibles conforme a GLOBAL/COUNTRY/TEAM; creación según permiso | Todos los títulos propios aparecieron y los ajenos estuvieron ausentes; A8 creó por GRANT | Sí | — |
| `/dashboard` | A4 TEC-PA1 | PA1 sin crear | Datos PA1 correctos; botón “Nueva actividad” visible | No | ALTA |
| `/dashboard` | A5 AUDITOR | Global solo lectura | Datos globales correctos; botón “Nueva actividad” visible | No | ALTA |
| `/dashboard` | A9 PENDING | → `/access-pending` | → `/login?callbackUrl=%2Fdashboard` | No | MEDIA |
| `/dashboard` | A10 SUSPENDED | → `/login` | → `/login` al iniciar sin sesión | Sí | — |
| `/dashboard` | A11 MUST-CHANGE | → `/change-password` | → `/change-password` | Sí | — |
| `/activities` | A1–A3, A8, A12 | Datos y creación conforme a permiso/scope | Datos propios visibles, ajenos ausentes; controles esperados presentes | Sí | — |
| `/activities` | A4 TEC-PA1 | Sin crear/asignar; editar/comentar dentro de PA1 | Scope y detalle U/M correctos; “Nueva actividad” visible indebidamente | No | ALTA |
| `/activities` | A5 AUDITOR | Solo lectura, Auditoría visible, sin mutaciones/comentarios | Pestaña Auditoría y `E2E_SEEDED` visibles; también aparecen crear, editar, cancelar, cambiar estado y comentar | No | ALTA |
| `/activities` | A6 PLANIFICADOR | Crear/comentar; sin editar/asignar | Crear y comentar visibles, pero también editar/cancelar/cambiar estado | No | ALTA |
| `/activities` | A7 LIDER-DENY | Crear/asignar/comentar; `activity:update` oculto | Backend rechaza update por DENY, pero UI muestra editar/cancelar/cambiar estado | No | ALTA |
| `/activities` | A9 PENDING | → `/access-pending` | → `/login?callbackUrl=%2Factivities` | No | MEDIA |
| `/activities` | A10 SUSPENDED | → `/login` | → `/login` | Sí | — |
| `/activities` | A11 MUST-CHANGE | → `/change-password` | → `/change-password` | Sí | — |
| `/calendar` | A1–A3, A6–A8, A12 | Eventos limitados por scope y creación según permiso | Eventos propios visibles, ajenos ausentes; botón de crear coincide para estos actores | Sí | — |
| `/calendar` | A4 TEC-PA1 | Sin crear/asignar | Eventos PA1 correctos; “Nueva actividad” visible | No | ALTA |
| `/calendar` | A5 AUDITOR | Solo lectura global | Eventos globales correctos; “Nueva actividad” visible | No | ALTA |
| `/calendar` | A9 PENDING | → `/access-pending` | → `/login?callbackUrl=%2Fcalendar` | No | MEDIA |
| `/calendar` | A10 SUSPENDED | → `/login` | → `/login` | Sí | — |
| `/calendar` | A11 MUST-CHANGE | → `/change-password` | → `/change-password` | Sí | — |
| `/team` | A1 ADMIN | Usuarios globales y gestión | A2 y A12 visibles; “Nuevo usuario” visible | Sí | — |
| `/team` | A5 AUDITOR | Lectura global sin mutaciones | A2 y A12 visibles; “Nuevo usuario” ausente | Sí | — |
| `/team` | A2, A3, A4, A6, A7, A8, A12 | Lectura/gestión limitada a COUNTRY o TEAM según matriz | Todos son redirigidos a `/dashboard`; no ven ni su propio scope | No | ALTA |
| `/team` | A9 PENDING | → `/access-pending` | → `/login?callbackUrl=%2Fteam` | No | MEDIA |
| `/team` | A10 SUSPENDED | → `/login` | → `/login` | Sí | — |
| `/team` | A11 MUST-CHANGE | → `/change-password` | → `/change-password` | Sí | — |
| `/team` | A13 LAST-ADMIN | No poder revocar su propia asignación crítica | Botón de autorrevocación ausente; acción directa devuelve `FORBIDDEN`; fila intacta | Sí | — |
| `/settings` | A1 ADMIN | Catálogo y matriz rol × permiso | Heading, tab y matriz visibles | Sí | — |
| `/settings` | A2–A8, A12 | Denegar administración global | “Acceso restringido” visible y matriz ausente | Sí | — |
| `/settings` | A9 PENDING | → `/access-pending` | → `/login?callbackUrl=%2Fsettings` | No | MEDIA |
| `/settings` | A10 SUSPENDED | → `/login` | → `/login` | Sí | — |
| `/settings` | A11 MUST-CHANGE | → `/change-password` | → `/change-password` | Sí | — |
| `/settings` | A13 LAST-ADMIN | Impedir retirar el último permiso crítico | `setRolePermission` directo devuelve `FORBIDDEN`; `catalog:manage` permanece | Sí | — |
| `/access-pending` | A1–A8, A12 ACTIVE | → `/dashboard` | La URL queda accesible y muestra la tarjeta de pendiente | No | MEDIA |
| `/access-pending` | A9 PENDING | Sesión limitada real, tarjeta pendiente, sin AppShell | La tarjeta es pública, pero `/api/auth/session` no contiene A9; no existe sesión limitada | No | MEDIA |
| `/access-pending` | A10 SUSPENDED | → `/login` | La URL pública permanece en `/access-pending` | No | MEDIA |
| `/access-pending` | A11 MUST-CHANGE | → `/change-password` | La URL pública permanece en `/access-pending` | No | MEDIA |
| `/change-password` | A1–A8, A12 ACTIVE | → `/dashboard` | La URL permanece accesible y muestra el formulario | No | MEDIA |
| `/change-password` | A9 PENDING | → `/access-pending` | → `/login?callbackUrl=%2Fchange-password` | No | MEDIA |
| `/change-password` | A10 SUSPENDED | → `/login` | → `/login` | Sí | — |
| `/change-password` | A11 MUST-CHANGE | Permitir solo cambio obligatorio | Formulario visible; rutas protegidas vuelven a `/change-password` | Sí | — |
| `/activities/{PA2Id}` | A3 COORD-PA1 | 403 explícito, sin datos | 404 porque la ruta `[id]` no existe | No | MEDIA |
| `updateActivity(PA2Id)` | A3 COORD-PA1 | `FORBIDDEN`, DB intacta | `FORBIDDEN`; título/fechas sin cambio | Sí | — |
| `addActivityComment(PA2Id)` | A4 TEC-PA1 | `FORBIDDEN`, sin comentario | `FORBIDDEN`; conteo de comentarios sin cambio | Sí | — |
| `updateActivity(PA2Id)` | A4 TEC-PA1 | `FORBIDDEN`, DB intacta | `FORBIDDEN`; actividad intacta | Sí | — |
| `assignUserRole(userPA)` | A12 LIDER-CR | `FORBIDDEN`, sin asignación | `FORBIDDEN`; conteo sin cambio | Sí | — |
| `revokeUserRole(assignmentPA)` | A12 LIDER-CR | `FORBIDDEN`, asignación intacta | `FORBIDDEN`; asignación permanece | Sí | — |
| `updateActivity(PA1Id)` | A7 LIDER-DENY | DENY prevalece sobre rol | `FORBIDDEN`; actividad intacta | Sí | — |
| `createActivity(PA2)` | A8 TEC-GRANT | GRANT permite crear en PA2 | Acción exitosa; una fila adicional en PA2 | Sí | — |
| `/dashboard` siguiente request | A2 suspendido en caliente por A1 | Invalidar sesión y → `/login` | La mutación cambia DB a SUSPENDED, pero el navegador sigue en `/dashboard`; AppShell visible y componente de datos muestra “Acceso no disponible” | No | ALTA |

## 5. Hallazgos consolidados

### ALTA — Controles de actividad no usan permisos efectivos

A4 y A5 ven “Nueva actividad” en Agenda/Actividades/Calendario. En el Sheet de detalle, A5, A6 y A7 ven editar, cancelar y cambiar estado; A5 también ve el formulario de comentario. Las Server Actions sí rechazaron los intentos sin permiso, por lo que no se observó mutación fuera de scope, pero la UI anuncia capacidades falsas y expone operaciones sensibles.

### ALTA — `/team` solo funciona para permisos GLOBAL

La página ejecuta `requirePermission(currentUser.id, "availability:read")` sin pasar un recurso. Las asignaciones COUNTRY/TEAM no resuelven contra ese recurso vacío y A2, A3, A4, A6, A7, A8 y A12 son enviados a `/dashboard`. A1 y A5 GLOBAL sí entran. No hubo fuga de usuarios; sí incumplimiento del modelo de delegación y lectura acotada.

### ALTA — Suspensión en caliente no invalida el JWT

La acción administrativa suspendió A2 y Prisma confirmó `accessStatus=SUSPENDED`. En la siguiente request, el JWT existente siguió autorizado por middleware y la URL permaneció `/dashboard`. `getCurrentUser()` reconsultó la base y evitó cargar los datos, pero el AppShell/sesión no se cerraron. El requisito era invalidar en la siguiente request.

### MEDIA — Flujo PENDING sin sesión limitada

El provider de credenciales exige `accessStatus=ACTIVE` en `hasActiveAccess`, por lo que A9 nunca recibe token con `accessDecision=PENDING`. Las rutas protegidas quedan deny-secure en login, pero el flujo de aprobación especificado no funciona.

### MEDIA — Páginas de estado no están protegidas bidireccionalmente

El matcher excluye `/access-pending`, y `/change-password` no comprueba en su propia página si el estado corresponde. Usuarios ACTIVE, SUSPENDED o MUST-CHANGE pueden abrir superficies de estado que no les corresponden, aunque estas páginas no muestran datos operativos.

### MEDIA — IDOR de URL no tiene superficie explícita

No existe `src/app/(app)/activities/[id]/page.tsx`; por ello la URL ajena devuelve 404 en lugar de 403. Las cinco barreras de Server Actions sí rechazaron el acceso y dejaron la base intacta.

### BAJA — títulos de páginas de autenticación sin heading semántico

`CardTitle` en `/access-pending` y `/change-password` no expone un elemento con rol `heading`. El contenido es visible, pero la jerarquía accesible no coincide con la visual.

## 6. Superficie AuditLog

No existe una ruta ni bandeja global de AuditLog en `/settings` o `/team`. La única superficie localizada es la pestaña **Auditoría** dentro del detalle de una actividad. A5 AUDITOR abrió esa pestaña y Playwright verificó el evento `E2E_SEEDED`. La matriz no atribuye una bandeja global inexistente al AUDITOR.

## 7. Artefactos

- Matriz previa: [2026-07-17-rbac-e2e-matrix-design.md](../superpowers/specs/2026-07-17-rbac-e2e-matrix-design.md)
- Plan: [2026-07-17-rbac-e2e-implementation.md](../superpowers/plans/2026-07-17-rbac-e2e-implementation.md)
- Configuración: [playwright.config.ts](../../playwright.config.ts)
- Seed: [seed-e2e.ts](../../scripts/seed-e2e.ts)
- Fixtures: [catalog.ts](../../e2e/fixtures/catalog.ts)
- Login real: [authentication-routes.spec.ts](../../e2e/specs/authentication-routes.spec.ts)
- Matriz de rutas/scope: [route-scope-matrix.spec.ts](../../e2e/specs/route-scope-matrix.spec.ts)
- IDOR y overrides: [idor-server-actions.spec.ts](../../e2e/specs/idor-server-actions.spec.ts)
- Controles UI: [permission-controls.spec.ts](../../e2e/specs/permission-controls.spec.ts)
- Suspensión/A13: [session-and-last-admin.spec.ts](../../e2e/specs/session-and-last-admin.spec.ts)
- Contrato del seed: [seed-contract.spec.ts](../../e2e/specs/seed-contract.spec.ts)
- Reporte HTML local: `artifacts/e2e-rbac/playwright-report/index.html`
- JSON final: `artifacts/e2e-rbac/results-final.json`
- JUnit final: `artifacts/e2e-rbac/results-final.xml`
- Fallos con screenshot/video/trace/contexto: `artifacts/e2e-rbac/test-results/`

Los artefactos binarios están ignorados por Git de forma intencional, pero permanecen en el workspace local. Cada uno de los 21 fallos tiene `error-context.md` y `trace.zip`; se retuvieron 22 capturas y 20 videos.

## 8. Conclusión verificable

No se observó lectura de actividades ajenas ni mutación fuera de scope en los casos ejercitados. No hay discrepancias CRÍTICAS en esta corrida. El backend rechazó IDOR, DENY y anti-escalación probados. El producto no cumple todavía la matriz completa por tres grupos principales: UI de actividades no condicionada por permisos efectivos, `/team` inaccesible para scopes no GLOBAL, y sesión JWT no invalidada en suspensión en caliente. Las páginas de estado de autenticación y el flujo PENDING también requieren corrección.
