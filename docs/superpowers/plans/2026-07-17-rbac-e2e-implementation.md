# RBAC E2E Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ejecutar la matriz normativa de roles, permisos, scopes, IDOR y estados de acceso contra Next.js y PostgreSQL reales, entregando evidencia y discrepancias reproducibles.

**Architecture:** Playwright levantará Next.js en el puerto 3100 con una base PostgreSQL dedicada cuyo nombre termina en `_e2e`. Un global setup creará la base si no existe, aplicará migraciones y ejecutará un seed determinista. Los casos usarán login local real, contextos aislados y un action probe disponible solo con `E2E_TEST_MODE=1` para invocar las Server Actions reales bajo la sesión del navegador.

**Tech Stack:** Next.js 16, NextAuth Credentials, Prisma 7/PostgreSQL, Playwright Chromium, TypeScript.

## Global Constraints

- Trabajar directamente en `master`; no crear worktrees.
- Nunca conectar las pruebas a `DATABASE_URL`/`DIRECT_DATABASE_URL` de desarrollo.
- No usar mocks ni sustituir Prisma, NextAuth o Server Actions.
- Conservar screenshots y traces en cada fallo.
- Comparar observados con `docs/superpowers/specs/2026-07-17-rbac-e2e-matrix-design.md` sin reescribir expectativas.

---

### Task 1: Playwright y aislamiento PostgreSQL

**Files:**
- Modify: `package.json`
- Create: `playwright.config.ts`
- Create: `e2e/support/e2e-environment.ts`
- Create: `e2e/global-setup.ts`
- Create: `scripts/run-e2e-server.ts`

**Interfaces:**
- Produces: `getE2EDatabaseUrl(): string`, `assertDedicatedE2EDatabase(url): void` y servidor en `http://127.0.0.1:3100`.

- [ ] Instalar `@playwright/test` y Chromium.
- [ ] Escribir una prueba de contrato que rechace una URL igual a desarrollo o sin sufijo `_e2e`.
- [ ] Ejecutarla y confirmar RED.
- [ ] Implementar derivación segura desde `DIRECT_DATABASE_URL`, creación de la base, migraciones y configuración Playwright.
- [ ] Confirmar GREEN y que la base real se llama `calendar_e2e`.

### Task 2: Seed E2E determinista

**Files:**
- Create: `e2e/fixtures/catalog.ts`
- Create: `scripts/seed-e2e.ts`
- Create: `e2e/fixtures/seed-contract.spec.ts`

**Interfaces:**
- Produces: 13 actores, credencial compartida segura de test, PA/CR con dos equipos cada uno, actividades etiquetadas por scope, rol PLANIFICADOR y overrides GRANT/DENY.

- [ ] Escribir el contrato Playwright que consulta la DB E2E y exige todos los fixtures.
- [ ] Ejecutarlo y confirmar RED antes del seed.
- [ ] Implementar limpieza transaccional e inserción determinista con bcrypt real.
- [ ] Ejecutar seed y confirmar GREEN contra PostgreSQL E2E.

### Task 3: Login real y estados de acceso

**Files:**
- Create: `e2e/fixtures/auth.ts`
- Create: `e2e/specs/authentication-routes.spec.ts`

**Interfaces:**
- Consumes: credenciales/IDs del catálogo E2E.
- Produces: `loginAs(page, actor)` y cobertura de `/`, `/login`, `/access-pending`, `/change-password`.

- [ ] Crear casos data-driven para ACTIVE, PENDING, SUSPENDED y MUST-CHANGE.
- [ ] Verificar URL y DOM exactos después de login y navegación directa.
- [ ] Capturar discrepancias sin modificar expectativas.

### Task 4: Rutas operativas, UI dinámica y scopes

**Files:**
- Create: `e2e/specs/operational-routes.spec.ts`
- Create: `e2e/specs/team-settings.spec.ts`
- Create: `e2e/fixtures/assertions.ts`

**Interfaces:**
- Produces: aserciones DOM por actor para dashboard, activities, calendar, team y settings.

- [ ] Ejecutar las combinaciones ACTIVE de la matriz con navegación directa.
- [ ] Afirmar títulos de fixtures propios presentes y ajenos ausentes.
- [ ] Afirmar navegación y botones visibles/ocultos según permisos efectivos.
- [ ] Comprobar gestión cruzada PA/CR y matriz RBAC restringida.

### Task 5: Server Actions reales, IDOR y escenarios sensibles

**Files:**
- Create: `src/app/e2e/action-probe/page.tsx`
- Create: `src/features/e2e/action-probe.tsx`
- Create: `e2e/specs/idor-actions.spec.ts`
- Create: `e2e/specs/session-revocation.spec.ts`
- Create: `e2e/specs/last-administrator.spec.ts`

**Interfaces:**
- Action probe: disponible solo si `E2E_TEST_MODE=1`; ejecuta `updateActivity`, `addActivityComment`, `assignUserRole`, `revokeUserRole` y `setRolePermission`, mostrando el resultado JSON sin saltarse autenticación.

- [ ] Escribir primero los seis casos IDOR esperados y confirmar los fallos relevantes.
- [ ] Implementar el probe mínimo gated por entorno.
- [ ] Verificar errorCode FORBIDDEN y estado DB intacto.
- [ ] Probar suspensión en caliente en dos contextos reales.
- [ ] Probar A13 como último administrador crítico y restaurar el seed al terminar.

### Task 6: Reporte y artefactos

**Files:**
- Create: `scripts/generate-rbac-e2e-report.ts`
- Create: `artifacts/e2e-rbac/discrepancy-report.md`
- Generated: `artifacts/e2e-rbac/playwright-report/`
- Generated: `artifacts/e2e-rbac/test-results/`

**Interfaces:**
- Consumes: reporter JSON/JUnit y matriz normativa.
- Produces: tabla Ruta/Actor/Esperado/Observado/Coincide/Severidad y conteo ejecutado/no cubierto.

- [ ] Configurar HTML, JSON/JUnit, screenshots y traces en fallos.
- [ ] Ejecutar toda la batería serial sensible y paralela segura.
- [ ] Clasificar discrepancias CRÍTICA/ALTA/MEDIA/BAJA con evidencia enlazada.
- [ ] Ejecutar `npm test`, `npm run lint`, `npm run build` y `npm run test:e2e`.
- [ ] Entregar archivos y resultados sin afirmar éxito donde no exista una aserción real.

## Self-review

- La matriz normativa está congelada antes del primer spec Playwright.
- La base E2E tiene un guard que impide usar desarrollo.
- Los casos IDOR invocan Server Actions reales con sesión real.
- La inexistencia actual de `/activities/[id]` se registra, no se oculta.
- AuditLog se comprueba únicamente en el detalle de actividad; no se inventa una bandeja global.
- A13 se ejecuta serialmente con precondición DB verificada.
