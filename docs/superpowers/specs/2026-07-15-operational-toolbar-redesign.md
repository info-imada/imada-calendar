# Operational Toolbar Redesign

## Goal

Replace the boxed filter and view toolbars in Agenda, Calendar, Activities, Team, and Administration with one shared, responsive operational toolbar that feels integrated into the page rather than nested inside a card.

## Approved direction

Use an editorial two-level composition:

- The context row contains view switches, result counts, and module-level actions.
- The control row contains search, filters, date range, and the clear action.
- The toolbar itself has no card background, border, shadow, or outer padding.
- Spacing and a subtle separator establish hierarchy instead of a container surface.
- Existing ShadCN controls remain the interaction primitives.

## Responsive behavior

- Desktop, above 1024 px: context and controls use the available width without horizontal page overflow. Search receives flexible width; filters use bounded widths; clear stays aligned at the trailing edge.
- Tablet, 640–1024 px: controls wrap into an intentional two-row grid. No clipped labels or partial controls.
- Mobile, below 640 px: search or the primary view switch remains visible. Secondary filters move into the existing ShadCN Drawer through `FilterBar`; active-filter count remains visible on the trigger.

## Shared component contract

Create `OperationalToolbar` in `src/components/product/page.tsx` with optional `context`, `children`, `meta`, and `className` slots. It renders semantic toolbar markup, exposes stable `data-slot` attributes for tests, and owns only layout—not filter state.

Update `FilterBar` so the non-mobile variant is transparent and padding-free by default. Its mobile Drawer behavior remains unchanged.

## Module composition

- Agenda: Lista/Kanban and result count in the context row; search, country, technician, status, date, and clear in controls.
- Calendar: Mes/Semana/Técnicos in the context row; country, technician, and clear in controls.
- Activities: result/filter context plus search, country, technician, status, priority, date range, and clear. Remove the wrapping Card.
- Team: add search and availability filter with visible result count, preserving real member data.
- Administration: move Catálogo/Usuarios and creation actions into the shared toolbar pattern; retain Tabs content and permissions.

## Accessibility and behavior

- Preserve accessible names for toolbars, searches, selects, drawers, tabs, and clear actions.
- Do not replace ShadCN Select, Tabs, Drawer, Button, Input, or date pickers.
- Disabled clear actions communicate that no filters are active.
- Keyboard navigation and existing Server Actions remain unchanged.

## Regression boundary

No Prisma models, queries, permissions, authentication, Zod validation, recurrence, overlap detection, audit logging, or mutations change in this refactor.

## Acceptance criteria

- No toolbar uses `card-enterprise`, Card, background fill, border, box shadow, or outer padding.
- All five modules use the same visual hierarchy.
- No horizontal page overflow at 390, 768, or 1440 px.
- Light and dark themes keep control borders, focus rings, and labels legible.
- Existing tests pass and new component/module tests cover the shared layout and new Team filtering.
