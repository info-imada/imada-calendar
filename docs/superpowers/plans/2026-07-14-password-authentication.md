# Password Authentication Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add administrator-provisioned password authentication alongside Zoho OAuth without duplicating user or authorization logic.

**Architecture:** `UserCredential` stores one Argon2id password hash per locally authenticated user and `LoginAttempt` supplies a database-backed, Vercel-compatible lockout window. Auth.js resolves both providers to the existing `User`; only users with `ACTIVE` access and a role assignment can establish a session. The login route is public, while every application route is protected by middleware and server checks.

**Tech Stack:** Next.js App Router, Auth.js v4, Prisma 7, PostgreSQL/Neon, Argon2id, Zod, Vitest, ShadCN UI.

## Global Constraints

- All source identifiers, comments, files, tests, and routes are English.
- All visible copy is Spanish and centralized in `src/messages`.
- There is no public registration, password recovery, or provider auto-linking.
- Passwords are hashed with Argon2id and never logged, returned, or persisted as plaintext.
- A local account is `ACTIVE` only after an administrator creates it with at least one `UserRoleAssignment` in the same transaction.
- Zoho and password accounts are mutually exclusive by default; linking requires a future explicit administrative workflow.

---

### Task 1: Extend the identity schema and migration

**Files:**
- Modify: `prisma/schema.prisma`
- Create: `prisma/migrations/<timestamp>_add_password_authentication/migration.sql`
- Test: `src/lib/validations/authentication.test.ts`

**Interfaces:**
- Produces `UserCredential { userId, passwordHash, mustChangePassword, changedAt }`.
- Produces `LoginAttempt { email, attemptedAt, succeeded }` indexed by email and timestamp.

- [ ] Write a failing validation test for an email and temporary password.
- [ ] Run `pnpm vitest run src/lib/validations/authentication.test.ts` and confirm the missing validation module fails.
- [ ] Add the models, relation and migration with a unique credential per user.
- [ ] Add Zod validation for valid email and a temporary password of at least 12 characters.
- [ ] Run the focused test and `pnpm prisma validate`.

### Task 2: Implement password hashing and lockout policy

**Files:**
- Create: `src/lib/password.ts`
- Create: `src/lib/login-attempts.ts`
- Create: `src/lib/password.test.ts`
- Create: `src/lib/login-attempts.test.ts`

**Interfaces:**
- Produces `hashPassword(password)`, `verifyPassword(hash, password)`, and `validatePassword(password)`.
- Produces `assertLoginAllowed(email)`, `recordLoginAttempt(email, succeeded)` and `clearLoginAttempts(email)`.

- [ ] Write failing tests for Argon2 verification, the password rule, and lockout after five failed attempts in fifteen minutes.
- [ ] Run both focused files and confirm they fail because the modules do not exist.
- [ ] Install the native Argon2 dependency, implement Argon2id hashing, and map failures to typed internal error codes.
- [ ] Implement database-backed attempts; a correct password clears failures, five failures lock the address for fifteen minutes.
- [ ] Run focused tests and then the whole suite.

### Task 3: Unify provider resolution in Auth.js

**Files:**
- Modify: `src/lib/auth.ts`
- Modify: `src/app/api/auth/[...nextauth]/route.ts`
- Create: `src/types/next-auth.d.ts`
- Test: `src/lib/auth.test.ts`

**Interfaces:**
- Produces `createAuthOptions()` with Zoho and Credentials providers.
- Produces `getCurrentUser()` that returns only an active user with an effective role assignment.

- [ ] Write a failing unit test for credentials rejection when the account is pending, locked, or marked for forced password change.
- [ ] Run the focused test and confirm failure.
- [ ] Implement a Credentials provider that validates, rate-limits and verifies `UserCredential` through the same User model.
- [ ] Update Zoho sign-in checks to use the same active-access predicate and avoid automatic account linking.
- [ ] Add session type augmentation and ensure identifiers do not include role decisions.
- [ ] Run the focused test and verify `/api/auth/providers` exposes both providers.

### Task 4: Add access pages and mandatory password-change flow

**Files:**
- Create: `src/app/(auth)/login/page.tsx`
- Create: `src/app/(auth)/change-password/page.tsx`
- Create: `src/app/(auth)/access-pending/page.tsx`
- Create: `src/features/authentication/login-form.tsx`
- Create: `src/features/authentication/change-password-form.tsx`
- Create: `src/app/actions/authentication.ts`
- Modify: `src/messages/common.ts`
- Test: `src/features/authentication/login-form.test.tsx`

**Interfaces:**
- Produces public Spanish login UI with Zoho and email/password choices.
- Produces `changePassword(input)` that clears the mandatory-change flag and appends an audit event.

- [ ] Write a failing UI test for both providers and the accessible password fields.
- [ ] Run the focused test and confirm missing component failure.
- [ ] Implement ShadCN forms, inline errors from centralized messages, loading state, and password visibility controls with tooltips.
- [ ] Implement the authenticated mandatory password change action with Argon2id and audit logging.
- [ ] Run the focused UI and action tests.

### Task 5: Protect application routes and document provisioning

**Files:**
- Create: `src/middleware.ts`
- Create: `docs/authentication/password-accounts.md`
- Modify: `docs/database/neon.md`
- Test: `src/lib/authentication-policy.test.ts`

**Interfaces:**
- Produces route redirects for unauthenticated visitors and password-change enforcement.
- Documents the transactional administrator provisioning decision and Zoho callback requirements.

- [ ] Write a failing policy test for public routes and password-change enforcement.
- [ ] Run the focused test and confirm failure.
- [ ] Implement middleware that leaves auth routes and Auth.js endpoints public and protects application routes.
- [ ] Document account creation, the no-linking policy, lockout settings, and the need to rotate credentials shared in chat.
- [ ] Run `pnpm prisma migrate deploy`, `pnpm test`, `pnpm lint`, `pnpm build`, and browser-test the login screen.

## Plan self-review

- Coverage: password storage, provisioning policy, dual provider Auth.js setup, rate limiting, mandatory change, protected UI, centralized copy and verification are covered.
- Consistency: all providers resolve to `User`, authorization remains in `getEffectivePermissions`, and only local credentials use password state.
- Scope: calendar and the other product modules are deliberately excluded until the authentication checkpoint is reported, as requested.
