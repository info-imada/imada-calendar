# Activities Module Implementation Plan

> **For agentic workers:** Execute task-by-task with a failing test before each behavior change and fresh repository verification before declaring the module complete.

**Goal:** Deliver a scoped, audited and responsive Activities workspace backed by Prisma, including creation, editing, reassignment, status changes, cancellation, overlap blocking, filters, detail comments/audit, and bounded basic recurrence.

**Architecture:** A Server Component builds a scope-constrained read model from Prisma. Client components own filters and panel state only. Server Actions repeat Zod validation and permission checks, validate catalog relationships, block technician overlaps, write activities/comments/audit rows transactionally, and revalidate Activities, Agenda and Calendar routes.

**Tech stack:** Next.js 16 App Router, React 19, TypeScript, Prisma/PostgreSQL, Zod 4, ShadCN UI/Base UI, cmdk, Sonner, Vitest and Testing Library.

---

### Task 1: Scheduling and recurrence contracts

**Files:**
- Modify: `src/lib/validations/activity.ts`
- Create: `src/lib/validations/activity.test.ts`
- Create: `src/lib/activities/schedule.ts`
- Create: `src/lib/activities/schedule.test.ts`

- [x] Validate create/update/status/comment inputs, optional bounded recurrence and end-after-start.
- [x] Generate daily, weekly or monthly occurrence windows while preserving duration and enforcing a maximum of 60 occurrences.
- [x] Detect overlap between generated windows before any database write.

### Task 2: Scoped read model and transactional actions

**Files:**
- Create: `src/lib/activities/read-model.ts`
- Create: `src/lib/activities/read-model.test.ts`
- Modify: `src/app/actions/activities.ts`
- Create: `src/app/actions/activities.test.ts`

- [x] Build an activity `where` clause from GLOBAL, COUNTRY and TEAM assignments, including a user's own created/assigned records.
- [x] Implement create and recurring create with relationship validation and overlap blocking.
- [x] Implement edit, reassignment, status transition, cancellation and comments with explicit audit actions.
- [x] Repeat permission checks against the resource scope for every mutation and return typed, non-sensitive failures.

### Task 3: Responsive Activities workspace

**Files:**
- Create: `src/app/(app)/activities/page.tsx`
- Create: `src/app/(app)/activities/loading.tsx`
- Create: `src/app/(app)/activities/error.tsx`
- Create: `src/features/activities/activity-types.ts`
- Create: `src/features/activities/activity-workspace.tsx`
- Create: `src/features/activities/activity-form-panel.tsx`
- Create: `src/features/activities/activity-detail-panel.tsx`
- Create: `src/features/activities/activity-workspace.test.tsx`
- Modify: `src/messages/common.ts`

- [x] Render real metrics, compact filters, desktop/tablet table and mobile cards.
- [x] Add Command quick search, empty/error/loading states, Sheet on larger screens and Drawer on mobile.
- [x] Add edit/reassign/status/cancel controls and detail Tabs for summary, comments and audit.
- [x] Show field errors, conflict Alerts and Sonner feedback without exposing implementation details.

### Task 4: End-to-end verification and responsive evidence

**Files:**
- Create: `artifacts/activities-mobile.png`
- Create: `artifacts/activities-tablet.png`
- Create: `artifacts/activities-desktop.png`
- Create: `artifacts/activities-audit-desktop.png`

- [x] Seed catalogs and authenticate as the demo GLOBAL ADMIN.
- [x] Create an assigned activity from the UI, prove a conflicting activity is blocked, edit/reassign/change status, add a comment and confirm audit rows.
- [x] Verify search and all six filters against persisted data.
- [x] Capture populated Activities at 390×844, 768×1024 and 1440×1000 with no page overflow.
- [x] Run `npm test`, `npm run lint`, `npx prisma validate`, `npm run build` and inspect browser console errors.
