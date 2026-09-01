# Calendar Operational UI Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Establish a single dark-first operational UI for Calendar inspired by the reviewed Manufacturing OS patterns, with an accessible responsive shell and an Agenda work surface ready for Phase 2 data.

**Architecture:** CSS owns all semantic theme tokens and elevation, while Next font variables are attached at the root HTML element. A single responsive `AppShell` owns navigation and header layout; a server-rendered Agenda page composes ShadCN primitives and passes typed UI-only records to narrowly scoped client view components.

**Tech Stack:** Next.js App Router, TypeScript, Tailwind CSS v4, ShadCN UI, next/font, Motion, Vitest, Testing Library, Prisma, Neon PostgreSQL.

## Global Constraints

- All source code, identifiers, comments, file names, tests, and routes are English.
- All user-visible UI copy is Spanish and centralized in `src/messages`.
- Preserve the approved Combilift palette: primary `#34B27B`, dark base `#11181C`, card `#1C2329`, elevated `#252D35`, and border `#2D3748`.
- Use ShadCN primitives whenever one is applicable; do not duplicate their accessibility behavior in custom controls.
- No database secrets, OAuth secrets, or production URLs are committed to the repository.
- The initial Agenda records are UI-only; no activity mutation or database query is introduced in this visual implementation.

---

### Task 1: Replace the incomplete visual token contract

**Files:**
- Modify: `src/app/globals.css`
- Modify: `src/app/layout.tsx`
- Delete: `src/components/providers/brand-theme-tokens.tsx`
- Modify: `src/app/brand-theme.test.ts`

**Interfaces:**
- Consumes: `--font-app-display`, `--font-app-sans`, and `--font-app-mono` emitted by `next/font`.
- Produces: CSS utility classes `page-shell`, `content-container`, `card-enterprise`, `table-enterprise`, `status-success`, `status-warning`, `status-danger`, and `status-info`.

- [ ] **Step 1: Write the failing theme contract test**

```ts
it("defines dark and light surface, font-heading, and elevation tokens without runtime shadow injection", () => {
  expect(globalStyles).toContain("--surface-1: #1c2329");
  expect(globalStyles).toContain("--font-heading: var(--font-app-display)");
  expect(globalStyles).toContain(".light {");
  expect(globalStyles).toContain(".table-enterprise");
  expect(rootLayout).not.toContain("BrandThemeTokens");
});
```

- [ ] **Step 2: Run the focused test and verify it fails**

Run: `pnpm vitest run src/app/brand-theme.test.ts`

Expected: FAIL because surface, heading, table, and runtime-removal assertions are absent.

- [ ] **Step 3: Implement CSS-owned tokens and font aliases**

```css
@theme inline {
  --font-display: var(--font-app-display);
  --font-heading: var(--font-app-display);
  --font-sans: var(--font-app-sans);
  --font-mono: var(--font-app-mono);
  --color-surface-1: var(--surface-1);
  --color-surface-2: var(--surface-2);
  --color-surface-3: var(--surface-3);
}

:root,
.dark {
  --surface-1: #1c2329;
  --surface-2: #252d35;
  --surface-3: #2d3748;
  --shadow-card: 0 1px 2px rgb(0 0 0 / 0.36);
}
```

Remove the `BrandThemeTokens` import, element, inline shadow style, and provider file. Keep the three `next/font` variables on `<html>`.

- [ ] **Step 4: Run the focused test and verify it passes**

Run: `pnpm vitest run src/app/brand-theme.test.ts`

Expected: PASS.

- [ ] **Step 5: Commit the isolated token foundation**

Run when a Git repository is initialized: `git add src/app/globals.css src/app/layout.tsx src/app/brand-theme.test.ts src/components/providers/brand-theme-tokens.tsx && git commit -m "feat: establish operational design tokens"`

### Task 2: Centralize copy and create typed UI-only agenda records

**Files:**
- Modify: `src/messages/common.ts`
- Modify: `src/messages/common.test.ts`
- Create: `src/features/agenda/agenda-types.ts`
- Create: `src/features/agenda/agenda-fixtures.ts`
- Create: `src/features/agenda/agenda-fixtures.test.ts`

**Interfaces:**
- Produces `ActivityPresentation` with `id`, `title`, `technicianName`, `countryCode`, `scheduledAt`, `priority`, and `status`.
- Produces `agendaMessages` for page labels, filters, columns, priorities, statuses, and empty states.

- [ ] **Step 1: Write the failing fixture and message tests**

```ts
import { agendaActivities } from "@/features/agenda/agenda-fixtures";
import { agendaMessages } from "@/messages/common";

it("provides Spanish agenda copy and typed presentation records", () => {
  expect(agendaMessages.actions.create).toBe("Nueva actividad");
  expect(agendaActivities[0]).toMatchObject({ countryCode: "PA", priority: "HIGH" });
});
```

- [ ] **Step 2: Run the focused tests and verify they fail**

Run: `pnpm vitest run src/messages/common.test.ts src/features/agenda/agenda-fixtures.test.ts`

Expected: FAIL because the agenda exports do not exist.

- [ ] **Step 3: Implement the stable presentation boundary**

```ts
export type ActivityPresentation = {
  id: string;
  title: string;
  technicianName: string;
  countryCode: string;
  scheduledAt: string;
  priority: "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";
  status: "PLANNED" | "IN_PROGRESS" | "COMPLETED" | "BLOCKED";
};
```

Add Spanish labels only to `agendaMessages`; keep fixture fields and codes in English.

- [ ] **Step 4: Run the focused tests and verify they pass**

Run: `pnpm vitest run src/messages/common.test.ts src/features/agenda/agenda-fixtures.test.ts`

Expected: PASS.

- [ ] **Step 5: Commit the agenda presentation contract**

Run when a Git repository is initialized: `git add src/messages/common.ts src/messages/common.test.ts src/features/agenda && git commit -m "feat: add agenda presentation fixtures"`

### Task 3: Consolidate the responsive operational shell

**Files:**
- Modify: `src/components/layout/app-shell.tsx`
- Modify: `src/components/layout/app-shell.test.tsx`
- Modify: `src/components/providers/theme-toggle.tsx`
- Modify: `src/app/page.tsx`
- Modify: `src/app/dashboard/page.tsx`

**Interfaces:**
- Consumes: `commonMessages.navigation`, `usePathname`, `Button`, `Sheet`, `Tooltip`, and theme tokens.
- Produces: `AppShell({ children }: { children: ReactNode })` with desktop active navigation and a mobile navigation trigger.

- [ ] **Step 1: Write the failing shell test**

```tsx
it("marks the current Agenda route as active and exposes the mobile navigation trigger", () => {
  mockUsePathname.mockReturnValue("/dashboard");
  render(<AppShell><p>Contenido</p></AppShell>);
  expect(screen.getByRole("link", { name: "Agenda" })).toHaveAttribute("aria-current", "page");
  expect(screen.getByRole("button", { name: "Abrir navegación" })).toBeVisible();
});
```

- [ ] **Step 2: Run the focused test and verify it fails**

Run: `pnpm vitest run src/components/layout/app-shell.test.tsx`

Expected: FAIL because navigation has no pathname-aware state or mobile trigger.

- [ ] **Step 3: Implement one shell for all live routes**

```tsx
const pathname = usePathname();
const isActive = pathname === item.href;

<Link aria-current={isActive ? "page" : undefined} className={cn(
  buttonVariants({ variant: "ghost" }),
  isActive && "border border-primary/70 bg-primary/10 text-primary hover:bg-primary/15"
)} href={item.href}>
  <item.icon aria-hidden="true" />
  <span>{item.label}</span>
</Link>
```

Use a ShadCN `Sheet` for the mobile navigation and preserve tooltips for icon-only controls. Route both `/` and `/dashboard` to the shared agenda page rather than a template dashboard.

- [ ] **Step 4: Run the focused test and verify it passes**

Run: `pnpm vitest run src/components/layout/app-shell.test.tsx`

Expected: PASS.

- [ ] **Step 5: Commit the shared shell**

Run when a Git repository is initialized: `git add src/components/layout/app-shell.tsx src/components/layout/app-shell.test.tsx src/components/providers/theme-toggle.tsx src/app/page.tsx src/app/dashboard/page.tsx && git commit -m "feat: unify the operational application shell"`

### Task 4: Build the Agenda work surface with list and Kanban views

**Files:**
- Create: `src/features/agenda/agenda-page.tsx`
- Create: `src/features/agenda/agenda-view.tsx`
- Create: `src/features/agenda/agenda-view.test.tsx`
- Modify: `src/app/page.tsx`
- Modify: `src/app/dashboard/page.tsx`

**Interfaces:**
- Consumes: `ActivityPresentation[]`, `agendaMessages`, `Card`, `Tabs`, `Table`, `Badge`, `Button`, `Input`, `Select`, and Motion.
- Produces: `AgendaPage` server component and `AgendaView({ activities }: { activities: ActivityPresentation[] })` client component.

- [ ] **Step 1: Write the failing view test**

```tsx
it("switches from the list to the Kanban representation without changing activity data", async () => {
  render(<AgendaView activities={agendaActivities} />);
  expect(screen.getByRole("columnheader", { name: "Técnico" })).toBeVisible();
  await userEvent.click(screen.getByRole("tab", { name: "Kanban" }));
  expect(screen.getByRole("heading", { name: "Planificadas" })).toBeVisible();
  expect(screen.getByText(agendaActivities[0].title)).toBeVisible();
});
```

- [ ] **Step 2: Run the focused test and verify it fails**

Run: `pnpm vitest run src/features/agenda/agenda-view.test.tsx`

Expected: FAIL because `AgendaView` does not exist.

- [ ] **Step 3: Implement the operational composition**

```tsx
export function AgendaView({ activities }: { activities: ActivityPresentation[] }) {
  return (
    <Tabs defaultValue="list">
      <TabsList aria-label={agendaMessages.views.label}>
        <TabsTrigger value="list">{agendaMessages.views.list}</TabsTrigger>
        <TabsTrigger value="kanban">{agendaMessages.views.kanban}</TabsTrigger>
      </TabsList>
      <TabsContent value="list"><ActivityTable activities={activities} /></TabsContent>
      <TabsContent value="kanban"><ActivityKanban activities={activities} /></TabsContent>
    </Tabs>
  );
}
```

Use `card-enterprise` and `table-enterprise`, status pills, consistent icon surfaces, and `motion` only for short opacity/translate transitions that respect reduced motion.

- [ ] **Step 4: Run the focused test and verify it passes**

Run: `pnpm vitest run src/features/agenda/agenda-view.test.tsx`

Expected: PASS.

- [ ] **Step 5: Commit the Agenda surface**

Run when a Git repository is initialized: `git add src/features/agenda src/app/page.tsx src/app/dashboard/page.tsx && git commit -m "feat: add operational agenda views"`

### Task 5: Document Neon environment configuration without committing credentials

**Files:**
- Modify: `.env.example`
- Create: `docs/database/neon.md`
- Create: `src/lib/env.test.ts`

**Interfaces:**
- Consumes: `DATABASE_URL` and optional `DIRECT_DATABASE_URL` from Vercel environment variables.
- Produces: documented pooled runtime URL usage and direct migration URL guidance.

- [ ] **Step 1: Write the failing environment documentation test**

```ts
it("documents a secret-free pooled database configuration", () => {
  expect(environmentExample).toContain("DATABASE_URL=");
  expect(environmentExample).not.toContain("neondb_owner");
  expect(neonDocumentation).toContain("sslmode=require");
});
```

- [ ] **Step 2: Run the focused test and verify it fails**

Run: `pnpm vitest run src/lib/env.test.ts`

Expected: FAIL because Neon usage and SSL requirements are undocumented.

- [ ] **Step 3: Add secret-free configuration guidance**

```md
Set `DATABASE_URL` in Vercel Preview and Production to Neon’s pooled URL with `sslmode=require`.
Set `DIRECT_DATABASE_URL` only if a direct Neon URL is required for Prisma migrations.
Never commit either value. Rotate any credential that was pasted into a chat or log.
```

Keep `.env.example` values empty.

- [ ] **Step 4: Run the focused test and verify it passes**

Run: `pnpm vitest run src/lib/env.test.ts`

Expected: PASS.

- [ ] **Step 5: Commit the environment guidance**

Run when a Git repository is initialized: `git add .env.example docs/database/neon.md src/lib/env.test.ts && git commit -m "docs: configure Neon runtime environment"`

### Task 6: Verify the whole visual contract

**Files:**
- Create: `artifacts/agenda-dark-desktop.png`
- Create: `artifacts/agenda-light-desktop.png`
- Create: `artifacts/agenda-dark-mobile.png`
- Create: `artifacts/agenda-light-mobile.png`

**Interfaces:**
- Consumes: completed Tasks 1–5.
- Produces: repeatable test/build results and visual evidence for the responsive theme.

- [ ] **Step 1: Run unit and schema validation**

Run: `pnpm test && pnpm prisma validate`

Expected: all Vitest files pass and Prisma reports a valid schema.

- [ ] **Step 2: Run lint and production build**

Run: `pnpm lint && pnpm build`

Expected: lint has no errors and Next.js completes the production build.

- [ ] **Step 3: Verify desktop dark and light computed tokens**

Run: `pnpm dev`, then use browser automation at `http://localhost:3000/dashboard` to assert `--card`, `--border`, and `--shadow-card` match dark values, toggle light mode, and assert their light values. Save both desktop screenshots.

Expected: dark card `#1c2329`, dark border `#2d3748`, light card `#ffffff`, light border `#e2e8f0`.

- [ ] **Step 4: Verify mobile dark and light navigation**

Run: set browser viewport to `390x844`, assert the navigation trigger is visible, open the ShadCN sheet, and save both mobile screenshots.

Expected: content remains reachable without horizontal scroll and all icon controls expose Spanish accessible names.

- [ ] **Step 5: Commit verification assets only if the repository convention allows artifacts**

Run when a Git repository is initialized and artifacts are accepted: `git add artifacts/agenda-*.png && git commit -m "test: verify operational agenda themes"`

## Plan self-review

- Spec coverage: Tasks 1–4 cover the theme, unified shell, responsive experience, Agenda list/Kanban surface, Spanish copy, and ShadCN usage. Task 5 covers Neon secret handling. Task 6 covers automated and visual verification.
- Placeholder scan: no implementation tasks depend on unspecified APIs, database data, or unbounded UX choices.
- Type consistency: `ActivityPresentation`, `agendaActivities`, `agendaMessages`, `AgendaPage`, and `AgendaView` use one naming scheme throughout.
