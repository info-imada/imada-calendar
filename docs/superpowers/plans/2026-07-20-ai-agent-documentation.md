# Calendar AI Agent Documentation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Crear una estructura documental en español, basada en evidencia del repositorio, que permita a agentes de IA y desarrolladores modificar Calendar con contexto suficiente y sin romper reglas de negocio o seguridad.

**Architecture:** Un `AGENTS.md` raíz actúa como índice obligatorio y `.ai/AGENTS.md` define el protocolo operativo. Once documentos especializados dentro de `.ai/` separan producto, arquitectura, negocio, módulos, datos, APIs, UI, permisos, desarrollo, historial y prompts, con referencias cruzadas y secciones explícitas de incertidumbre.

**Tech Stack:** Markdown, Next.js 16 App Router, React 19, TypeScript estricto, Prisma 7, PostgreSQL/Neon, NextAuth 4, Tailwind CSS 4, ShadCN/Base UI, Vitest.

## Global Constraints

- Trabajar directamente en la rama `master`; no usar worktrees.
- Escribir toda la documentación en español y usar únicamente el nombre **Calendar**.
- No crear ni modificar `README.md`, porque no existe en el estado auditado.
- No modificar lógica, esquema, migraciones, estilos, tests ni configuración funcional.
- No copiar secretos ni valores desde `.env`; solo documentar nombres presentes en `.env.example`.
- Marcar incertidumbres reales bajo `Pendiente por confirmar`.
- Tratar `src/`, `prisma/`, configuración y migraciones como fuentes primarias; usar `docs/` y Git como historial contextual.
- Documentar la ausencia de `e2e/` y `scripts/` y los comandos residuales de `package.json` sin intentar corregirlos.

---

### Task 1: Puntos de entrada para agentes

**Files:**
- Create: `AGENTS.md`
- Create: `.ai/AGENTS.md`

**Interfaces:**
- Consumes: diseño aprobado en `docs/superpowers/specs/2026-07-20-ai-agent-documentation-design.md`.
- Produces: orden de lectura y protocolo que todos los documentos especializados referenciarán.

- [ ] **Step 1: Crear el `AGENTS.md` raíz**

Incluir nombre, resumen de una frase, orden de lectura mínimo, prohibición de asumir reglas por nombre de rol, obligación de verificar permisos en servidor, protección de datos y enlaces a todos los documentos `.ai/`.

- [ ] **Step 2: Crear `.ai/AGENTS.md`**

Definir fases “orientar → localizar fuente → evaluar alcance → implementar → verificar → entregar”; listas específicas antes de tocar base de datos, RBAC, autenticación, Server Actions o UI; reglas para preservar cambios del usuario; formato de entrega con archivos, pruebas, riesgos y pendientes.

- [ ] **Step 3: Verificar enlaces y términos**

Run: `rg -n "Calendar|PROJECT_CONTEXT|PERMISSIONS|DEVELOPMENT_GUIDE" AGENTS.md .ai/AGENTS.md`

Expected: ambos archivos nombran el producto y contienen enlaces de lectura válidos.

- [ ] **Step 4: Commit**

```bash
git add AGENTS.md .ai/AGENTS.md
git commit -m "docs: add AI agent entry points"
```

### Task 2: Contexto, arquitectura, negocio y módulos

**Files:**
- Create: `.ai/PROJECT_CONTEXT.md`
- Create: `.ai/ARCHITECTURE.md`
- Create: `.ai/BUSINESS_RULES.md`
- Create: `.ai/MODULES.md`

**Interfaces:**
- Consumes: `src/app`, `src/features`, `src/lib`, `src/messages/common.ts`, configuración y especificaciones vigentes.
- Produces: mapa funcional y técnico utilizado por las guías de datos, APIs, UI y permisos.

- [ ] **Step 1: Documentar contexto de producto**

Describir Calendar como agenda operativa interna para Soporte Técnico LATAM, usuarios observables por los roles seed, módulos visibles, flujo login → estado de acceso → shell → operación y límites no confirmados.

- [ ] **Step 2: Documentar arquitectura real**

Registrar App Router, Server Components por defecto, Client Components interactivos, Server Actions, Route Handlers, Prisma con adaptador `pg`, proxy de autenticación, capa `features`, componentes compartidos y flujo navegador → RSC/Action → política → Prisma → PostgreSQL.

- [ ] **Step 3: Documentar reglas de negocio**

Incluir acceso ACTIVE/PENDING/SUSPENDED, contraseña temporal, bloqueo de login, actividades y recurrencia, máximo de serie, validación temporal, solapamientos, catálogos, scopes, auditoría append-only y administración segura.

- [ ] **Step 4: Documentar módulos**

Cubrir autenticación, Agenda, Actividades, Calendario, Equipo y Administración; mencionar comentarios/auditoría dentro de actividad y modelos de notificaciones/disponibilidad sin afirmar una UI inexistente.

- [ ] **Step 5: Verificar cobertura de rutas y módulos**

Run: `rg -n "/dashboard|/activities|/calendar|/team|/settings|/login|PENDING|SUSPENDED" .ai/PROJECT_CONTEXT.md .ai/ARCHITECTURE.md .ai/BUSINESS_RULES.md .ai/MODULES.md`

Expected: las rutas y estados críticos aparecen en los documentos correspondientes.

- [ ] **Step 6: Commit**

```bash
git add .ai/PROJECT_CONTEXT.md .ai/ARCHITECTURE.md .ai/BUSINESS_RULES.md .ai/MODULES.md
git commit -m "docs: map product architecture and business modules"
```

### Task 3: Datos, APIs y autorización

**Files:**
- Create: `.ai/DATABASE.md`
- Create: `.ai/API_GUIDE.md`
- Create: `.ai/PERMISSIONS.md`

**Interfaces:**
- Consumes: `prisma/schema.prisma`, migraciones, seed, `src/lib/auth.ts`, `src/lib/permissions.ts`, `src/lib/authorization/*`, `src/app/actions/*` y Route Handlers.
- Produces: fuente operativa para cambios sensibles de persistencia, autenticación y RBAC.

- [ ] **Step 1: Documentar persistencia**

Enumerar enums y modelos por dominio, relaciones y constraints críticos (`scopeKey`, asignaciones, overrides, catálogos y auditoría), estrategia de migraciones, seed idempotente, Neon y reglas de cambio seguro.

- [ ] **Step 2: Documentar superficies servidor**

Separar NextAuth `/api/auth/[...nextauth]`, Route Handler IDOR `/activities/[activityId]` y Server Actions. Explicar Zod, resultados `{ success, errorCode, entityId }`, errores esperados, `revalidatePath`, transacciones y ausencia de una API REST general.

- [ ] **Step 3: Documentar RBAC dinámico**

Registrar los cinco roles seed con prioridades, diez permisos, scopes GLOBAL/COUNTRY/TEAM, precedencia DENY, `requireAdministrationAccess`, anti-escalación, auto-modificación prohibida, roles de sistema, última administración global y AuditLog.

- [ ] **Step 4: Verificar contratos contra las fuentes**

Run: `rg -n "ADMIN|LIDER|COORDINADOR|TECNICO|AUDITOR|catalog:manage|DENY|scopeKey|AuditLog" .ai/DATABASE.md .ai/API_GUIDE.md .ai/PERMISSIONS.md`

Expected: roles, permiso crítico, precedencia, clave de scope y auditoría están documentados.

- [ ] **Step 5: Commit**

```bash
git add .ai/DATABASE.md .ai/API_GUIDE.md .ai/PERMISSIONS.md
git commit -m "docs: document data APIs and dynamic authorization"
```

### Task 4: UI y desarrollo

**Files:**
- Create: `.ai/UI_GUIDE.md`
- Create: `.ai/DEVELOPMENT_GUIDE.md`

**Interfaces:**
- Consumes: `components.json`, `src/app/globals.css`, `src/components/product`, `src/components/ui`, `src/features`, `.env.example`, `package.json`, Prisma config y tests Vitest.
- Produces: convenciones visuales, workflow local y checklist de entrega.

- [ ] **Step 1: Documentar sistema visual**

Registrar paleta neutra con marca `#34B27B`, clases de tema `.dark`/`.light`, tipografías, componentes compartidos, ShadCN/Base UI, responsive `<640`, `640–1024`, `>1024`, formularios, estados, accesibilidad y reglas de toolbars/densidad.

- [ ] **Step 2: Documentar desarrollo local**

Indicar Node compatible con Next 16, pnpm como gestor canónico por el lockfile, instalación, `prisma generate`, variables por nombre, comandos vigentes, migraciones y tests. Marcar como no operativos los scripts que apuntan a `scripts/` ausente y la suite E2E eliminada.

- [ ] **Step 3: Añadir checklist de entrega**

Exigir Zod, autorización del lado servidor, AuditLog para mutaciones sensibles, estados UI, tres breakpoints, temas claro/oscuro, `npm run build`/`pnpm build`, tests relevantes, diff y ausencia de secretos.

- [ ] **Step 4: Verificar UI y comandos**

Run: `rg -n "#34B27B|ShadCN|Base UI|640|1024|pnpm|prisma generate|npm run build|scripts/" .ai/UI_GUIDE.md .ai/DEVELOPMENT_GUIDE.md`

Expected: tokens, librerías, breakpoints, gestor, generación Prisma, build e inconsistencia residual aparecen explícitamente.

- [ ] **Step 5: Commit**

```bash
git add .ai/UI_GUIDE.md .ai/DEVELOPMENT_GUIDE.md
git commit -m "docs: define UI and development conventions"
```

### Task 5: Historial contextual y prompts

**Files:**
- Create: `.ai/CHANGELOG_CONTEXT.md`
- Create: `.ai/PROMPTS.md`

**Interfaces:**
- Consumes: Git log, `docs/superpowers/specs`, `docs/superpowers/plans`, `docs/testing`, `docs/database/neon.md` y estado actual del código.
- Produces: memoria temporal verificable y plantillas de trabajo para futuras IA.

- [ ] **Step 1: Crear historial contextual**

Ordenar decisiones confirmadas por fecha: fundación Prisma/autenticación, actividades/calendario, sistema visual, RBAC dinámico y gestión de usuarios; distinguir documentos históricos de código vigente; registrar pendientes actuales sin afirmar resoluciones no verificadas.

- [ ] **Step 2: Crear prompts reutilizables**

Incluir prompts completos para feature, bug, seguridad, refactor, permisos, base de datos y documentación. Cada prompt debe exigir archivos de lectura, evidencia, límites de scope, plan, implementación mínima y comandos de verificación.

- [ ] **Step 3: Verificar categorías de prompts e historial**

Run: `rg -n "Implementar un feature|Corregir un bug|Revisar seguridad|Refactorizar|Analizar permisos|Revisar base de datos|Documentar cambios|Pendiente por confirmar" .ai/PROMPTS.md .ai/CHANGELOG_CONTEXT.md`

Expected: las siete plantillas y la sección de incertidumbres existen.

- [ ] **Step 4: Commit**

```bash
git add .ai/CHANGELOG_CONTEXT.md .ai/PROMPTS.md
git commit -m "docs: add contextual history and reusable prompts"
```

### Task 6: Auditoría final de documentación

**Files:**
- Verify: `AGENTS.md`
- Verify: `.ai/*.md`
- Verify: `docs/superpowers/specs/2026-07-20-ai-agent-documentation-design.md`
- Verify: `docs/superpowers/plans/2026-07-20-ai-agent-documentation.md`

**Interfaces:**
- Consumes: todos los entregables anteriores.
- Produces: evidencia de cobertura, consistencia y ausencia de cambios de producto.

- [ ] **Step 1: Verificar inventario exacto**

Run: `Get-ChildItem .ai -File | Sort-Object Name | Select-Object Name`

Expected: once archivos especializados más `.ai/AGENTS.md`, para un total de doce archivos dentro de `.ai/`, además de `AGENTS.md` en la raíz.

- [ ] **Step 2: Buscar nombres incorrectos, secretos y placeholders**

Run: `rg -n "CombiSales|DATABASE_URL=.+|NEXTAUTH_SECRET=.+|ZOHO_CLIENT_SECRET=.+|TBD|TODO" AGENTS.md .ai`

Expected: ninguna coincidencia. Las incertidumbres usan la sección explícita `Pendiente por confirmar` y no placeholders.

- [ ] **Step 3: Verificar referencias de código principales**

Comprobar que las rutas citadas en backticks existen o están marcadas expresamente como ausentes. Validar en particular `src/lib/auth.ts`, `src/lib/permissions.ts`, `src/lib/authorization/`, `src/app/actions/`, `prisma/schema.prisma`, `src/components/product/` y `src/app/globals.css`.

- [ ] **Step 4: Verificar diff documental**

Run: `git diff --check && git status --short`

Expected: solo documentos del alcance aparecen modificados o agregados y no hay errores de whitespace.

- [ ] **Step 5: Ejecutar build de producción**

Run: `npm run build`

Expected: Prisma Client generado, TypeScript finalizado y build Next.js con exit code 0.

- [ ] **Step 6: Commit final del plan**

```bash
git add docs/superpowers/plans/2026-07-20-ai-agent-documentation.md
git commit -m "docs: add AI documentation implementation plan"
```
