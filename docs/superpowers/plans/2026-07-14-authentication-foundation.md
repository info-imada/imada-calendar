# Authentication Foundation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Allow new Zoho users to enter as pending users and provide a trusted, explicit way to activate the first global administrator.

**Architecture:** Keep the provider-managed OAuth account creation in PrismaAdapter. A pure access-policy function determines whether a Zoho identity is allowed before the adapter runs; unknown identities with an email are allowed, while suspended and password-linked identities are denied. A local CLI script activates an existing pending user and grants the global ADMIN assignment transactionally.

**Tech Stack:** Next.js 16 App Router, NextAuth v4, Prisma 7 with PostgreSQL, TypeScript, Zod, Vitest.

## Global Constraints

- All source code, identifiers, comments, file names, tests, and routes are English.
- All user-visible UI copy is Spanish and centralized in `src/messages`.
- No database secrets, OAuth secrets, or production URLs are committed to the repository.
- Server-side authorization is the only authorization boundary; no action trusts client-supplied role or scope state.
- New Zoho users stay `PENDING`; the first signer is never automatically promoted.
- The existing workspace has no Git repository, so omit commit commands until Git is initialized.

---

## File structure

- `src/lib/access-policy.ts`: pure OAuth admission policy, independent of Prisma or NextAuth.
- `src/lib/access-policy.test.ts`: regression coverage for pending, active, suspended, password-linked, and unknown OAuth identities.
- `src/lib/auth.ts`: calls the policy from `callbacks.signIn` while retaining adapter-owned account linking.
- `scripts/bootstrap-admin.ts`: trusted local command that promotes an existing user and creates one global ADMIN assignment without duplication.
- `scripts/bootstrap-admin.test.ts`: validates the environment input parser used by the script without connecting to a database.
- `docs/database/neon.md`: documents the trusted bootstrap procedure without including a real email or secret.
- `package.json`: exposes the bootstrap command.

### Task 0: Restore the existing Vitest setup entry point

**Files:**
- Create: `src/test/setup.ts`

**Interfaces:**
- Consumes the installed `@testing-library/jest-dom/vitest` setup module.
- Produces the matcher registration required by the already-configured `setupFiles` entry in `vitest.config.ts`.

- [ ] **Step 1: Reproduce the baseline failure**

Run: `npm test`

Expected: Vitest fails before collecting tests because `src/test/setup.ts` does not exist.

- [ ] **Step 2: Restore the missing configuration entry point**

```ts
import "@testing-library/jest-dom/vitest";
```

- [ ] **Step 3: Re-run the baseline suite**

Run: `npm test`

Expected: Vitest discovers the existing test suites instead of failing to resolve the configured setup file.


### Task 1: Add a tested OAuth admission policy

**Files:**
- Modify: `src/lib/access-policy.ts`
- Create: `src/lib/access-policy.test.ts`

**Interfaces:**
- Produces `canSignInWithZoho(identity, storedUser): boolean`.
- `identity` is `{ email?: string | null }`.
- `storedUser` is `null` or `{ accessStatus: AccessStatus; hasCredential: boolean }`.

- [ ] **Step 1: Write the failing test**

```ts
import { AccessStatus } from "@prisma/client";
import { describe, expect, it } from "vitest";

import { canSignInWithZoho } from "@/lib/access-policy";

describe("canSignInWithZoho", () => {
  it("admits a new Zoho identity with an email so the adapter can create a pending user", () => {
    expect(canSignInWithZoho({ email: "new.user@example.com" }, null)).toBe(true);
  });

  it.each([
    [{ email: null }, null],
    [{ email: "suspended@example.com" }, { accessStatus: AccessStatus.SUSPENDED, hasCredential: false }],
    [{ email: "password@example.com" }, { accessStatus: AccessStatus.ACTIVE, hasCredential: true }],
  ])("denies identities that cannot use Zoho", (identity, storedUser) => {
    expect(canSignInWithZoho(identity, storedUser)).toBe(false);
  });

  it.each([AccessStatus.PENDING, AccessStatus.ACTIVE])("admits an existing non-password Zoho user", (accessStatus) => {
    expect(canSignInWithZoho({ email: "known@example.com" }, { accessStatus, hasCredential: false })).toBe(true);
  });
});
```

- [ ] **Step 2: Run the focused test and verify it fails**

Run: `npm test -- src/lib/access-policy.test.ts`

Expected: FAIL because `canSignInWithZoho` is not exported.

- [ ] **Step 3: Implement the minimal policy**

```ts
import { AccessStatus } from "@prisma/client";

export type OAuthAccessDecision = "ACTIVE" | "PENDING" | "DENIED";

type ZohoIdentity = { email?: string | null };
type StoredOAuthUser = { accessStatus: AccessStatus; hasCredential: boolean } | null;

export function canSignInWithZoho(identity: ZohoIdentity, storedUser: StoredOAuthUser): boolean {
  if (!identity.email) return false;
  if (!storedUser) return true;
  return storedUser.accessStatus !== AccessStatus.SUSPENDED && !storedUser.hasCredential;
}

export function getOAuthAccessDecision(accessStatus: AccessStatus, hasRoleAssignment: boolean): OAuthAccessDecision {
  if (accessStatus === AccessStatus.SUSPENDED) return "DENIED";
  if (accessStatus === AccessStatus.PENDING || !hasRoleAssignment) return "PENDING";
  return "ACTIVE";
}
```

- [ ] **Step 4: Run the focused test and verify it passes**

Run: `npm test -- src/lib/access-policy.test.ts`

Expected: PASS with five assertions covering unknown, missing-email, suspended, credential-linked, pending, and active cases.

### Task 2: Use the policy in the NextAuth callback

**Files:**
- Modify: `src/lib/auth.ts`
- Modify: `src/lib/access-policy.test.ts`

**Interfaces:**
- Consumes `canSignInWithZoho({ email: user.email }, databaseUser)`.
- `findAuthorizedUser()` continues to return a user with `credential` and `roleAssignments`.
- Produces standard PrismaAdapter creation for unknown Zoho identities and the existing JWT `PENDING` decision afterward.

- [ ] **Step 1: Extend the failing test with the callback input shape**

```ts
it("admits the NextAuth profile shape for a new Zoho user", () => {
  const nextAuthUser = { email: "first-login@example.com" };
  expect(canSignInWithZoho(nextAuthUser, null)).toBe(true);
});
```

- [ ] **Step 2: Run the focused test and verify it fails before the implementation is wired**

Run: `npm test -- src/lib/access-policy.test.ts`

Expected: PASS for the pure function but no `src/lib/auth.ts` caller yet; use the source assertion below to prove the callback integration requirement.

- [ ] **Step 3: Add an integration source assertion, then run it to fail**

Create `src/lib/auth.test.ts`:

```ts
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const authSource = readFileSync(new URL("./auth.ts", import.meta.url), "utf8");

describe("Zoho auth callback", () => {
  it("delegates OAuth admission to the shared access policy", () => {
    expect(authSource).toContain("canSignInWithZoho({ email: user.email }, databaseUser)");
  });
});
```

Run: `npm test -- src/lib/auth.test.ts`

Expected: FAIL because the callback still requires `databaseUser` to exist.

- [ ] **Step 4: Implement the callback change**

Add the import:

```ts
import { canSignInWithZoho, getOAuthAccessDecision } from "@/lib/access-policy";
```

Replace the OAuth branch in `callbacks.signIn` with:

```ts
if (account?.provider === "credentials") return true;

const databaseUser = user.email ? await findAuthorizedUser(user.email) : null;
return canSignInWithZoho(
  { email: user.email },
  databaseUser
    ? { accessStatus: databaseUser.accessStatus, hasCredential: Boolean(databaseUser.credential) }
    : null,
);
```

This must not create a user inside `signIn`; NextAuth calls this callback before PrismaAdapter and the adapter owns creation and OAuth account linking.

- [ ] **Step 5: Run focused tests and type checks**

Run: `npm test -- src/lib/access-policy.test.ts src/lib/auth.test.ts && npx tsc --noEmit`

Expected: PASS, and TypeScript reports no errors.

### Task 3: Add a safe bootstrap administrator command

**Files:**
- Create: `scripts/bootstrap-admin.ts`
- Create: `scripts/bootstrap-admin.test.ts`
- Modify: `package.json`
- Modify: `vitest.config.ts`
- Modify: `docs/database/neon.md`

**Interfaces:**
- Produces `parseBootstrapAdminEmail(value: string | undefined): string`.
- `npm run db:bootstrap-admin` requires `BOOTSTRAP_ADMIN_EMAIL` and `DATABASE_URL`.
- The command only promotes a pre-existing user and records `BOOTSTRAP_ADMIN` in `AuditLog`.

- [ ] **Step 1: Write the failing input-validation test**

```ts
import { describe, expect, it } from "vitest";

import { parseBootstrapAdminEmail } from "../../scripts/bootstrap-admin";

describe("parseBootstrapAdminEmail", () => {
  it("normalizes a valid administrator email", () => {
    expect(parseBootstrapAdminEmail("  admin@example.com ")).toBe("admin@example.com");
  });

  it.each([undefined, "", "not-an-email"])('rejects %j', (value) => {
    expect(() => parseBootstrapAdminEmail(value)).toThrow("BOOTSTRAP_ADMIN_EMAIL");
  });
});
```

- [ ] **Step 2: Run the focused test and verify it fails**

Run: `npm test -- scripts/bootstrap-admin.test.ts`

Expected: FAIL because the bootstrap module does not exist.

- [ ] **Step 3: Implement the script without side effects on import**

```ts
import "dotenv/config";

import { PrismaPg } from "@prisma/adapter-pg";
import { AccessStatus, PrismaClient, ScopeType } from "@prisma/client";
import { Pool } from "pg";
import { z } from "zod";

const emailSchema = z.string().trim().email();

export function parseBootstrapAdminEmail(value: string | undefined): string {
  const result = emailSchema.safeParse(value);
  if (!result.success) throw new Error("BOOTSTRAP_ADMIN_EMAIL must be a valid email address.");
  return result.data;
}

export async function bootstrapAdmin(email: string, prisma: PrismaClient) {
  return prisma.$transaction(async (transaction) => {
    const user = await transaction.user.findUnique({ where: { email }, select: { id: true } });
    if (!user) throw new Error("Create the Zoho user first, then run the bootstrap command.");

    const role = await transaction.role.findUnique({ where: { key: "ADMIN" }, select: { id: true } });
    if (!role) throw new Error("Run npm run db:seed before bootstrapping an administrator.");

    const assignment = await transaction.userRoleAssignment.findFirst({
      where: { userId: user.id, roleId: role.id, scopeType: ScopeType.GLOBAL, countryId: null, teamId: null },
      select: { id: true },
    });
    if (!assignment) {
      await transaction.userRoleAssignment.create({
        data: { userId: user.id, roleId: role.id, scopeType: ScopeType.GLOBAL, createdById: user.id },
      });
    }
    await transaction.user.update({ where: { id: user.id }, data: { accessStatus: AccessStatus.ACTIVE } });
    await transaction.auditLog.create({
      data: { actorId: user.id, entityType: "User", entityId: user.id, action: "BOOTSTRAP_ADMIN" },
    });
  });
}

async function main() {
  const email = parseBootstrapAdminEmail(process.env.BOOTSTRAP_ADMIN_EMAIL);
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) throw new Error("DATABASE_URL is required to bootstrap an administrator.");
  const pool = new Pool({ connectionString, max: 1 });
  const prisma = new PrismaClient({ adapter: new PrismaPg(pool) });
  try {
    await bootstrapAdmin(email, prisma);
    console.log("Administrator access activated.");
  } finally {
    await prisma.$disconnect();
    await pool.end();
  }
}

if (process.argv[1]?.endsWith("bootstrap-admin.ts")) void main();
```

Add the command under `scripts` in `package.json`:

```json
"db:bootstrap-admin": "tsx scripts/bootstrap-admin.ts"
```

Extend Vitest's `include` list in `vitest.config.ts` so the script test is discovered:

```ts
include: ["src/**/*.test.ts", "src/**/*.test.tsx", "scripts/**/*.test.ts"],
```

Add this procedure to `docs/database/neon.md`:

```md
After the intended first administrator has signed in with Zoho and reached the pending-access page, run this only from a trusted administrator workstation:

```powershell
$env:BOOTSTRAP_ADMIN_EMAIL = "administrator@company.example"
npm run db:bootstrap-admin
```

The command refuses unknown users, does not create accounts, creates at most one global ADMIN role assignment, activates the user, and records an audit event. Clear the environment variable after the command completes.
```

- [ ] **Step 4: Run the focused test and schema validation**

Run: `npm test -- scripts/bootstrap-admin.test.ts && npx prisma validate`

Expected: PASS and `The schema at prisma/schema.prisma is valid`.

### Task 4: Verify the pending-access flow and preserve evidence

**Files:**
- Create: `artifacts/auth-pending-mobile.png`
- Create: `artifacts/auth-pending-tablet.png`
- Create: `artifacts/auth-pending-desktop.png`

**Interfaces:**
- Consumes valid `ZOHO_CLIENT_ID`, `ZOHO_CLIENT_SECRET`, `NEXTAUTH_SECRET`, and `DATABASE_URL` from local environment variables.
- Produces a newly persisted user with `PENDING` status, a Zoho `Account`, and screenshots of the pending route at all required breakpoints.

- [ ] **Step 1: Run the automated verification suite**

Run: `npm test && npm run lint && npm run build`

Expected: all existing and new tests pass; lint has no errors; the production build completes.

- [ ] **Step 2: Start the local application**

Run: `npm run dev`

Expected: Next.js reports a local URL, normally `http://localhost:3000`.

- [ ] **Step 3: Verify a new Zoho user manually**

1. Open `/login` in a fresh private browser session.
2. Select **Continuar con Zoho** and authenticate with an account not present in `User`.
3. Confirm the callback ends at `/access-pending`, never `/api/auth/error?error=AccessDenied`.
4. Verify in Prisma that the user has `accessStatus = PENDING`, has a Zoho `Account`, and has no role assignment.

- [ ] **Step 4: Capture the responsive evidence**

At 390×844, 768×1024, and 1440×1000, verify that the access-pending card stays readable, focus-visible, and free of horizontal scrolling. Save the captures using the three file names above.

## Plan self-review

- Coverage: Task 1 implements the admission decision; Task 2 connects it to NextAuth; Task 3 safely activates the first administrator; Task 4 verifies OAuth and all three responsive breakpoints.
- No-placeholder check: no incomplete work markers are present; every task includes test, command, implementation, and expected outcome. The script test is explicitly included in Vitest configuration.
- Type consistency: `canSignInWithZoho` accepts the `user.email` output from NextAuth; `bootstrapAdmin` receives a `PrismaClient` and uses the existing Prisma `AccessStatus` and `ScopeType` enums.
