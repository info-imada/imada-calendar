# ShadCN Controls and Calendar Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace native controls in completed modules and deliver a responsive React Big Calendar workspace that reuses the validated Activities data and mutation flow.

**Architecture:** Shared controlled date/date-range components compose ShadCN Calendar with Popover or Drawer. Existing Activities Server Actions remain the only mutation boundary; Calendar consumes the scoped Activities read model and opens the shared Activity form for slot creation or event editing.

**Tech Stack:** Next.js 16 App Router, React 19, TypeScript, ShadCN/Base UI, React Day Picker, React Big Calendar 1.20, date-fns, Prisma/PostgreSQL, Zod, Vitest and Testing Library.

**Status (2026-07-14):** Implemented and verified end-to-end. The detailed checkboxes below preserve the original execution contract; fresh verification evidence is reported with the completed module.

## Global Constraints

- No raw interactive `<input>`, `<select>` or `<textarea>` outside `src/components/ui`.
- No native date or datetime-local inputs.
- Date ranges use ShadCN Calendar `mode="range"`.
- Calendar pickers use Drawer below 768 px and Popover otherwise.
- React Big Calendar remains the monthly, weekly and technician calendar engine.
- All mutations reuse existing scoped, audited and overlap-protected Activity Server Actions.

---

### Task 1: Control audit and reusable date contracts

**Files:**
- Create: `src/components/forms/shadcn-control-audit.test.ts`
- Create: `src/lib/dates/form-date-time.ts`
- Create: `src/lib/dates/form-date-time.test.ts`
- Create: `src/components/forms/responsive-date-picker.tsx`
- Create: `src/components/forms/responsive-date-range-picker.tsx`
- Generate: `src/components/ui/calendar.tsx`
- Generate: `src/components/ui/popover.tsx`

**Interfaces:**
- Produces: `combineLocalDateAndTime(date: Date, time: string): Date`.
- Produces: `endOfSelectedDay(date: Date): Date`.
- Produces: controlled `ResponsiveDatePicker` and `ResponsiveDateRangePicker`.

- [ ] Write the source-audit test asserting feature/auth route sources do not match `/<(input|select|textarea)\b/` and do not use ShadCN `Input` with `type="date"` or `type="datetime-local"`.
- [ ] Run `npm test -- src/components/forms/shadcn-control-audit.test.ts` and confirm it fails on the current Activities and Administration controls.
- [ ] Write pure date helper tests asserting `combineLocalDateAndTime(new Date(2026, 6, 20), "09:30")` preserves the local date and time and `endOfSelectedDay` produces 23:59:59.999.
- [ ] Run the helper test and confirm the missing module failure.
- [ ] Install ShadCN Calendar and Popover with the project CLI; implement responsive controlled pickers using the generated primitives, Drawer and `useIsMobile`.
- [ ] Implement the minimal date helpers and run focused tests to green.

### Task 2: Replace native controls in completed modules

**Files:**
- Modify: `src/features/administration/administration-page.tsx`
- Modify: `src/features/administration/administration-page.test.tsx`
- Modify: `src/features/activities/activity-workspace.tsx`
- Modify: `src/features/activities/activity-workspace.test.tsx`
- Modify: `src/features/activities/activity-form-panel.tsx`
- Create: `src/features/activities/activity-form-panel.test.tsx`
- Modify: `src/features/activities/activity-detail-panel.tsx`

**Interfaces:**
- Extends: `ActivityFormPanelProps` with `initialStartsAt?: Date` and `initialEndsAt?: Date`.
- Consumes: the shared responsive date components and existing ShadCN Select/Checkbox/Textarea/Input.

- [ ] Add component assertions that Activities exposes one button named `Filtrar por rango de fechas`, no separate from/to textboxes, and the Activity form exposes ShadCN comboboxes and date buttons.
- [ ] Run focused component tests and confirm they fail against native controls.
- [ ] Replace the Administration country select and Activity detail status select with controlled ShadCN Select.
- [ ] Replace Activity filters with controlled ShadCN Select and one controlled DateRange picker.
- [ ] Refactor Activity form state to controlled Select, Checkbox, single-date and ShadCN time inputs; serialize state directly into the existing create/update actions.
- [ ] Accept initial slot dates for Calendar and keep edit values authoritative when an activity is supplied.
- [ ] Run the source audit and all affected component/action tests to green.

### Task 3: Calendar event model

**Files:**
- Create: `src/features/calendar/calendar-types.ts`
- Create: `src/features/calendar/calendar-model.ts`
- Create: `src/features/calendar/calendar-model.test.ts`

**Interfaces:**
- Consumes: `ActivityWorkspaceModel` and `ActivityPresentation`.
- Produces: `CalendarEvent` with `activity`, `start`, `end`, `resourceId` and style metadata.
- Produces: `buildCalendarEvents(model, filters)` and technician resource records.

- [ ] Write failing tests proving serialized activity dates map to `Date`, cancelled records remain visible, country/technician filters work, and unassigned activities use a stable `UNASSIGNED` resource.
- [ ] Run `npm test -- src/features/calendar/calendar-model.test.ts` and confirm the missing implementation failure.
- [ ] Implement pure mapping/filtering helpers without Prisma or React dependencies.
- [ ] Run the model tests to green.

### Task 4: Calendar workspace and route

**Files:**
- Create: `src/features/calendar/calendar-workspace.tsx`
- Create: `src/features/calendar/calendar-workspace.test.tsx`
- Create: `src/app/(app)/calendar/page.tsx`
- Create: `src/app/(app)/calendar/loading.tsx`
- Create: `src/app/(app)/calendar/error.tsx`
- Modify: `src/app/globals.css`
- Modify: `src/messages/common.ts`
- Modify: `package.json`

**Interfaces:**
- Consumes: `ActivityWorkspaceModel` from `getActivityWorkspaceModel`.
- Reuses: `ActivityFormPanel` for `onSelectSlot` creation and `onSelectEvent` editing.

- [ ] Write a failing workspace test with a thin React Big Calendar mock that invokes `onSelectSlot` and `onSelectEvent`; assert monthly, weekly and technician Tabs and the expected Activity form props.
- [ ] Install `react-big-calendar@1.20.0`, `date-fns` and current type definitions.
- [ ] Implement Spanish date-fns localizer, external ShadCN navigation, controlled view/date, country/technician Select filters, event styling and technician resources.
- [ ] Add the authenticated Server Component route using `getActivityWorkspaceModel`, plus Skeleton loading and retryable error UI.
- [ ] Add scoped React Big Calendar theme overrides and responsive heights without document overflow.
- [ ] Run Calendar and Activities component tests to green.

### Task 5: End-to-end and responsive verification

**Files:**
- Create: `artifacts/calendar-mobile.png`
- Create: `artifacts/calendar-tablet.png`
- Create: `artifacts/calendar-desktop.png`
- Create: `artifacts/calendar-create-mobile.png`

**Interfaces:**
- Verifies: real Prisma activities, shared Server Actions, responsive ShadCN controls and browser behavior.

- [ ] Authenticate with the active demo GLOBAL ADMIN and verify month, week and technician views load persisted activities.
- [ ] Select an empty slot, confirm the shared Activity form receives the dates, and create a non-conflicting activity.
- [ ] Attempt a conflicting slot for the same technician and confirm the existing conflict Alert blocks persistence.
- [ ] Open an event, edit it through the shared panel, and confirm the Activities view and AuditLog reflect the change.
- [ ] Exercise Calendar/Popover on desktop and Calendar/Drawer on mobile; verify document scroll width equals client width at 390×844, 768×1024 and 1440×1000.
- [ ] Capture all four artifacts and inspect browser errors after interaction.
- [ ] Run fresh `npm test`, `npm run lint`, `npx tsc --noEmit`, `npx prisma validate` and `npm run build` before reporting completion.
