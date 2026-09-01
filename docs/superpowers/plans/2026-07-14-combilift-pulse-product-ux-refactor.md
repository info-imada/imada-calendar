# Calendar Product UX Refactor Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Refactor Calendar into a coherent, accessible and responsive operational product while preserving the validated Prisma, permission, validation, audit and scheduling boundaries.

**Architecture:** A new presentation-only product component layer standardizes page structure, states, forms and responsive data rendering. Existing feature modules migrate incrementally; Agenda is connected to the shared real activity model, while Activities and Calendar keep their validated Server Actions.

**Tech Stack:** Next.js 16 App Router, React 19, TypeScript 5.9, Tailwind CSS 4, ShadCN/Base UI, Prisma 7/PostgreSQL, Zod 4, dnd-kit, React Big Calendar, Vitest and Testing Library.

## Global Constraints

- Preserve existing Prisma data, role scopes, Zod schemas, transactional overlap blocking and AuditLog behavior.
- Use ShadCN primitives instead of native visual controls whenever an equivalent exists.
- No `input type="date"`, `input type="datetime-local"` or `input type="time"` in feature UI.
- All visible copy is Spanish; source identifiers remain English.
- Support 320 px through ultrawide layouts without document-level horizontal overflow.
- Support light and dark themes from the same semantic tokens.
- Every behavior change starts with a failing automated test.
- The workspace is not a Git repository, so commit steps are recorded but cannot be executed.

---

### Task 1: Shared product components and visual tokens

**Files:**
- Create: `src/components/product/page.tsx`
- Create: `src/components/product/states.tsx`
- Create: `src/components/product/data-view.tsx`
- Create: `src/components/product/badges.tsx`
- Create: `src/components/product/forms.tsx`
- Test: `src/components/product/product-components.test.tsx`
- Modify: `src/app/globals.css`

**Interfaces:**
- Produces `PageContainer`, `PageHeader`, `PageToolbar`, `StatSummary`, `FilterBar`, `EmptyState`, `ErrorState`, `LoadingState`, `ResponsiveDataView`, `StatusBadge`, `PriorityBadge`, `UserAvatar`, `FormSection`, `FormActions`, `ResponsiveSheet` and `ConfirmActionDialog`.

- [ ] Write tests asserting semantic headings, compact metrics, accessible labels, desktop/mobile data containers and confirmation copy.
- [ ] Run `pnpm vitest run src/components/product/product-components.test.tsx` and confirm failure because the components do not exist.
- [ ] Implement the focused composition components using Card, Alert, Skeleton, Dialog, Sheet, Drawer, Badge and Avatar.
- [ ] Add semantic density, safe-area, focus, status and intentional-scroll tokens to `globals.css`.
- [ ] Re-run the focused test and confirm it passes.

### Task 2: Responsive ShadCN application shell

**Files:**
- Modify: `src/components/layout/app-shell.tsx`
- Test: `src/components/layout/app-shell.test.tsx`
- Modify: `src/messages/common.ts`

**Interfaces:**
- Consumes the installed `SidebarProvider`, `Sidebar`, `SidebarTrigger`, `SidebarMenuButton` and `useSidebar` APIs.
- Produces persisted desktop collapse, a route-closing mobile Sheet and one compact header.

- [ ] Add failing tests for active-route state, desktop collapse tooltip labels, mobile route close and the absence of duplicated header controls.
- [ ] Run `pnpm vitest run src/components/layout/app-shell.test.tsx` and confirm the expected failures.
- [ ] Replace the custom fixed aside with the installed ShadCN Sidebar composition.
- [ ] Persist collapse state through the Sidebar cookie contract and close mobile navigation from each route link.
- [ ] Re-run the focused test and confirm it passes.

### Task 3: Reusable TimePicker and responsive activity form

**Files:**
- Create: `src/components/forms/time-picker.tsx`
- Test: `src/components/forms/time-picker.test.tsx`
- Modify: `src/features/activities/activity-form-panel.tsx`
- Test: `src/features/activities/activity-form-panel.test.tsx`
- Modify: `src/components/forms/shadcn-control-audit.test.ts`

**Interfaces:**
- Produces `TimePicker({ value, onChange, interval, label, disabled })` with `HH:mm` values.
- Consumes `ResponsiveDatePicker`, existing activity form state and existing Server Actions.

- [ ] Add failing tests for 30-minute options, keyboard selection, disabled all-day state and no native time input.
- [ ] Run focused tests and confirm failures are caused by the missing TimePicker.
- [ ] Implement Button + Popover/Drawer + Command + ScrollArea time selection and localized labels.
- [ ] Replace both activity time inputs and reorganize fields into `FormSection` groups with sticky `FormActions`.
- [ ] Add dirty-close confirmation and preserve server field errors.
- [ ] Re-run focused tests and the native-control audit.

### Task 4: Real Agenda list and persisted Kanban

**Files:**
- Modify: `src/features/agenda/agenda-page.tsx`
- Modify: `src/features/agenda/agenda-types.ts`
- Replace: `src/features/agenda/agenda-view.tsx`
- Test: `src/features/agenda/agenda-view.test.tsx`
- Modify: `src/lib/activities/read-model.ts`

**Interfaces:**
- Consumes `ActivityWorkspaceModel`, `updateActivity`, shared badges, filters and activity form.
- Produces real metrics, persisted list/Kanban preference and optimistic status moves.

- [ ] Add failing tests proving the page no longer imports fixtures and status moves update counts, call the mutation and roll back on failure.
- [ ] Run Agenda tests and confirm the fixture and missing DnD behavior failures.
- [ ] Map the real workspace model to Agenda presentation records on the server.
- [ ] Add dnd-kit pointer, touch and keyboard sensors, droppable status columns and DragOverlay.
- [ ] Add optimistic state snapshots, Sonner success/error feedback and mutation rollback.
- [ ] Add mobile horizontal snap and a status DropdownMenu fallback.
- [ ] Re-run Agenda and activity action tests.

### Task 5: Calendar desktop controls and mobile agenda

**Files:**
- Modify: `src/features/calendar/calendar-workspace.tsx`
- Create: `src/features/calendar/mobile-calendar-agenda.tsx`
- Test: `src/features/calendar/calendar-workspace.test.tsx`
- Modify: `src/app/globals.css`

**Interfaces:**
- Consumes `CalendarEvent`, the existing activity form and shared filters/badges.
- Produces month/week/technician desktop views and day/agenda-first mobile views from one filtered event set.

- [ ] Add failing tests for team/status filters, status legend, mobile agenda grouping, slot creation and event edit.
- [ ] Run Calendar tests and confirm missing controls/mobile behavior.
- [ ] Split filtering/navigation from React Big Calendar rendering.
- [ ] Add mobile grouped agenda with date navigation and optional safe week surface.
- [ ] Add event summary popover, event count and status legend.
- [ ] Re-run Calendar tests and overlap action tests.

### Task 6: Activities responsive data workspace

**Files:**
- Split: `src/features/activities/activity-workspace.tsx`
- Create: `src/features/activities/activity-filters.tsx`
- Create: `src/features/activities/activity-list.tsx`
- Create: `src/features/activities/activity-command.tsx`
- Test: `src/features/activities/activity-workspace.test.tsx`

**Interfaces:**
- Consumes `ActivityWorkspaceModel`, `ResponsiveDataView`, `FilterBar`, Activity detail/form panels.
- Produces desktop table, tablet simplification, mobile cards, sorting and pagination.

- [ ] Add failing tests for mobile card semantics, sort order, page navigation, filter clearing and command selection.
- [ ] Run focused tests and confirm the new responsive behaviors are absent.
- [ ] Extract filters, command and data rendering into focused files without changing the model.
- [ ] Implement stable sorting and pagination over the filtered collection.
- [ ] Add DropdownMenu row/card actions and shared empty/loading states.
- [ ] Re-run Activities and activity action tests.

### Task 7: Compact Administration CRUD surfaces

**Files:**
- Replace: `src/features/administration/administration-page.tsx`
- Modify: `src/app/actions/administration.ts`
- Modify: `src/lib/validations/administration.ts`
- Test: `src/features/administration/administration-page.test.tsx`
- Test: `src/app/actions/administration.test.ts`

**Interfaces:**
- Consumes existing scoped administration permission and AuditLog transaction pattern.
- Produces compact country/team Dialog forms, edit/deactivate actions and accessible user access rows.

- [ ] Add failing component tests proving country/team forms use dialogs with cancel/save actions and inline errors.
- [ ] Add failing action tests for update/deactivate validation, authorization and matching AuditLog writes.
- [ ] Run focused tests and confirm missing action failures.
- [ ] Implement minimal update/deactivate schemas and transactional Server Actions using existing fields and audit conventions.
- [ ] Replace large cards and Sheets with dense list rows, DropdownMenu actions, Dialog forms and confirmation dialogs.
- [ ] Re-run Administration component/action tests and database verification.

### Task 8: Accessibility, performance and visual matrix

**Files:**
- Modify focused tests across `src/components` and `src/features`.
- Create screenshots under `artifacts/product-refactor/`.

**Interfaces:**
- Consumes all prior tasks.
- Produces fresh automated results and visual evidence in both themes.

- [ ] Run `pnpm test`, `pnpm exec tsc --noEmit`, `pnpm lint`, `pnpm prisma validate` and `pnpm build`; fix every error and report the existing TanStack compiler warning separately if it remains.
- [ ] Verify keyboard navigation, focus restoration, accessible names, reduced motion and no prohibited native controls.
- [ ] Verify 320×568, 375×667, 390×844, 430×932, 768×1024, 1024×768, 1280×720, 1366×768, 1440×900 and 1920×1080 in light and dark.
- [ ] Exercise login session, activity create/edit, overlap rejection, Kanban move, Calendar slot creation, command search and Administration dialog flows.
- [ ] Save and inspect key before/after screenshots and check console errors.

## Plan self-review

- Spec coverage: tasks map to all seven requested phases plus the audit and shared architecture.
- Placeholder scan: no `TBD`, deferred implementation or undefined interface remains.
- Type consistency: Agenda, Activities and Calendar all consume `ActivityWorkspaceModel`; `TimePicker` consistently uses `HH:mm`; shared product components remain feature-independent.
- Scope: no Prisma schema migration is introduced unless an existing model cannot represent a requested Administration state.
