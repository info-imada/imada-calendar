# ShadCN Controls Audit and Calendar Design

## Goal

Remove native interactive controls from Authentication, Administration and Activities, then deliver a scoped Calendar module backed by the same Prisma activity data and mutations.

## Approved interaction approach

Three approaches were considered:

1. Replace each control inline. This is quick but duplicates date, mobile and accessibility behavior.
2. Build small reusable ShadCN field compositions and use them across Activities and Calendar. This is the selected approach because it produces one consistent date/range experience and keeps the activity mutation flow shared.
3. Introduce a form framework and schema-driven renderer. This would centralize more state but adds unnecessary dependencies and migration risk for the current scope.

The user's specification explicitly approves approach 2: ShadCN `Calendar` inside `Popover`, `Drawer` on small touch layouts, `Select`, `Checkbox`, `Textarea` and the existing ShadCN `Input` for text, number and time values.

## Control audit contract

- Feature and route components under Authentication, Administration and Activities may not render raw `<input>`, `<select>` or `<textarea>` controls.
- Dates and date ranges never use `Input type="date"` or `Input type="datetime-local"`.
- Text, email, password, number and time remain valid through the styled ShadCN `Input`; ShadCN has no official standalone time picker.
- Date-range filters use one `Calendar` with `mode="range"` and a single clear action.
- Single-date controls use `Calendar` with `mode="single"`.
- On viewports below 768 px, calendars open in a `Drawer`; on wider viewports they open in a `Popover`.

## Shared date components

`ResponsiveDatePicker` owns open state and presents the same ShadCN `Calendar` through either a Drawer or Popover. It accepts a controlled `Date | undefined`, accessible label and controlled change callback.

`ResponsiveDateRangePicker` accepts a controlled React Day Picker `DateRange | undefined`. It displays the selected range in Spanish, supports clearing, and closes only when a complete range is selected.

Date-time form values are represented as a selected calendar date plus a ShadCN time `Input`. A pure helper combines them into a local `Date`; recurrence end dates are normalized to the end of the selected local day.

## Existing modules

Authentication already composes ShadCN `Input`, `Button`, `Tooltip` and `Alert`; it requires an automated audit assertion but no visual rewrite.

Administration replaces its country selector with ShadCN `Select` while preserving the existing Server Action and AuditLog flow.

Activities replaces all catalog/filter/status selectors with ShadCN `Select`, both checkboxes with ShadCN `Checkbox`, its two date filters with the range picker, and all datetime-local fields with the responsive date picker plus time input. The form becomes controlled so it can also accept a start/end selection from Calendar.

## Calendar architecture

The `/calendar` Server Component loads `getActivityWorkspaceModel`, preserving the exact GLOBAL/COUNTRY/TEAM scope rules used by Activities. A client `CalendarWorkspace` maps serialized activities into React Big Calendar events.

The module exposes three operational views:

- Monthly: React Big Calendar month view.
- Weekly: React Big Calendar week view.
- By technician: React Big Calendar day view with technicians as resources.

External ShadCN controls provide previous/today/next navigation, view Tabs and country/technician filters. Selecting an event opens the existing Activity form in edit mode. Selecting an empty slot opens the same form in create mode with the selected dates. Both paths call the existing Server Actions, so Zod validation, scope authorization, transactional audit writes and overlap blocking remain single-sourced.

## Responsive behavior

- Below 640 px: compact toolbar, horizontally safe calendar surface, Drawer activity form and Drawer date selection.
- 640-1024 px: two-row toolbar and full calendar inside the content column.
- Above 1024 px: dense single-row controls and expanded calendar height.

The document must not overflow horizontally at any breakpoint. React Big Calendar itself remains the calendar rendering library; only surrounding controls and forms use ShadCN primitives.

## Error, loading and empty states

The route has Skeleton loading and retryable error boundaries. An empty result still renders the calendar and permits creation when catalogs exist. Missing catalogs render an Alert. Server Action failures continue to use field errors, Alert and Sonner without exposing internal errors.

## Verification

- Static source audit for prohibited native controls and native date inputs.
- Unit tests for date/time composition and event mapping.
- Component tests for range filtering, view switching, slot creation and event editing.
- Existing activity action tests continue to prove overlap blocking.
- Authenticated browser verification at 390×844, 768×1024 and 1440×1000, including date picker interaction and no hydration/console errors.
- Fresh test, lint, TypeScript, Prisma validation and production build evidence.

## Self-review

The design contains no placeholders, requires no schema migration, does not replace React Big Calendar, and keeps every mutation on the already validated Activities action path.

