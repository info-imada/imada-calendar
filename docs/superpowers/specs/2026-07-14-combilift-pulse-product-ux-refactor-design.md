# Calendar Product UX Refactor Design

## Context and approved direction

Calendar already has authenticated Prisma-backed Activities, Calendar and Administration flows, plus a ShadCN/Base UI foundation. The attached product brief explicitly approves a complete interface refactor and asks implementation to continue after the audit. This document supersedes the earlier UI-only Agenda decision: Agenda must now read and mutate the same real activity data used by Activities and Calendar.

The target is an operational application that feels deliberate at high information density, preserves the Combilift identity, and behaves as one system from 320 px mobile screens through ultrawide desktop displays. Manufacturing OS remains a quality reference for hierarchy and polish; no layout, branding or source code is copied literally.

## Audit findings

### Strengths to preserve

- Prisma models, scoped permissions, Zod validation, transactional overlap detection and immutable audit writes already form a sound server boundary.
- Activities and Calendar share one read model and mutation path.
- ShadCN primitives for Sidebar, Sheet, Drawer, Dialog, Command, Calendar, Popover, Select, Checkbox, Textarea, Tabs, Skeleton and Sonner are installed.
- Responsive date and date-range pickers already avoid native date controls.
- Semantic theme variables exist for dark and light themes.

### Structural problems

- Agenda still renders presentation fixtures; its totals, filters and cards are disconnected from Prisma and the Kanban does not persist status changes.
- The live shell duplicates an installed ShadCN Sidebar and has no desktop collapse state, route-close behavior on mobile, or persisted preference.
- Page headers, metrics, filters, states, badges and responsive data presentations are repeated with different contracts.
- The activity form still uses a native browser time UI. Its field density is difficult on touch devices and the footer lacks cancel/unsaved-change handling.
- React Big Calendar works on desktop but the month grid is not an acceptable primary mobile interaction.
- Activities is a large client component that combines search, filtering, summaries, command palette, detail state and rendering.
- Administration is a compressed monolith. Small forms use a tall Sheet, and country/team edit and deactivate actions are absent.
- Mobile evidence shows clipping, narrow text columns, oversized empty surfaces and desktop-first controls.

## Considered approaches

1. **Per-screen visual patch.** Fastest, but it preserves duplicated behavior and makes responsive regressions likely.
2. **Incremental shared foundation and module migration.** Selected. It keeps the validated business layer, introduces reusable product primitives, then migrates one workflow at a time with tests.
3. **Whole-route rewrite.** Produces clean files quickly but carries unnecessary regression risk across auth, permissions, overlap blocking and audit logging.

## Product architecture

### Shared product layer

Create focused components under `src/components/product`:

- `PageContainer` and `PageHeader` own page width, hierarchy, description and responsive actions.
- `PageToolbar` and `FilterBar` own dense desktop controls plus a mobile filter Drawer.
- `StatSummary` owns compact operational metrics without oversized empty cards.
- `EmptyState`, `ErrorState` and `LoadingState` own non-happy paths.
- `ResponsiveDataView` switches between desktop table content and mobile list/card content without rendering inaccessible duplicate controls.
- `StatusBadge`, `PriorityBadge` and `UserAvatar` centralize tone and labels.
- `FormSection` and `FormActions` create consistent form grouping and sticky footers.
- `ResponsiveSheet` renders a Sheet on desktop and a bottom Drawer on mobile.
- `ConfirmActionDialog` wraps destructive or state-changing confirmations.

These components accept content and behavior; they do not import feature-specific Prisma models or actions.

### Shell

Use the installed ShadCN Sidebar as the single navigation implementation. Desktop supports expanded and icon-only modes with tooltips and persists the choice. Mobile uses the Sidebar Sheet, closes after route navigation, respects safe-area insets and remains vertically scrollable. The header remains compact and exposes navigation, availability, theme and notifications without duplicating controls at the bottom of the document.

### Form system

Keep controlled feature state where it already integrates cleanly with Server Actions, but move repeated field and surface behavior into shared components. Introduce a reusable `TimePicker` composed from Button, Popover/Drawer, Command and ScrollArea. It exposes a controlled `HH:mm` value, configurable minute interval, keyboard focus, touch-friendly targets and localized 12-hour display. No native `type="time"` remains.

Activity create/edit groups fields into details, schedule, assignment and recurrence sections. Desktop uses a right Sheet; mobile uses a bottom Drawer with sticky actions. Closing a dirty form requests confirmation. All-day mode disables time controls without losing a coherent start/end date.

### Agenda

The Agenda server page obtains the real activity workspace model and derives operational metrics from its records. List and Kanban share one filtered collection and persist the selected view locally. The Kanban uses dnd-kit sensors for pointer, touch and keyboard input, a DragOverlay, horizontal snap scrolling on mobile and status columns derived from the real status catalog.

A drop performs an optimistic local status move, calls the existing activity update action with all required activity fields, then either confirms with Sonner or restores the previous snapshot on permission, validation or server failure. Counts update optimistically with the cards.

### Calendar

Desktop and tablet keep React Big Calendar for month, week and technician resource views. External ShadCN controls add country, team, technician and status filters, event count, status legend and compact navigation. Event selection shows a small operational popover/detail action before edit; slot selection opens activity creation with selected dates.

Below 640 px, Calendar defaults to an agenda/day list grouped by date with compact date navigation. Users can still switch to a horizontally safe week surface, but the month grid is not merely shrunk. Both surfaces use the same filtered events and activity form.

### Activities

Activities retains real Prisma data, summary metrics, Server Actions and command search. Filters become a responsive shared bar; desktop keeps a compact table, tablet hides secondary columns, and mobile uses activity cards. Sorting and pagination are explicit client presentation states over the loaded scoped records. Row actions use DropdownMenu, and every empty/loading/error path uses the shared states.

### Administration

Administration keeps server validation, permissions and AuditLog writes. Country and team creation/editing use compact Dialog forms with cancel/save actions and inline errors. Deactivation uses `ConfirmActionDialog`. The catalog uses dense list rows with overflow actions instead of large nested cards. Users expose scoped access, status and role actions without changing the role model.

## Responsive contract

- `320–639 px`: one-column content, 16 px page gutters, mobile navigation Sheet, filters in Drawer, forms in bottom Drawer, data as cards/list, Calendar as agenda/day list, Kanban horizontal snap.
- `640–1024 px`: two-row toolbars, simplified tables, two-column summaries where useful, full-height Sheet forms and Calendar week/month within the content column.
- `>1024 px`: collapsible Sidebar, compact one-row toolbars where space permits, dense tables and four-column Kanban.
- No page may create document-level horizontal overflow. Intentional horizontal scrolling is limited to the Kanban and explicitly marked Calendar surfaces.

The final visual matrix covers 320×568, 375×667, 390×844, 430×932, 768×1024, 1024×768, 1280×720, 1366×768, 1440×900 and 1920×1080 in both themes.

## Accessibility and state model

- WCAG 2.2 AA is the target; compliance is reported only for checks actually executed.
- Every icon-only control has an accessible name and tooltip where hover context is useful.
- Focus order follows visual order; dialogs, sheets and drawers trap and restore focus through their ShadCN primitives.
- Drag-and-drop always has a keyboard sensor and status-change fallback menu.
- State changes announce through Sonner and visible status/count updates; errors retain entered form values.
- Touch targets are at least 44 px on mobile surfaces.
- Reduced-motion users receive no decorative movement; optimistic status moves remain understandable without animation.

## Data, time and security

- Prisma and Server Actions remain the authority. UI optimistic state never bypasses permission or Zod checks.
- Existing transactional overlap blocking is reused for all create/edit entry points.
- Dates are serialized as ISO values. Calendar display and form composition use the existing application timezone contract; recurrence keeps its stored timezone.
- No new database schema is required for phases 1–5. Administration edit/deactivate uses existing fields where available; unsupported physical deletion is not introduced.
- AuditLog writes remain within the same transaction as catalog and activity changes.

## Testing and verification

Each behavior follows red-green-refactor with focused Vitest/Testing Library coverage before implementation. Route actions retain server tests. Phase gates run focused tests, full Vitest, TypeScript and lint; production build runs at integration checkpoints and the final gate. Browser checks cover primary flows, both themes, no document overflow, mobile navigation, time selection, activity creation/editing, Kanban move/rollback and Calendar mobile/desktop behavior.

## Self-review

- No placeholders or unresolved product choices remain.
- The shared components are presentation-only and do not create a second business layer.
- Agenda, Activities and Calendar use one activity model and one mutation boundary.
- Mobile Calendar has an explicit alternative to the desktop month grid.
- The direction matches the user-approved brief and does not broaden the Prisma schema without need.
