# Responsive Activity Detail Pattern Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a reusable responsive detail-panel pattern and apply it to Activity Detail without changing validated operational behavior.

**Architecture:** Extend the existing `ResponsiveSheet` so it can render a semantic detail header while preserving its current form API, then add focused `DetailSection`, `DetailField`, and `DetailBadgeRow` primitives. Activity Detail composes those primitives, uses one deterministic compact date formatter, and keeps comments, audit, actions, permissions, and Server Actions unchanged.

**Tech Stack:** Next.js 16 App Router, React 19, TypeScript, Tailwind CSS 4, ShadCN UI, Lucide React, Vitest, React Testing Library.

## Global Constraints

- Mobile below 640 px uses a bottom Drawer; 640 px and above uses a right-side Sheet.
- The Sheet is limited to `max-w-2xl`; the panel scrolls internally and must not create page overflow.
- Dates use deterministic `America/Panama` output such as `30 jul 2026 · 9:00 a. m.`.
- Status, priority, and recurrence must not compete with the close control.
- Programación, Ubicación y responsable, Descripción, Recurrencia, and Estado del ciclo de vida use the same section treatment.
- Preserve Prisma, Server Actions, permissions, audit, comments, recurrence, overlap rules, and closed-activity mutation restrictions.
- Preserve the unrelated working-tree modification in `src/features/activities/activity-workspace.tsx`.
- Use ShadCN primitives and existing design tokens; do not introduce new dependencies.

---

## File Structure

- Create `src/components/product/details.tsx`: reusable visual primitives for semantic detail content.
- Create `src/components/product/details.test.tsx`: component contracts for detail primitives.
- Modify `src/components/product/forms.tsx`: add optional semantic header fields to `ResponsiveSheet` without breaking form callers.
- Modify `src/lib/dates/format-activity-date.ts`: provide compact deterministic Spanish date-time and date-only output.
- Modify `src/lib/dates/format-activity-date.test.ts`: lock timezone and compact copy.
- Modify `src/features/activities/activity-detail-panel.tsx`: compose the responsive shared pattern.
- Modify `src/features/activities/activity-form-panel.tsx`: add specific placeholders to Activity text fields and recurrence interval.
- Modify `src/features/activities/activity-workspace.test.tsx`: cover detail hierarchy, empty values, cancelled state, and placeholders.
- Create `design-qa.md`: record reference/prototype comparison and six-breakpoint verification results.

### Task 1: Compact operational date formatting

**Files:**
- Modify: `src/lib/dates/format-activity-date.ts`
- Test: `src/lib/dates/format-activity-date.test.ts`

**Interfaces:**
- Produces: `formatActivityDateTime(value: string | Date, timeZone?: string): string`
- Produces: `formatActivityDate(value: string | Date, timeZone?: string): string`
- Consumed by: Activity workspace, Agenda, and Activity Detail.

- [ ] **Step 1: Replace the current assertion with compact date-time and date-only failing tests**

```ts
import { describe, expect, it } from "vitest";

import {
  formatActivityDate,
  formatActivityDateTime,
} from "@/lib/dates/format-activity-date";

describe("activity date formatting", () => {
  it("formats Panama operation time compactly", () => {
    expect(formatActivityDateTime("2026-07-30T14:00:00.000Z"))
      .toBe("30 jul 2026 · 9:00 a. m.");
  });

  it("formats a date without time for recurrence copy", () => {
    expect(formatActivityDate("2026-07-30T23:59:59.000Z"))
      .toBe("30 jul 2026");
  });

  it("does not emit non-breaking spaces", () => {
    expect(formatActivityDateTime("2026-07-30T14:00:00.000Z"))
      .not.toMatch(/[\u00a0\u202f]/);
  });
});
```

- [ ] **Step 2: Run the focused test and verify RED**

Run: `npm test -- src/lib/dates/format-activity-date.test.ts`

Expected: FAIL because the old output is numeric and `formatActivityDate` does not exist.

- [ ] **Step 3: Implement deterministic compact formatting**

```ts
const DEFAULT_OPERATION_TIMEZONE = "America/Panama";
const MONTHS = ["ene", "feb", "mar", "abr", "may", "jun", "jul", "ago", "sep", "oct", "nov", "dic"] as const;

function parts(value: string | Date, timeZone: string) {
  const result = new Intl.DateTimeFormat("en-CA", {
    day: "2-digit",
    hour: "2-digit",
    hourCycle: "h23",
    minute: "2-digit",
    month: "2-digit",
    timeZone,
    year: "numeric",
  }).formatToParts(new Date(value));
  return Object.fromEntries(result.map((part) => [part.type, part.value]));
}

export function formatActivityDate(value: string | Date, timeZone = DEFAULT_OPERATION_TIMEZONE) {
  const valueParts = parts(value, timeZone);
  return `${valueParts.day} ${MONTHS[Number(valueParts.month) - 1]} ${valueParts.year}`;
}

export function formatActivityDateTime(value: string | Date, timeZone = DEFAULT_OPERATION_TIMEZONE) {
  const valueParts = parts(value, timeZone);
  const hour24 = Number(valueParts.hour);
  const hour12 = hour24 % 12 || 12;
  const period = hour24 < 12 ? "a. m." : "p. m.";
  return `${valueParts.day} ${MONTHS[Number(valueParts.month) - 1]} ${valueParts.year} · ${hour12}:${valueParts.minute} ${period}`;
}
```

- [ ] **Step 4: Run the focused test and verify GREEN**

Run: `npm test -- src/lib/dates/format-activity-date.test.ts`

Expected: 3 tests PASS.

- [ ] **Step 5: Commit the formatter**

```powershell
git add -- src/lib/dates/format-activity-date.ts src/lib/dates/format-activity-date.test.ts
git commit -m "feat: add compact operational date formatting"
```

### Task 2: Shared semantic detail primitives

**Files:**
- Create: `src/components/product/details.tsx`
- Create: `src/components/product/details.test.tsx`
- Modify: `src/components/product/forms.tsx`

**Interfaces:**
- Produces: `DetailSection({ title, icon, children, tone?, className? })`
- Produces: `DetailField({ label, value, icon, preventWrap? })`
- Produces: `DetailBadgeRow({ primary, secondary? })`
- Extends: `ResponsiveSheet` with optional `ariaLabel`, `eyebrow`, and `metadata` props while preserving all existing required props.

- [ ] **Step 1: Write failing component-contract tests**

```tsx
import { render, screen } from "@testing-library/react";
import { CalendarDaysIcon } from "lucide-react";
import { describe, expect, it } from "vitest";

import { DetailBadgeRow, DetailField, DetailSection } from "@/components/product/details";

describe("detail primitives", () => {
  it("renders a labelled thematic region", () => {
    render(<DetailSection title="Programación"><p>Contenido</p></DetailSection>);
    expect(screen.getByRole("region", { name: "Programación" })).toBeVisible();
  });

  it("renders an explicit fallback and non-wrapping value", () => {
    render(<DetailField icon={CalendarDaysIcon} label="Inicio" preventWrap value={null} />);
    expect(screen.getByText("Sin información")).toHaveClass("whitespace-nowrap");
  });

  it("separates primary and secondary metadata groups", () => {
    render(<DetailBadgeRow primary={<span>Cancelada</span>} secondary={<span>Recurrente</span>} />);
    expect(screen.getByTestId("detail-badges-primary")).toContainElement(screen.getByText("Cancelada"));
    expect(screen.getByTestId("detail-badges-secondary")).toContainElement(screen.getByText("Recurrente"));
  });
});
```

- [ ] **Step 2: Run the focused test and verify RED**

Run: `npm test -- src/components/product/details.test.tsx`

Expected: FAIL because `details.tsx` does not exist.

- [ ] **Step 3: Add the reusable primitives**

```tsx
import type { ComponentType, ReactNode } from "react";

import { cn } from "@/lib/utils";

type DetailIcon = ComponentType<{ className?: string; "aria-hidden"?: boolean }>;

export function DetailSection({ children, className, icon: Icon, title, tone = "default" }: {
  children: ReactNode;
  className?: string;
  icon?: DetailIcon;
  title: string;
  tone?: "default" | "danger";
}) {
  return <section aria-label={title} className={cn("space-y-3 rounded-xl border border-border bg-card p-4", tone === "danger" && "border-destructive/35 bg-destructive/5", className)} role="region">
    <div className="flex items-center gap-2">
      {Icon ? <Icon aria-hidden className={cn("size-4 text-muted-foreground", tone === "danger" && "text-destructive")} /> : null}
      <h3 className="text-sm font-medium">{title}</h3>
    </div>
    {children}
  </section>;
}

export function DetailField({ icon: Icon, label, preventWrap = false, value }: {
  icon?: DetailIcon;
  label: string;
  preventWrap?: boolean;
  value: ReactNode;
}) {
  return <div className="flex min-w-0 gap-2.5">
    {Icon ? <Icon aria-hidden className="mt-0.5 size-4 shrink-0 text-muted-foreground" /> : null}
    <div className="min-w-0">
      <p className="text-xs text-muted-foreground">{label}</p>
      <div className={cn("mt-1 text-sm font-medium text-foreground", preventWrap && "whitespace-nowrap")}>{value ?? "Sin información"}</div>
    </div>
  </div>;
}

export function DetailBadgeRow({ primary, secondary }: { primary: ReactNode; secondary?: ReactNode }) {
  return <div className="flex flex-wrap items-center justify-between gap-2 border-t border-border pt-3">
    <div className="flex flex-wrap items-center gap-2" data-testid="detail-badges-primary">{primary}</div>
    {secondary ? <div className="flex flex-wrap items-center gap-2" data-testid="detail-badges-secondary">{secondary}</div> : null}
  </div>;
}
```

- [ ] **Step 4: Extend `ResponsiveSheet` without breaking form callers**

Add optional props:

```tsx
type ResponsiveSheetProps = {
  ariaLabel?: string;
  children: ReactNode;
  description?: string;
  eyebrow?: string;
  metadata?: ReactNode;
  onOpenChange: (open: boolean) => void;
  open: boolean;
  title: string;
};
```

For both Drawer and Sheet branches, apply `aria-label={ariaLabel ?? title}` to content and render this header order:

```tsx
{eyebrow ? <p className="label-overline">{eyebrow}</p> : null}
<ResponsivePrimitiveTitle>{title}</ResponsivePrimitiveTitle>
{description ? <ResponsivePrimitiveDescription>{description}</ResponsivePrimitiveDescription> : null}
{metadata}
```

Keep the current form behavior when optional props are absent.

- [ ] **Step 5: Run detail and existing Activity component tests**

Run: `npm test -- src/components/product/details.test.tsx src/features/activities/activity-workspace.test.tsx`

Expected: all tests PASS.

- [ ] **Step 6: Commit shared primitives**

```powershell
git add -- src/components/product/details.tsx src/components/product/details.test.tsx src/components/product/forms.tsx
git commit -m "feat: add responsive detail panel primitives"
```

### Task 3: Refactor Activity Detail information architecture

**Files:**
- Modify: `src/features/activities/activity-detail-panel.tsx`
- Modify: `src/features/activities/activity-workspace.test.tsx`

**Interfaces:**
- Consumes: `ResponsiveSheet`, `DetailSection`, `DetailField`, `DetailBadgeRow`, `formatActivityDate`, `formatActivityDateTime`.
- Preserves: `ActivityDetailPanelProps` and all Server Action calls.

- [ ] **Step 1: Add failing assertions for the approved hierarchy**

Extend the existing open-detail test:

```tsx
expect(within(dialog).getByRole("region", { name: "Programación" })).toBeVisible();
expect(within(dialog).getByRole("region", { name: "Ubicación y responsable" })).toBeVisible();
expect(within(dialog).getByRole("region", { name: "Descripción" })).toBeVisible();
expect(within(dialog).getByText("30 jul 2026 · 9:00 a. m.")).toHaveClass("whitespace-nowrap");
expect(within(dialog).getByTestId("detail-badges-primary")).toHaveTextContent("Alta");
```

Extend the cancelled test:

```tsx
expect(within(dialog).getByRole("region", { name: "Estado del ciclo de vida" })).toBeVisible();
expect(within(dialog).getByText("Actividad cerrada")).toBeVisible();
```

- [ ] **Step 2: Run the focused workspace test and verify RED**

Run: `npm test -- src/features/activities/activity-workspace.test.tsx`

Expected: FAIL because the semantic regions and compact date are not rendered.

- [ ] **Step 3: Replace the direct Sheet wrapper with `ResponsiveSheet`**

Use this header composition while retaining the cancellation Dialog as a sibling:

```tsx
<ResponsiveSheet
  ariaLabel={activityMessages.detail.title}
  description={`${activity.type.name} · ${activity.country.name}`}
  eyebrow={activityMessages.detail.title}
  metadata={
    <DetailBadgeRow
      primary={<><Badge className={statusClass(activity.status.code)} variant="outline">{activity.status.name}</Badge><Badge variant="outline">{activity.priority.name}</Badge></>}
      secondary={activity.series ? <Badge className="status-subtle" variant="outline"><Repeat2Icon />Recurrente</Badge> : undefined}
    />
  }
  onOpenChange={onOpenChange}
  open={open}
  title={activity.title}
>
```

Keep the existing `ScrollArea` and `Tabs` tree immediately after this opening tag, then replace the original closing `</SheetContent></Sheet>` pair with:

```tsx
</ResponsiveSheet>
```

- [ ] **Step 4: Compose the five uniform summary sections**

Use `space-y-3` and the following structure:

```tsx
<DetailSection icon={CalendarDaysIcon} title="Programación">
  <div className="grid gap-4 min-[420px]:grid-cols-2">
    <DetailField label="Inicio" preventWrap value={formatActivityDateTime(activity.startsAt)} />
    <DetailField label="Fin" preventWrap value={formatActivityDateTime(activity.endsAt)} />
  </div>
</DetailSection>
<DetailSection icon={MapPinIcon} title="Ubicación y responsable">
  <div className="grid gap-4 min-[420px]:grid-cols-2">
    <DetailField label="País y equipo" value={<>{activity.country.name}{activity.team ? ` · ${activity.team.name}` : " · Sin equipo"}</>} />
    <DetailField label="Técnico asignado" value={activity.assignedTo?.name || activity.assignedTo?.email || "Sin técnico asignado"} />
  </div>
</DetailSection>
<DetailSection title="Descripción">
  <p className="whitespace-pre-wrap text-sm leading-6 text-muted-foreground">{activity.description || "Sin descripción"}</p>
</DetailSection>
```

Render `Recurrencia` only when a recurrence rule exists, using `formatActivityDate` for its end date. Render `Estado del ciclo de vida` for both mutable and cancelled activities: cancelled copy and creation trace for closed items; status selector, actions, and creation trace for mutable items. Do not change Action handlers or permission-derived visibility.

- [ ] **Step 5: Normalize comments and audit entries**

Apply the same `rounded-xl border border-border bg-card p-3` treatment, compact dates through `formatActivityDateTime`, and explicit empty-state Alerts. Do not change submit handlers or data mapping.

- [ ] **Step 6: Run Activity tests and verify GREEN**

Run: `npm test -- src/features/activities/activity-workspace.test.tsx src/lib/dates/format-activity-date.test.ts src/components/product/details.test.tsx`

Expected: all tests PASS, including cancelled mutation protection.

- [ ] **Step 7: Commit Activity Detail**

```powershell
git add -- src/features/activities/activity-detail-panel.tsx src/features/activities/activity-workspace.test.tsx
git commit -m "feat: reorganize activity detail sheet"
```

### Task 4: Activity form placeholder audit

**Files:**
- Modify: `src/features/activities/activity-form-panel.tsx`
- Modify: `src/features/activities/activity-workspace.test.tsx`

**Interfaces:**
- Preserves: all `ActivityFormPanel` props, form values, Zod/server validation, and time-range validation.

- [ ] **Step 1: Add failing placeholder assertions**

```tsx
fireEvent.click(screen.getByRole("button", { name: "Nueva actividad" }));
const formDialog = screen.getByRole("dialog", { name: "Nueva actividad" });
expect(within(formDialog).getByPlaceholderText("Ej. Mantenimiento preventivo flota Panamá")).toBeVisible();
expect(within(formDialog).getByPlaceholderText("Describe el trabajo, alcance y resultado esperado")).toBeVisible();
```

- [ ] **Step 2: Run the focused test and verify RED**

Run: `npm test -- src/features/activities/activity-workspace.test.tsx`

Expected: FAIL because title and description have no placeholders.

- [ ] **Step 3: Add specific placeholders**

```tsx
<Input
  className="control-surface"
  id="activity-title"
  onChange={(event) => { markDirty(); setTitle(event.target.value); }}
  placeholder="Ej. Mantenimiento preventivo flota Panamá"
  required
  value={title}
/>
<Textarea
  className="control-surface"
  id="activity-description"
  onChange={(event) => { markDirty(); setDescription(event.target.value); }}
  placeholder="Describe el trabajo, alcance y resultado esperado"
  rows={3}
  value={description}
/>
<Input
  aria-label="Intervalo de recurrencia"
  className="control-surface"
  id="recurrence-interval"
  inputMode="numeric"
  max={12}
  min={1}
  onChange={(event) => { markDirty(); setRecurrenceInterval(event.target.value); }}
  placeholder="Ej. 1"
  type="number"
  value={recurrenceInterval}
/>
```

- [ ] **Step 4: Run Activity tests and verify GREEN**

Run: `npm test -- src/features/activities/activity-workspace.test.tsx`

Expected: all tests PASS.

- [ ] **Step 5: Commit placeholders**

```powershell
git add -- src/features/activities/activity-form-panel.tsx src/features/activities/activity-workspace.test.tsx
git commit -m "fix: add guidance to activity form fields"
```

### Task 5: Functional and visual verification

**Files:**
- Create: `design-qa.md`
- Create: six screenshots under an existing ignored artifact directory or the configured screenshot output path.

**Interfaces:**
- Consumes: completed Activity Detail pattern.
- Produces: QA evidence and before/after comparison for user approval.

- [ ] **Step 1: Run targeted and full automated checks**

Run:

```powershell
npm test -- src/lib/dates/format-activity-date.test.ts src/components/product/details.test.tsx src/features/activities/activity-workspace.test.tsx
npm test
npm run lint
npm run build
```

Expected: all commands exit 0. Existing unrelated failures, if any, must be reported with exact output and must not be hidden.

- [ ] **Step 2: Start the development server and verify the real flow**

Run: `npm run dev`

Expected: Next.js reports Ready and `/activities` loads with the authenticated test/admin account.

- [ ] **Step 3: Capture six states**

Capture Activity Detail with the same representative recurring cancelled activity in:

- Mobile 390 × 844, light.
- Mobile 390 × 844, dark.
- Tablet 768 × 1024, light.
- Tablet 768 × 1024, dark.
- Desktop 1440 × 900, light.
- Desktop 1440 × 900, dark.

Expected: mobile uses bottom Drawer; tablet and desktop use right Sheet.

- [ ] **Step 4: Complete `design-qa.md`**

Record a side-by-side comparison against `C:/Users/anyel/AppData/Local/Temp/codex-clipboard-f74f828d-402a-44e4-96ae-e1c8bce9f497.png` and explicitly mark:

```markdown
- [x] Close area is unobstructed.
- [x] Badge groups have their own row.
- [x] Dates do not split or overflow.
- [x] Five thematic sections share one treatment.
- [x] Drawer/Sheet scroll is internal.
- [x] No horizontal page overflow.
- [x] Light/dark borders and focus states remain legible.
- [x] Comments, audit, status change, edit, and cancellation behavior remain functional.
```

- [ ] **Step 5: Review the final diff and working tree**

Run:

```powershell
git diff --check
git status --short
git diff -- src/features/activities/activity-workspace.tsx
```

Expected: no whitespace errors; the pre-existing `activity-workspace.tsx` change is identified and excluded from new commits except for intentionally added test changes in its separate test file.

- [ ] **Step 6: Commit QA documentation if it contains no secrets or machine-specific session data**

```powershell
git add -- design-qa.md
git commit -m "test: document activity detail visual verification"
```

## Execution Choice

The user explicitly requested full implementation in the current task. Inline execution with `superpowers:executing-plans` is selected because no subagent delegation was requested and the working tree contains an unrelated user modification that must remain under direct control.
