# Calendar Operational UI Design

## Context

Calendar is the internal scheduling application for Soporte Técnico LATAM. The existing proof of concept has a partially applied brand theme and two competing dashboard structures: a small custom `AppShell` for the agenda and unadapted ShadCN dashboard template files. The requested direction is inspired by the authenticated Manufacturing OS experience, while keeping Calendar's name, Spanish product copy, functional scope, and approved brand palette.

## Reference analysis

The authenticated reference was reviewed in desktop dark mode, desktop light mode, and a 390 px mobile viewport. The reviewed modules were Dashboard, Ventas, Pedidos, Producción, Inventario, Catálogo, Gastos, Clientes, Planilla, Asistencia, Reportes, Seguridad y Acceso, and Moneda y Tasas.

Reusable experience patterns:

- Persistent desktop sidebar with grouped navigation, organization identity, active-item treatment, and a user footer.
- Compact persistent header with a sidebar trigger, operational context, status controls, theme switching, and notifications.
- A predictable page frame: breadcrumb, title and description, action cluster, summary metrics, then a single primary work surface.
- Dense but readable tables with compact filters, semantic state pills, avatars or initials, per-row actions, and pagination.
- A shared view switcher where the workflow benefits from it: table and Kanban are alternate views of the same records.
- Mobile prioritizes the page task: sidebar moves behind a trigger, header remains compact, cards stack, and actions remain reachable.
- Dark and light themes use the same semantic structure rather than separate component styling.

The reference uses Plus Jakarta Sans for interface text, Space Grotesk for display text, JetBrains Mono for numeric/technical data, `#171717` as its dark base, `#1c1c1c` as its card surface, `#2e2e2e` as its border, and `#34B27B` as its green accent. Calendar will retain the approved brand surfaces (`#11181C`, `#1C2329`, `#252D35`, `#2D3748`) and the same green accent rather than copying the reference colors wholesale.

## Product decisions

- The experience is inspiration, not a copy. No reference branding, entity names, domain data, or source code will be transferred.
- The App Router root and `/dashboard` must render one shared shell. The residual dashboard template components are not part of the application flow and will be removed from the live route surface.
- All new UI copy is Spanish and comes from message modules. Internal identifiers, file names, functions, and tests remain English.
- The initial operational page is Agenda del equipo. It will present metric cards, a filter/action row, and an activity work surface built with representative UI-only data until the approved activity queries are connected.
- Full calendar, activity mutations, comments, notifications, and administration behaviors remain functional Phase 2 work. This design work only supplies their shared visual system and route-ready work surfaces.

## Visual architecture

### Theme tokens

`globals.css` will provide a complete semantic token contract for dark-first and light themes:

- Core ShadCN tokens: background, foreground, card, popover, primary, secondary, muted, accent, destructive, border, input, ring, and sidebar.
- Combilift tokens: brand, brand-dark, brand-light, surface-1/2/3, semantic colors, RGB channels, table tokens, and elevation tokens.
- Layout and type tokens: section/card spacing, radii, display/sans/mono font families, and a `font-heading` compatibility alias for generated ShadCN primitives.
- Shared component utilities: `page-shell`, `content-container`, `card-enterprise`, `table-enterprise`, semantic status/tone utilities, and accessible focus/selection rules.

Theme tokens must be CSS-defined. They will not be injected by a client component at runtime. The root layout will load Manrope, DM Sans, and JetBrains Mono with `next/font` and expose their variables on `<html>`.

### Shared shell

`AppShell` will become the only live application shell. It will contain a responsive ShadCN sidebar/drawer, grouped navigation, an identity panel, an account footer, and a compact top header. The active location will be derived from `usePathname`, ensuring the active visual state matches the route. Every icon-only interaction will use a ShadCN tooltip.

### Agenda page

Agenda will use the shared page frame with breadcrumb, title, description, date/filter controls, and an explicit "Nueva actividad" action. The work area will contain:

- Three operational KPI cards with icon surfaces and semantic values.
- A search/filter row that collapses naturally on narrow screens.
- A ShadCN Tabs control for list and Kanban presentation.
- A table-first desktop list with technician, country, scheduled time, priority, state, and row actions.
- A Kanban structure grouped by activity state for rapid coordination.

The UI-only activity examples are deliberately isolated in an English typed module so server-backed data can replace them without changing the presentation API.

## Data and infrastructure

Neon replaces the previous SiteGround proposal. A read-only probe to the supplied pooled Neon endpoint succeeded from the local development environment. The production connection must be configured in Vercel only through `DATABASE_URL`; `DIRECT_DATABASE_URL` remains optional for Prisma migration workflows if Neon supplies a direct endpoint. Secrets must never be committed or copied into `.env.example`.

Because the connection string was supplied in the conversation, the Neon password should be rotated before a production deployment. The new value must be saved only as a Vercel environment variable for Preview and Production.

## Accessibility and verification

- Use semantic nav, breadcrumbs, headings, labels, buttons, tables, tabs, and visible focus treatment.
- Maintain contrast across both themes and provide text labels or tooltips for icon controls.
- Verify the shared shell and Agenda at `<640px`, `640px–1024px`, and `>1024px`.
- Add behavioral and source-level Vitest coverage for centralized Spanish copy, active navigation, theme token contract, and agenda view switching.
- Run Vitest, Prisma validation, lint, production build, and browser checks in dark/light desktop and mobile before handoff.
