# Dynamic Authorization Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Persist roles and permissions, enforce granular anti-escalation and scoped delegation, audit every sensitive mutation, and expose the system through complete `/team` and `/settings` workflows.

**Architecture:** Prisma owns the authorization catalog and relations. `src/lib/permissions.ts` remains the compatibility façade while focused policy modules resolve effective permissions and validate mutations. Server actions perform authorization and writes transactionally. Server Components assemble read models; client workspaces render responsive ShadCN interfaces.

**Tech Stack:** Next.js 16 App Router, React 19, TypeScript, Prisma/PostgreSQL, Zod, Vitest, React Testing Library, ShadCN UI, Tailwind CSS.

## Global Constraints

- Work only on `master`; do not create worktrees.
- Preserve current effective permissions on migration day one.
- `DENY` always wins over inherited permissions and `GRANT`.
- No actor may modify their own assignment, override, access status, or password.
- System role keys are immutable and system roles cannot be deleted.
- Every sensitive mutation writes `AuditLog` with actor and before/after metadata in the same transaction.
- Report migrated data and passing security tests before presenting the UI.

---

### Task 1: Prisma authorization schema and migration

**Files:**
- Modify: `prisma/schema.prisma`
- Create: `prisma/migrations/20260716_dynamic_authorization/migration.sql`

**Produces:** `Role.priority`, `Permission`, `RolePermission`, `UserPermissionOverride`, `OverrideEffect`, non-null override `scopeKey`, and all relations/indexes.

- [ ] Add failing schema assertions in `src/lib/authorization/schema-contract.test.ts` that read the schema and require the new models, enum, priority and uniqueness contract.
- [ ] Run `npm test -- src/lib/authorization/schema-contract.test.ts` and confirm RED.
- [ ] Update Prisma schema and write a data-preserving SQL migration that renames existing English keys by ID, backfills role metadata, creates authorization tables and foreign keys, and preserves assignments.
- [ ] Run the contract test, `npx prisma format`, `npx prisma validate`, and `npx prisma generate`.

### Task 2: Idempotent role/permission seed

**Files:**
- Modify: `prisma/seed-data.ts`
- Modify: `prisma/seed.ts`
- Modify: `src/lib/seed-data.test.ts`

**Produces:** `seedRoles`, `seedPermissions`, and `seedRolePermissions` with the exact legacy matrix.

- [ ] Extend the seed-data test to assert five system roles, exact priorities, ten categorized permissions and exact role matrices; confirm RED.
- [ ] Replace string roles with structured seed records and add categorized permissions/matrix.
- [ ] Update the seed transaction to upsert roles/permissions and synchronize `RolePermission` idempotently before user assignments.
- [ ] Run the seed tests and Prisma typecheck.

### Task 3: Effective permission resolver

**Files:**
- Create: `src/lib/authorization/effective-permissions.test.ts`
- Create: `src/lib/authorization/effective-permissions.ts`
- Modify: `src/lib/permissions.ts`

**Produces:** `resolveEffectivePermissions(input)` pure resolver and DB-backed `getEffectivePermissions(userId, resource)`.

- [ ] Write RED tests for scope containment, dynamic role permissions, global-only default resolution, GRANT behavior and DENY precedence at global/country/team scope.
- [ ] Implement the pure resolver with source metadata and string permission keys.
- [ ] Replace the hardcoded matrix query with Prisma includes for role permissions and overrides.
- [ ] Preserve `requirePermission` and make `requireAdministrationAccess` require ADMIN + GLOBAL.
- [ ] Run resolver and regression tests.

### Task 4: Anti-escalation policy

**Files:**
- Create: `src/lib/authorization/administration-policy.test.ts`
- Create: `src/lib/authorization/administration-policy.ts`

**Produces:** `assertCanAssignRole`, `assertGlobalAdmin`, `assertCanManageOverride`, `scopeContains`, and `scopeKeyFor`.

- [ ] Write RED tests for equal/higher role rejection, self-mutation rejection, COUNTRY/TEAM containment, permission subset validation, and custom role priority validation.
- [ ] Implement minimal pure policy functions with explicit `AuthorizationError("FORBIDDEN")`.
- [ ] Run the policy suite and refactor shared scope helpers only after GREEN.

### Task 5: Validated and audited authorization actions

**Files:**
- Modify: `src/lib/validations/administration.ts`
- Create: `src/app/actions/authorization.ts`
- Create: `src/app/actions/authorization.test.ts`
- Modify: `src/app/actions/administration.ts`
- Modify: `src/app/actions/administration.test.ts`

**Produces:** transactional role, role-permission, override and assignment mutations.

- [ ] Add Zod schemas for role creation/update, role-permission toggles, overrides, assignment creation/revocation, account status and password reset.
- [ ] Write RED action tests for all five mandatory security rules, including explicit privilege-escalation attempts.
- [ ] Implement actions with authorization rechecked inside `$transaction`.
- [ ] Write audit entries with stable `before`/`after` metadata for every mutation.
- [ ] Update legacy `updateUserAccess` to delegate through the same policy instead of admin-only hardcoding.
- [ ] Run action and existing administration tests.

### Task 6: Database migration and security checkpoint

**Files:**
- Modify: `scripts/verify-database.ts`
- Create: `scripts/verify-authorization.ts`
- Create: `scripts/verify-authorization.test.ts`

**Produces:** repeatable database verification of roles, permissions, matrix, overrides and global admin.

- [ ] Write RED tests for verification failures on missing roles or matrix drift.
- [ ] Implement verification helpers and CLI.
- [ ] Run migration, generate, seed twice and database verification against configured PostgreSQL.
- [ ] Run all security tests, full suite, lint and build.
- [ ] Report this checkpoint before showing UI work.

### Task 7: `/team` complete user management

**Files:**
- Create: `src/features/team/team-types.ts`
- Create: `src/lib/team/read-model.ts`
- Create: `src/lib/team/read-model.test.ts`
- Modify: `src/app/(app)/team/page.tsx`
- Modify: `src/features/team/team-workspace.tsx`
- Modify: `src/features/team/team-workspace.test.tsx`

**Produces:** real user list/status/roles/scopes, detail Sheet with effective permissions, activate/suspend confirmations, and local temporary-password reset.

- [ ] Write RED read-model and component tests for all user states, roles/scopes and effective permission sources.
- [ ] Build the scoped read model from Prisma and effective permission resolver.
- [ ] Redesign the responsive list and shared detail sections using OperationalToolbar, Sheet/Drawer, Tabs, badges, Skeleton/Alert and confirmation Dialogs.
- [ ] Wire status/password actions with Sonner feedback and refresh.
- [ ] Run module tests and verify 390/768/1440 in both themes.

### Task 8: `/settings` roles and permissions matrix

**Files:**
- Create: `src/lib/administration/read-model.ts`
- Create: `src/lib/administration/read-model.test.ts`
- Modify: `src/app/(app)/settings/page.tsx`
- Modify: `src/features/administration/administration-page.tsx`
- Modify: `src/features/administration/administration-page.test.tsx`

**Produces:** categorized role × permission matrix, new custom role flow and confirmation dialogs for sensitive toggles.

- [ ] Write RED tests for grouped categories, system-role protection, custom-role creation and permission toggle confirmations.
- [ ] Build the ADMIN GLOBAL read model with roles, permissions and membership sets.
- [ ] Add `Roles y permisos` Tabs content with responsive sticky matrix/checklist, explicit category grouping and accessible Switch/Checkbox controls.
- [ ] Add custom role Sheet with specific placeholders and priority validation.
- [ ] Wire actions, confirmations, Sonner and error Alerts.
- [ ] Run module tests and verify 390/768/1440 in both themes.

### Task 9: Final regression and design QA

**Files:**
- Modify: `design-qa.md`

- [ ] Run `npm test`, `npm run lint`, `npm run build`, `npx prisma validate`, database verification and `git diff --check`.
- [ ] Verify permissions for representative ADMIN/LIDER/COORDINADOR/TECNICO/AUDITOR users.
- [ ] Capture `/team` and `/settings` in light/dark at 390×844, 768×1024 and 1440×900.
- [ ] Compare source/product patterns and implementation together; fix all P0/P1/P2 findings.
- [ ] Update `design-qa.md` with browser evidence and `final result: passed`.
