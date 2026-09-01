# Operational Toolbar Redesign Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build one responsive, surface-free toolbar pattern and apply it consistently to Agenda, Calendar, Activities, Team, and Administration.

**Architecture:** `OperationalToolbar` owns the two-level responsive layout while each workspace continues to own state and behavior. `FilterBar` remains the responsive filter adapter: transparent inline controls above mobile and a ShadCN Drawer below 640 px.

**Tech Stack:** Next.js 16 App Router, React 19, TypeScript, Tailwind CSS 4, ShadCN UI, Vitest, React Testing Library.

## Global Constraints

- Work only on `master`; do not create a worktree or auxiliary branch.
- Preserve all existing dirty user changes.
- Do not change Prisma, permissions, authentication, Server Actions, Zod, audit, recurrence, or overlap logic.
- Verify at 390 × 844, 768 × 1024, and 1440 × 900 in light and dark themes.

---

### Task 1: Shared toolbar primitives

**Files:**
- Modify: `src/components/product/page.tsx`
- Modify: `src/components/product/product-components.test.tsx`

**Interfaces:**
- Produces: `OperationalToolbar({ children, className, context, label, meta })`.
- Changes: desktop `FilterBar` is transparent and padding-free; mobile Drawer contract stays stable.

- [ ] Add failing tests asserting `data-slot="operational-toolbar"`, separate context/control rows, and absence of `card-enterprise`.
- [ ] Run `npm test -- src/components/product/product-components.test.tsx` and confirm the new assertions fail.
- [ ] Implement the minimal shared layout and transparent desktop `FilterBar`.
- [ ] Re-run the focused test and confirm it passes.

### Task 2: Agenda, Calendar, and Activities

**Files:**
- Modify: `src/features/agenda/agenda-view.tsx`
- Modify: `src/features/agenda/agenda-view.test.tsx`
- Modify: `src/features/calendar/calendar-workspace.tsx`
- Modify: `src/features/calendar/calendar-workspace.test.tsx`
- Modify: `src/features/activities/activity-workspace.tsx`
- Modify: `src/features/activities/activity-workspace.test.tsx`

**Interfaces:**
- Consumes: `OperationalToolbar` and `FilterBar`.
- Preserves: existing filters, tabs, date-range values, quick search, create flows, and empty states.

- [ ] Add failing assertions that each module exposes the shared toolbar and no longer wraps filters in `card-enterprise`.
- [ ] Run the three focused test files and confirm failure for the missing layout.
- [ ] Compose each module into context and control rows with responsive grid classes.
- [ ] Re-run the focused tests and confirm they pass.

### Task 3: Team and Administration

**Files:**
- Modify: `src/features/team/team-workspace.tsx`
- Create: `src/features/team/team-workspace.test.tsx`
- Modify: `src/features/administration/administration-page.tsx`
- Create or modify: `src/features/administration/administration-page.test.tsx`

**Interfaces:**
- Team produces client-side search and availability filtering over the existing `members` prop.
- Administration places tabs and creation actions in `OperationalToolbar` without changing actions or permissions.

- [ ] Add failing Team tests for search, availability filter, result count, and toolbar structure.
- [ ] Add failing Administration tests for toolbar tabs and creation actions.
- [ ] Implement Team filtering with ShadCN Input and Select.
- [ ] Recompose Administration tabs/actions into the shared toolbar.
- [ ] Run both focused test files and confirm they pass.

### Task 4: Verification and design QA

**Files:**
- Modify: `design-qa.md`
- Create: ignored captures under `artifacts/toolbar-refactor/`.

**Interfaces:**
- Produces: six viewport/theme captures for representative toolbars plus a passed QA report.

- [ ] Run `npm test`, `npm run lint`, and `npm run build`.
- [ ] Start the app from the main project directory and verify real authenticated module routes.
- [ ] Capture reference and implementation together for visual comparison.
- [ ] Verify no page overflow, clipped controls, boxed toolbar surface, or illegible focus/borders.
- [ ] Record `final result: passed` only after P0/P1/P2 issues are resolved.
