# Calendar Mobile-First UX Simplification Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Convert Calendar into a simple mobile-first operational application with Agenda as the single activity hub.

**Architecture:** Preserve the existing Prisma read model, Server Actions, authorization, validation, and audit boundaries. Recompose the client experience into focused responsive components, keep advanced controls behind explicit disclosure, and retain old activity URLs as compatibility redirects.

**Tech Stack:** Next.js 16 App Router, React 19, TypeScript 5.9, Tailwind CSS 4, ShadCN/Base UI, Vitest, React Testing Library, agent-browser.

## Global Constraints

- Work directly on `master`; do not create a worktree.
- Do not change Prisma schema, migrations, Server Action contracts, authorization precedence, or AuditLog behavior.
- Keep all user-facing copy in Spanish and all authorization decisions server-side.
- Support 320 px through ultrawide screens, WCAG 2.2 AA, 44 px mobile targets, both themes, and no document-level horizontal overflow.
- Do not commit, push, or publish without separate authorization.

---

### Task 1: Real-user responsive shell

**Files:** Modify `src/components/layout/app-shell.tsx`, `src/app/(app)/layout.tsx`, `src/components/providers/theme-provider.tsx`, and shell tests. Remove unused demo components under `src/components/` only after confirming zero consumers.

**Interfaces:** `AppShell` consumes a serializable user identity and navigation capability flags. It produces desktop sidebar navigation, mobile bottom navigation, and a real user menu with theme and sign-out.

- [ ] Add failing tests for permission-aware links, absence of fake notifications/status, mobile navigation labels, real identity, and sign-out.
- [ ] Run `pnpm exec vitest run src/components/layout/app-shell.test.tsx src/app/app-layout.test.tsx` and verify the new assertions fail.
- [ ] Implement the shell contract, pass identity/capabilities from the server layout, and set first-visit theme to system preference.
- [ ] Re-run the focused tests and remove confirmed dead template files.

### Task 2: Agenda as the single activity hub

**Files:** Modify `src/features/agenda/agenda-view.tsx`, its state/tests, `/activities` routes, shared activity presentation components, and message copy.

**Interfaces:** Agenda accepts `ActivityWorkspaceModel`; quick filters use `all | today | mine | unassigned | pending`; `activity` query opens a scoped detail. `/activities` redirects to `/dashboard`, and `/activities/:id` redirects to `/dashboard?activity=:id` after its current access checks.

- [ ] Add failing tests for quick filters, chronological grouping, cancelled-history visibility, mobile grouped status view, route redirects, and query-driven detail.
- [ ] Run the focused Agenda and route tests and verify failures are caused by missing behavior.
- [ ] Extract a single adaptive activity list and status view, remove duplicate command search/KPIs, and implement progressive filters.
- [ ] Re-run focused tests and confirm list/status actions use the existing activity mutations.

### Task 3: Guided activity creation and progressive detail

**Files:** Modify activity form/detail components, shared responsive sheet/form primitives, and their tests.

**Interfaces:** `ActivityFormFlow` exposes three steps (`activity`, `schedule`, `assignment`) plus collapsed advanced options. `ResponsiveSheet` accepts `mobileMode="fullscreen"`. Activity detail exposes summary, comments, conditional history, and secondary edit/cancel actions.

- [ ] Add failing tests for step navigation, safe defaults, conditional team/recurrence fields, error focus, mobile fullscreen mode, conditional audit history, and preserved entered values.
- [ ] Run focused tests and verify the new behaviors fail.
- [ ] Implement the step flow without changing action payloads, preserve dirty-close confirmation, and simplify detail actions.
- [ ] Re-run activity tests and verify create/edit/status/comment/cancel behaviors.

### Task 4: Mobile calendar agenda

**Files:** Modify calendar workspace/model and tests; reuse shared activity list/detail.

**Interfaces:** `MobileCalendarAgenda` receives filtered calendar events, visible date, navigation callbacks, create callback, and detail callback. React Big Calendar remains mounted only for tablet/desktop presentation.

- [ ] Add failing tests for grouped mobile events, previous/today/next navigation, empty recovery actions, and detail-before-edit behavior.
- [ ] Run calendar tests and verify failures.
- [ ] Implement the mobile agenda, remove the permanent legend, and route all event selection through ActivityDetailPanel.
- [ ] Re-run calendar tests at model and component levels.

### Task 5: Simplified team and administration

**Files:** Modify team workspace, managed-user flow, administration page, and their tests.

**Interfaces:** Team detail has `summary`, `access`, and conditional `advanced`; managed-user creation has identity, access method, role/scope, and confirmation steps. Administration exposes only territories and roles/permissions.

- [ ] Add failing tests for removed duplicate metrics/users tab, progressive advanced access, guided user creation, and permission-safe actions.
- [ ] Run Team and Administration tests and verify failures.
- [ ] Implement the simpler directory/detail flows, preserve confirmation for sensitive actions, and hide internal keys/priorities behind disclosure.
- [ ] Re-run focused tests including authorization action suites.

### Task 6: Authentication and global states

**Files:** Modify auth pages/forms, message copy, root metadata, and authentication tests.

**Interfaces:** Zoho is primary when configured; local credentials expand explicitly. Pending access supports sign-out. Password change reports individual requirements and visibility. Internal routes use noindex metadata.

- [ ] Add failing tests for progressive local login, pending sign-out, password requirements/visibility, and robots metadata.
- [ ] Run focused auth/layout tests and verify failures.
- [ ] Implement the flows with existing NextAuth providers and authentication actions.
- [ ] Re-run focused tests.

### Task 7: Integration verification

**Files:** Update `.ai/UI_GUIDE.md`, `.ai/MODULES.md`, and `.ai/CHANGELOG_CONTEXT.md` to reflect the final implemented behavior.

**Interfaces:** No new runtime interface; documentation records the unified route and responsive contracts.

- [ ] Run `pnpm test`, `pnpm lint`, `pnpm build`, and `git diff --check`.
- [ ] Start the built application and use agent-browser for WCAG and overflow checks at 320×568, 390×844, 768×1024, 1024×768, 1440×900, and 1920×1080 in light/dark modes.
- [ ] Exercise login, Agenda list/status, activity create/detail, Calendar mobile/desktop, Team, and Administration with an authorized test account.
- [ ] Review the full diff for secrets, unrelated changes, dead imports, and compliance with the approved UX specification.
