# Calendar Functional Modules Design

## Goal

Deliver the remaining Calendar operational modules as authenticated, responsive, database-backed workflows: Zoho onboarding, activities, calendar, team, comments and notifications, and administration.

## Product and visual direction

The application retains the approved Combilift brand tokens and Spanish copy. Its operational density, hierarchy, persistent navigation, compact filters, and readable data surfaces follow the previously reviewed Manufacturing OS reference without reusing its branding, copy, assets, or implementation.

All user-facing controls use existing ShadCN primitives where applicable. Sheets or Drawers keep create and edit flows in context; Dialogs protect destructive actions; Sonner communicates mutation results; Alert presents recoverable errors and system notices; Tabs, Command, Skeleton, Select, Table, Badge, Tooltip, and responsive Sidebar support their respective interaction patterns.

## Authentication and initial administration

### Zoho onboarding

NextAuth invokes `callbacks.signIn` before PrismaAdapter creates a new OAuth user. The callback therefore permits an unknown Zoho identity only when Zoho supplies a non-empty email address. PrismaAdapter creates the `User` and Zoho `Account` in its normal callback flow; the schema default sets `accessStatus` to `PENDING`.

Existing OAuth users are accepted unless they are suspended or have a password credential. A password credential is never automatically linked to an OAuth identity. The JWT derives `accessDecision` from the persisted user; the existing proxy redirects `PENDING` users to `/access-pending`.

### First administrator

The application never grants administrator access based on sign-in order. A local administrator-only bootstrap script accepts an explicit `BOOTSTRAP_ADMIN_EMAIL`, finds that already-created pending user, assigns a global `ADMIN` role, and changes the status to `ACTIVE` transactionally. It cannot create an account, is not exposed by HTTP, and will be documented for trusted local execution only.

## Architecture

- Server Components query Prisma and render route-level loading, empty, and error boundaries.
- Client components own local interaction state only: filters, sheets, dialogs, optimistic presentation where safe, and toast feedback.
- Server Actions validate input with Zod, load the current active user, enforce role and scope permissions, mutate Prisma transactionally, append an audit event where relevant, and revalidate affected routes.
- Resource queries always constrain activity, team, comment, notification, and administration data to effective permission scopes. Mutation authorization is repeated server-side.
- User-visible copy remains centralized under `src/messages`; internal code remains English.

## Delivery order

Each delivery is implemented and verified before the next starts. For each module, the delivery evidence includes dark and light screenshots at 390 px, 768 px, and 1440 px after interaction checks at each size.

### 1. Authentication foundation

- Permit unknown Zoho OAuth users so the adapter creates pending records.
- Add focused authorization tests for unknown, suspended, credential-linked, pending, and active users.
- Add the trusted bootstrap administrator script and usage documentation.
- Validate an end-to-end local OAuth callback through the pending-access route once provider credentials are available.

### 2. Activities

- Replace UI fixtures with scoped Prisma queries for list and Kanban work surfaces.
- Add filterable search by title, description, technician, country, status, priority, and date range.
- Implement create, edit, assignment, status transition, and cancellation workflows in Sheets/Drawers.
- Validate activity input and reject invalid scheduling ranges or technician conflicts. Enforce `activity:create`, `activity:update`, and `activity:assign` by scope.
- Use confirmation Dialogs for cancellation and mutation feedback via Sonner.

### 3. Calendar

- Render real activities in responsive day, week, and month views.
- Preserve the same scope filters as Activities and open the activity Sheet from an event or empty time slot.
- Make mobile prioritize day and agenda views while retaining an accessible date navigator.

### 4. Team

- Render active and pending people with role, scope, country, team, workload, and availability summaries.
- Let authorized managers manage availability and team membership through validated Sheets.
- Make per-user data obey the requesting user's scope.

### 5. Comments and notifications

- Add activity comments with `activity:comment` authorization and audit events.
- Create in-app notifications for assignments, schedule/status changes, and new comments that affect an assignee or activity owner.
- Provide an accessible notification Sheet with unread count, mark-one-read, and mark-all-read operations.

### 6. Administration

- Provide administration pages for pending access requests, activation/suspension, role assignments, country/team scope, operational catalogs, and audit-log review.
- Limit all administration routes and actions to explicit permissions. Suspending a user immediately prevents future access.
- Role assignment, access status, and catalog changes are transactional and audited.

## Permissions

The existing role matrix remains the source of truth. It will be extended only where an explicit operation lacks a permission key: user access management, role assignment management, notification read/update, and catalog management. Administrators have all permissions; Lead and Coordinator permissions remain constrained to their documented duties and scope. A permission check does not rely on client state.

## Data model and migrations

The current schema already covers activities, comments, availability, notifications, users, roles, teams, countries, and audit logs. A migration is added only when an operation needs a persisted field or index not represented by the current schema. New notifications include a route or activity reference only if needed to make the notification actionable; no generic JSON overload is introduced without a concrete UI consumer.

## Error handling and accessibility

- Forms expose field-level Zod errors, submit state, and non-sensitive failure messages.
- Server failures return typed action results and are displayed in Alert/Sonner without exposing implementation details.
- Every icon-only control has an accessible name and tooltip; forms use labels; dialogs return focus to their trigger; tables retain compact responsive alternatives.
- Loading states use Skeleton; empty states include the permitted next action; error states include a retry route or recovery guidance.

## Verification

- Unit and component coverage uses Vitest and Testing Library. Every behavior change follows a failing-test, minimal-implementation, passing-test cycle.
- Prisma schema validation, migration verification, linting, and production build run after each completed module.
- Browser verification covers authenticated flows and responsive interaction at `<640 px`, `640-1024 px`, and `>1024 px`; screenshots are retained as delivery evidence.
- Security checks cover authorization denial, suspended users, pending users, scope boundaries, and no automatic account linking.

## Non-goals

- No automatic promotion of the first Zoho user.
- No email/SMS delivery provider or external realtime service in this delivery; notifications are persisted in-app.
- No copied Manufacturing OS content or design assets.
