# Administration Catalog and Access Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Deliver the administration module needed to provision real countries, teams, users, and scoped role assignments before activity scheduling begins.

**Architecture:** Server Components load the catalog and user-access read models through Prisma. Server Actions use Zod and explicit `catalog:manage`/access-management permissions, then revalidate `/settings`. Client Sheets keep creation and access editing in context; only active administrators can reach or mutate the surface.

**Tech Stack:** Next.js App Router, TypeScript, Prisma/PostgreSQL, Zod, ShadCN UI/Base UI, Sonner, Vitest and Testing Library.

## Global Constraints

- All source code, identifiers, file names, tests, and routes are English; user-visible copy is Spanish and centralized in `src/messages`.
- No data fixtures substitute for operational records. Empty catalog states explain the next permitted action.
- Every write repeats permission checks server-side, validates with Zod, records an audit event, and revalidates the affected route.
- Administration actions are restricted to global administrators for this initial delivery; scope editing cannot grant a privilege beyond the acting administrator.
- Verify at 390 px, 768 px, and 1440 px before starting Activities.

---

### Task 0: Seed a reproducible operational baseline

**Files:**
- Create: `prisma/seed-data.ts`
- Modify: `prisma/seed.ts`
- Create: `src/lib/seed-data.test.ts`

**Interfaces:**
- Produces `seedCountries`, `seedTeams`, and `seedAdminUser` as deterministic data contracts.
- `npm run db:seed` upserts three LATAM countries, one or two teams per country, the fixed roles and activity catalogs, and one active global ADMIN principal without duplicating assignments.

- [ ] **Step 1: Write the failing seed contract test**

```ts
expect(seedCountries.map(({ code }) => code)).toEqual(["PA", "MX", "CR"]);
expect(seedTeams.every((team) => seedCountries.some((country) => country.code === team.countryCode))).toBe(true);
expect(seedAdminUser).toMatchObject({ accessStatus: "ACTIVE", roleKey: "ADMIN", scopeType: "GLOBAL" });
```

- [ ] **Step 2: Run the focused test and verify it fails**

Run: `npm test -- src/lib/seed-data.test.ts`

Expected: FAIL because `prisma/seed-data.ts` does not exist.

- [ ] **Step 3: Implement deterministic idempotent upserts**

Keep catalog constants in `prisma/seed-data.ts`. In `prisma/seed.ts`, upsert countries by `code`, teams by `countryId_name`, and the demo user by `email`; create its global ADMIN assignment only when an equivalent assignment does not already exist.

- [ ] **Step 4: Verify the seed twice**

Run: `npm run db:seed` twice, then query counts and assignments.

Expected: three seeded countries, five seeded teams, one demo ADMIN global assignment, no duplicate assignment after the second run, and the existing user remains unchanged.

---

### Task 1: Establish administration authorization and validated input contracts

**Files:**
- Modify: `src/lib/permissions.ts`
- Create: `src/lib/validations/administration.ts`
- Create: `src/lib/validations/administration.test.ts`

**Interfaces:**
- Produces `requireAdministrationAccess(userId): Promise<void>`.
- Produces `countryInputSchema`, `teamInputSchema`, `userAccessInputSchema`, and their inferred input types.
- User access input accepts a `UserRoleAssignment` scope of `GLOBAL`, `COUNTRY`, or `TEAM`, requiring the corresponding ID only for the selected scope.

- [ ] **Step 1: Write failing schema tests**

```ts
expect(countryInputSchema.safeParse({ code: "PA", name: "Panamá" }).success).toBe(true);
expect(countryInputSchema.safeParse({ code: "p", name: "" }).success).toBe(false);
expect(userAccessInputSchema.safeParse({ userId, roleId, scopeType: "COUNTRY" }).success).toBe(false);
```

- [ ] **Step 2: Verify RED**

Run: `npm test -- src/lib/validations/administration.test.ts`

Expected: FAIL because administration schemas do not exist.

- [ ] **Step 3: Implement minimal contracts and global-admin guard**

Implement uppercase ISO-like 2–3 character country codes, non-empty team names, CUID IDs, and a discriminated scope validator. `requireAdministrationAccess` loads the actor's effective permissions and rejects unless it contains a global `ADMIN` assignment.

- [ ] **Step 4: Verify GREEN**

Run: `npm test -- src/lib/validations/administration.test.ts`

Expected: PASS.

### Task 2: Create auditable catalog and user-access actions

**Files:**
- Create: `src/app/actions/administration.ts`
- Create: `src/app/actions/administration.test.ts`
- Modify: `src/messages/errors.ts`

**Interfaces:**
- Produces `createCountry`, `createTeam`, `updateUserAccess`, and `setUserAccessStatus` actions returning typed `{ success, errorCode }` results.
- `createTeam` verifies its country exists; `updateUserAccess` deletes no existing assignment and upserts only the requested equivalent scope; `setUserAccessStatus` cannot suspend the acting user.

- [ ] **Step 1: Write failing action-result and authorization tests**

Use mocked `getCurrentUser`, `requireAdministrationAccess`, and Prisma methods to assert invalid input returns `VALIDATION`, a forbidden actor returns `FORBIDDEN`, and successful actions call audit logging and `revalidatePath("/settings")`.

- [ ] **Step 2: Verify RED**

Run: `npm test -- src/app/actions/administration.test.ts`

Expected: FAIL because no administration action module exists.

- [ ] **Step 3: Implement transactional actions**

Each action obtains the current user, validates the input, requires administration access, uses Prisma `$transaction` for related writes, appends an `AuditLog` row with an explicit action (`CREATE_COUNTRY`, `CREATE_TEAM`, `ASSIGN_ROLE`, `SET_ACCESS_STATUS`), and maps anticipated failures to typed error codes.

- [ ] **Step 4: Verify GREEN**

Run: `npm test -- src/app/actions/administration.test.ts && npx prisma validate`

Expected: PASS and a valid Prisma schema.

### Task 3: Build the administration route with responsive catalog and access surfaces

**Files:**
- Create: `src/app/(app)/settings/page.tsx`
- Create: `src/features/administration/administration-page.tsx`
- Create: `src/features/administration/country-team-sheet.tsx`
- Create: `src/features/administration/user-access-sheet.tsx`
- Create: `src/features/administration/administration-page.test.tsx`
- Modify: `src/messages/common.ts`
- Modify: `src/app/layout.tsx`

**Interfaces:**
- `AdministrationPage({ model })` consumes countries with teams and users with assignments.
- `CountryTeamSheet` submits validated country/team creation and shows Sonner feedback.
- `UserAccessSheet` submits role/scope/status updates and constrains its scope selector to the loaded catalog.

- [ ] **Step 1: Write failing component tests**

```tsx
render(<AdministrationPage model={emptyModel} />);
expect(screen.getByText("No hay países configurados")).toBeVisible();
expect(screen.getByRole("button", { name: "Agregar país" })).toBeVisible();
```

Add a populated-model test verifying the `Usuarios` tab exposes an editable active-status badge and the `Catálogo` tab lists its country/team relationship.

- [ ] **Step 2: Verify RED**

Run: `npm test -- src/features/administration/administration-page.test.tsx`

Expected: FAIL because the administration feature does not exist.

- [ ] **Step 3: Implement the server read model and client surfaces**

The route loads the active current user, rejects unauthorized requests with a Spanish access-denied state, queries countries/teams, roles, and users with assignments, and passes a serializable model to the client page. Use Tabs for `Catálogo` and `Usuarios`, compact tables on desktop, stacked cards on mobile, Sheets for create/edit, Alert for a missing-catalog notice, and Sonner for action outcomes. Mount the existing `Toaster` once in the root layout.

- [ ] **Step 4: Verify GREEN**

Run: `npm test -- src/features/administration/administration-page.test.tsx`

Expected: PASS.

### Task 4: Verify the module end to end and record responsive evidence

**Files:**
- Create: `artifacts/administration-mobile.png`
- Create: `artifacts/administration-tablet.png`
- Create: `artifacts/administration-desktop.png`

- [ ] **Step 1: Run repository verification**

Run: `npm test && npm run lint && npm run build`

Expected: all tests pass, lint has no new errors, and the build completes.

- [ ] **Step 2: Verify as `it1@combilift.es`**

1. Sign in and open `/settings`.
2. Create a country using its real code and name; create a team within that country.
3. Confirm both records persist after refresh.
4. Confirm the user table shows `it1@combilift.es` as active global ADMIN.

- [ ] **Step 3: Capture responsive layouts**

Capture the populated administration page at 390×844, 768×1024, and 1440×1000. Confirm forms remain usable, tables/cards have no horizontal page overflow, and the Sheet is keyboard accessible.

## Plan self-review

- Task 1 establishes typed input and authorization. Task 2 supplies real, audited writes. Task 3 provides the requested ShadCN administration experience. Task 4 verifies persistence and all three responsive breakpoints.
- The approved deterministic seed supplies explicit demo operational data; `/settings` manages subsequent real catalog changes.
