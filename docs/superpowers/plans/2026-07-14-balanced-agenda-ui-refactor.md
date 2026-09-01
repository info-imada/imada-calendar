# Balanced Agenda UI Refactor Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Apply the approved Balanceado design system to Agenda, preserve all validated operational behavior, enforce coherent activity times, and verify the result in both themes at three responsive breakpoints.

**Architecture:** Keep the existing App Router, Prisma read model, Server Actions, dnd-kit interactions, and ShadCN/Base UI primitives. Add the token contract in the existing `globals.css`, introduce opt-in visual variants in shared product components, and migrate only Agenda to those variants. Mirror temporal validation in a small pure helper used by the form and its tests, while retaining server-side Zod validation.

**Tech Stack:** Next.js 16 App Router, React 19, TypeScript, Tailwind v4, ShadCN/Base UI, next-themes, Vitest, React Testing Library, Prisma.

## Global Constraints

- `ThemeProvider` remains `attribute="class"`, `defaultTheme="dark"`, `enableSystem={false}`.
- Theme selectors remain `:root, .dark` and `.light`; do not add an identity `value` mapping.
- Edit `C:\Users\anyel\Documents\Calendar\src\app\globals.css` in place; preserve all existing semantic RGB variables and status/calendar consumers.
- Do not alter Prisma models, permissions, audit behavior, drag and drop contracts, or existing Server Action signatures.
- Agenda verification viewports are 390 × 844, 768 × 1024, and 1440 × 900 in both light and dark themes.
- Do not add a dependency unless the current ShadCN/Base UI set cannot provide the required behavior.

---

### Task 1: Add the Balanceado token contract without duplicate semantic variables

**Files:**
- Modify: `src/app/globals.css` in `@theme inline`, `:root, .dark`, `.light`, and component utility layers.
- Test: `src/app/design-system.test.ts`

**Interfaces:**
- Consumes: existing `--brand-rgb`, `--success-rgb`, `--warning-rgb`, `--danger-rgb`, `--info-rgb`, `.status-*`, and calendar status classes.
- Produces: `--text-page-title`, `--text-section-title`, `--text-body`, `--text-caption`, `--text-overline`, density/control tokens, `--border-subtle`, `--border-strong`, `--input-border`, `--surface-inset`, and the compact utility classes used by later Agenda tasks.

- [ ] **Step 1: Write the failing token contract test**

Add a pure source contract test to `src/app/design-system.test.ts` that reads `src/app/globals.css` and asserts the required selectors/tokens exist exactly once per theme:

```ts
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const globals = readFileSync(resolve(process.cwd(), "src/app/globals.css"), "utf8");

describe("balanced design tokens", () => {
  it("keeps the explicit next-themes contract and compact tokens", () => {
    expect(globals).toMatch(/:root,\s*\.dark\s*\{/);
    expect(globals).toMatch(/\.light\s*\{/);
    expect(globals).toContain("--text-page-title");
    expect(globals).toContain("--stat-pill-height");
    expect(globals).toContain("--input-border");
    expect(globals.match(/--brand-rgb\s*:/g)?.length).toBe(2);
    expect(globals.match(/--success-rgb\s*:/g)?.length).toBe(2);
    expect(globals).not.toMatch(/:root:not\(\.dark\)/);
  });
});
```

- [ ] **Step 2: Run the focused test and verify it fails**

Run `pnpm vitest run src/app/design-system.test.ts`.

Expected: FAIL because the new Balanceado tokens are not yet present.

- [ ] **Step 3: Merge the token values in place**

Update the existing theme blocks rather than appending a second theme block. Add the approved typography, density, control, KPI, surface, border, and shadow variables. Keep each existing RGB semantic variable exactly once in `:root, .dark` and once in `.light`; do not add absent `stage-rgb` or `delivered-rgb` variables without a consumer.

Add these utilities in `@layer components`:

```css
.page-heading-compact {
  font-size: var(--text-page-title);
  line-height: var(--leading-page-title);
  font-weight: 600;
  letter-spacing: -0.025em;
}

.stat-pill {
  min-height: var(--stat-pill-height);
  border: 1px solid var(--border);
  border-radius: var(--radius-md);
  background: var(--surface-1);
  padding-inline: var(--stat-pill-padding-x);
}

.form-section-compact {
  border: 1px solid var(--border-subtle);
  border-radius: var(--radius-lg);
  background: var(--surface-1);
  padding: 0.75rem;
}

.control-surface {
  border-color: var(--input-border);
  background: var(--input);
}

.control-surface:focus-visible {
  border-color: var(--ring);
  box-shadow: 0 0 0 3px rgb(var(--brand-rgb) / 0.18);
}
```

- [ ] **Step 4: Run the focused test and verify it passes**

Run `pnpm vitest run src/app/design-system.test.ts`.

Expected: PASS with no duplicate RGB declarations and no `:root:not(.dark)` selector.

- [ ] **Step 5: Commit the token-only change**

Run `git add src/app/globals.css src/app/design-system.test.ts && git commit -m "feat: add balanced design tokens"`.

---

### Task 2: Add opt-in compact page header and KPI pills

**Files:**
- Modify: `src/components/product/page.tsx`
- Modify: `src/components/product/product-components.test.tsx`
- Modify: `src/features/agenda/agenda-view.tsx`

**Interfaces:**
- Consumes: existing `PageHeader`, `StatSummary`, `StatSummaryItem`.
- Produces: `PageHeader` prop `density?: "default" | "compact"` and `StatSummary` prop `variant?: "cards" | "pills"`, with Agenda passing the compact variants explicitly.

- [ ] **Step 1: Write failing component tests**

Extend `src/components/product/product-components.test.tsx` with:

```tsx
it("renders compact header and stat pills", () => {
  render(
    <>
      <PageHeader density="compact" description="Descripción" eyebrow="OPERACIÓN" title="Agenda" />
      <StatSummary items={[{ label: "Hoy", value: 3 }]} variant="pills" />
    </>,
  );
  expect(screen.getByRole("heading", { name: "Agenda" })).toHaveClass("page-heading-compact");
  expect(screen.getByRole("heading", { name: "Agenda" }).closest("header")).toHaveClass("page-header-compact");
  expect(screen.getByText("Hoy").closest("div")).toHaveClass("stat-pill");
});
```

- [ ] **Step 2: Run the focused test and verify it fails**

Run `pnpm vitest run src/components/product/product-components.test.tsx`.

Expected: FAIL because the new props/classes do not exist.

- [ ] **Step 3: Implement opt-in variants**

In `PageHeader`, apply `page-heading-compact` and `page-header-compact` only when `density === "compact"`; retain current classes for the default variant. In `StatSummary`, render a horizontally scrollable `dl` with `stat-pill` items when `variant === "pills"`; retain the existing card grid as the default. Use `aria-label`/visually hidden helper text for any helper omitted visually.

In `AgendaView`, pass `density="compact"` to `PageHeader` and `variant="pills"` to its summary. Keep the existing item labels, values, icons, filters, tabs, DnD sensors, toasts, and action handlers unchanged.

- [ ] **Step 4: Run focused tests**

Run `pnpm vitest run src/components/product/product-components.test.tsx src/features/agenda/agenda-view.test.tsx`.

Expected: all tests PASS.

- [ ] **Step 5: Commit the Agenda header/KPI change**

Run `git add src/components/product/page.tsx src/components/product/product-components.test.tsx src/features/agenda/agenda-view.tsx && git commit -m "feat: compact agenda header and KPI pills"`.

---

### Task 3: Enforce coherent start/end times in the activity form

**Files:**
- Create: `src/lib/dates/validate-activity-time-range.ts`
- Create: `src/lib/dates/validate-activity-time-range.test.ts`
- Modify: `src/features/activities/activity-form-panel.tsx`
- Modify: `src/features/activities/activity-form-panel.test.tsx`

**Interfaces:**
- Produces: `validateActivityTimeRange(input): { valid: true; durationMinutes: number } | { valid: false; message: string }`.
- Consumes: local `Date` values and existing `combineLocalDateAndTime` output.

- [ ] **Step 1: Write the failing pure helper tests**

Create `src/lib/dates/validate-activity-time-range.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { validateActivityTimeRange } from "./validate-activity-time-range";

describe("validateActivityTimeRange", () => {
  it("accepts an end after the start", () => {
    const result = validateActivityTimeRange({
      startsAt: new Date("2026-07-14T09:00:00"),
      endsAt: new Date("2026-07-14T11:00:00"),
    });
    expect(result).toEqual({ valid: true, durationMinutes: 120 });
  });

  it("rejects equal or earlier end times", () => {
    expect(validateActivityTimeRange({ startsAt: new Date("2026-07-14T11:00:00"), endsAt: new Date("2026-07-14T11:00:00") }).valid).toBe(false);
    expect(validateActivityTimeRange({ startsAt: new Date("2026-07-14T23:00:00"), endsAt: new Date("2026-07-14T01:00:00") }).valid).toBe(false);
  });
});
```

- [ ] **Step 2: Run the focused test and verify it fails**

Run `pnpm vitest run src/lib/dates/validate-activity-time-range.test.ts`.

Expected: FAIL because the helper file does not exist.

- [ ] **Step 3: Implement the helper and form guard**

Implement the helper by comparing `endsAt.getTime()` and `startsAt.getTime()`, returning the positive duration in minutes or `{ valid: false, message: "La hora de fin debe ser posterior a la hora de inicio." }`.

In `ActivityForm.submit`, after combining date/time values and before `startTransition`, call the helper. On invalid output, set `formError` to the returned message, attach the error to the Programming section, and return without invoking `createActivity` or `updateActivity`. Keep the existing server action and Zod validation intact.

- [ ] **Step 4: Add form interaction coverage**

Extend `activity-form-panel.test.tsx` to set the start and end time pickers to an equal time, submit, assert the validation message is visible, and assert the mocked action was not called. Add a second case with start date July 14 at 23:00 and end date July 15 at 01:00, assert it succeeds, and explicitly document that crossing midnight requires the next calendar date.

- [ ] **Step 5: Run focused tests and commit**

Run `pnpm vitest run src/lib/dates/validate-activity-time-range.test.ts src/features/activities/activity-form-panel.test.tsx`.

Expected: all tests PASS.

Run `git add src/lib/dates/validate-activity-time-range.ts src/lib/dates/validate-activity-time-range.test.ts src/features/activities/activity-form-panel.tsx src/features/activities/activity-form-panel.test.tsx && git commit -m "fix: validate activity time ranges"`.

---

### Task 4: Apply compact Agenda surfaces and form density

**Files:**
- Modify: `src/features/agenda/agenda-view.tsx`
- Modify: `src/components/product/forms.tsx`
- Modify: `src/features/activities/activity-form-panel.tsx`

**Interfaces:**
- Consumes: token utilities, compact PageHeader/StatSummary variants, and time validation from Tasks 1–3.
- Produces: Agenda filters, Kanban/list cards, and the activity Sheet/Drawer using compact surfaces without changing behavior.

- [ ] **Step 1: Write visual-class assertions**

Add tests asserting Agenda exposes the compact filter toolbar, `stat-pill` summary, and the form sections with `form-section-compact` when the create action opens.

- [ ] **Step 2: Run the focused tests and verify the assertions fail**

Run `pnpm vitest run src/features/agenda/agenda-view.test.tsx src/features/activities/activity-form-panel.test.tsx`.

Expected: the new class assertions fail.

- [ ] **Step 3: Apply the minimal layout classes**

Use the existing `FilterBar`, `PageToolbar`, `FormSection`, `FormActions`, `ResponsiveSheet`, `Drawer`, `Select`, `Input`, `Textarea`, `Checkbox`, `ResponsiveDatePicker`, and `TimePicker`. Replace only spacing/surface classes with the new tokens; preserve all labels, keyboard handlers, mobile Drawer behavior, and Server Action callbacks.

- [ ] **Step 4: Run focused tests**

Run `pnpm vitest run src/features/agenda/agenda-view.test.tsx src/features/activities/activity-form-panel.test.tsx src/components/product/product-components.test.tsx`.

Expected: all tests PASS.

- [ ] **Step 5: Commit**

Run `git add src/features/agenda/agenda-view.tsx src/components/product/forms.tsx src/features/activities/activity-form-panel.tsx && git commit -m "feat: tighten agenda surfaces and activity form"`.

---

### Task 5: Run the complete automated verification

**Files:**
- No source changes expected.

- [ ] **Step 1: Run the full suite**

Run `pnpm vitest run`.

Expected: every existing and new test passes.

- [ ] **Step 2: Run TypeScript and lint**

Run `pnpm exec tsc --noEmit` and `pnpm lint`.

Expected: TypeScript exits 0; lint exits 0 with at most the known TanStack `useReactTable()` compiler warning.

- [ ] **Step 3: Run the production build**

Run `pnpm build`.

Expected: Next.js compiles, type-checks, generates all routes, and exits 0.

---

### Task 6: Capture Agenda in both themes and all breakpoints

**Files:**
- Create: `artifacts/product-refactor/phase-5-agenda-390-light.png`
- Create: `artifacts/product-refactor/phase-5-agenda-390-dark.png`
- Create: `artifacts/product-refactor/phase-5-agenda-768-light.png`
- Create: `artifacts/product-refactor/phase-5-agenda-768-dark.png`
- Create: `artifacts/product-refactor/phase-5-agenda-1440-light.png`
- Create: `artifacts/product-refactor/phase-5-agenda-1440-dark.png`

- [ ] **Step 1: Open the running local app in the approved in-app browser**

Use the existing local dev server and navigate to `/dashboard` after authentication is available. Do not use a different browser surface.

- [ ] **Step 2: Capture light and dark at 390 × 844**

Verify the KPI strip, mobile filter Drawer trigger, Kanban/list content, primary CTA, and the absence of document-level horizontal overflow. Save the two named files.

- [ ] **Step 3: Capture light and dark at 768 × 1024**

Verify tablet sidebar behavior, compact header, toolbar wrapping, and Kanban width. Save the two named files.

- [ ] **Step 4: Capture light and dark at 1440 × 900**

Verify one-row header/actions, four compact KPI pills, aligned filters, dense Kanban/list columns, and Sheet form surface. Save the two named files.

- [ ] **Step 5: Inspect each capture**

Check focus/contrast, borders, badge legibility, touch target size, and no clipped content. Record any mismatch and fix it before marking the task complete.

- [ ] **Step 6: Commit artifacts and final Agenda changes**

Run `git add src artifacts/product-refactor/phase-5-agenda-*.png && git commit -m "feat: finish balanced agenda ui refactor"`.
