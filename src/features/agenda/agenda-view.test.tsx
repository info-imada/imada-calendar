import { cleanup, render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";

import type { ActivityWorkspaceModel } from "@/features/activities/activity-types";

const mocks = vi.hoisted(() => ({
  changeActivityStatus: vi.fn(),
  refresh: vi.fn(),
}));

vi.mock("next/navigation", () => ({ useRouter: () => ({ refresh: mocks.refresh }) }));
vi.mock("@/hooks/use-mobile", () => ({ useIsMobile: () => false }));
vi.mock("@/app/actions/activities", () => ({
  changeActivityStatus: mocks.changeActivityStatus,
  createActivity: vi.fn(),
  updateActivity: vi.fn(),
  cancelActivity: vi.fn(),
  addActivityComment: vi.fn(),
}));
vi.mock("@/features/activities/activity-form-panel", () => ({
  ActivityFormPanel: ({ open }: { open: boolean }) => open ? <div role="dialog">Nueva actividad</div> : null,
}));
vi.mock("@/features/activities/activity-detail-panel", () => ({
  ActivityDetailPanel: ({ open }: { open: boolean }) => open ? <div role="dialog">Detalle de actividad</div> : null,
}));

import { AGENDA_VIEW_STORAGE_KEY } from "@/features/agenda/agenda-state";
import { AgendaView } from "@/features/agenda/agenda-view";

const catalog = {
  countries: [{ id: "country-pa", code: "PA", name: "Panamá", teams: [] }],
  technicians: [{ id: "tech-1", name: "Ana Torres", email: "ana@example.com" }],
  types: [{ id: "type-1", code: "VISIT", name: "Visita técnica", color: "#34b27b" }],
  statuses: [
    { id: "status-planned", code: "PLANNED", name: "Planificada", color: "#3b82f6" },
    { id: "status-progress", code: "IN_PROGRESS", name: "En progreso", color: "#f59e0b" },
    { id: "status-completed", code: "COMPLETED", name: "Completada", color: "#34b27b" },
    { id: "status-blocked", code: "BLOCKED", name: "Bloqueada", color: "#ef4444" },
    { id: "status-cancelled", code: "CANCELLED", name: "Cancelada", color: "#64748b" },
  ],
  priorities: [{ id: "priority-1", code: "HIGH", name: "Alta", color: "#f59e0b", level: 30 }],
};

const model: ActivityWorkspaceModel = {
  currentUserId: "tech-1",
  canCreate: true,
  ...catalog,
  activities: [{
    id: "activity-1",
    title: "Mantenimiento Panamá",
    description: "Revisión preventiva",
    startsAt: "2026-07-15T13:00:00.000Z",
    endsAt: "2026-07-15T15:00:00.000Z",
    allDay: false,
    country: { id: "country-pa", code: "PA", name: "Panamá" },
    team: null,
    type: catalog.types[0],
    status: catalog.statuses[0],
    priority: catalog.priorities[0],
    assignedTo: catalog.technicians[0],
    createdBy: catalog.technicians[0],
    series: null,
    comments: [],
    audit: [],
    createdAt: "2026-07-14T13:00:00.000Z",
    updatedAt: "2026-07-14T13:00:00.000Z",
    capabilities: { canComment: true, canUpdate: true },
  }],
};

describe("AgendaView", () => {
  beforeAll(() => {
    vi.stubGlobal("ResizeObserver", class { disconnect() {} observe() {} unobserve() {} });
    Object.defineProperty(Element.prototype, "scrollIntoView", { configurable: true, value: vi.fn() });
    Object.defineProperty(Element.prototype, "getAnimations", { configurable: true, value: vi.fn(() => []) });
  });

  beforeEach(() => {
    localStorage.clear();
    mocks.changeActivityStatus.mockReset();
    mocks.refresh.mockReset();
  });
  afterEach(cleanup);
  afterAll(() => vi.unstubAllGlobals());

  it("uses the chronological list by default and persists the status view", async () => {
    const user = userEvent.setup();
    render(<AgendaView model={model} />);

    expect(screen.getByRole("tab", { name: "Lista" })).toHaveAttribute("aria-selected", "true");
    expect(screen.getByRole("heading", { name: "miércoles, 15 de julio" })).toBeVisible();
    await user.click(screen.getByRole("tab", { name: "Por estado" }));
    expect(localStorage.getItem(AGENDA_VIEW_STORAGE_KEY)).toBe("kanban");
  });

  it("restores and persists the preferred list or status view", async () => {
    localStorage.setItem(AGENDA_VIEW_STORAGE_KEY, "kanban");
    const user = userEvent.setup();
    render(<AgendaView model={model} />);

    await waitFor(() => expect(screen.getByRole("tab", { name: "Por estado" })).toHaveAttribute("aria-selected", "true"));
    await user.click(screen.getByRole("tab", { name: "Lista" }));

    expect(localStorage.getItem(AGENDA_VIEW_STORAGE_KEY)).toBe("list");
    expect(screen.getByText("Ana Torres")).toBeVisible();
  });

  it("optimistically moves a card and rolls back when persistence fails", async () => {
    let resolveStatus!: (value: { success: false; errorCode: string }) => void;
    mocks.changeActivityStatus.mockReturnValue(new Promise((resolve) => { resolveStatus = resolve; }));
    const user = userEvent.setup();
    render(<AgendaView model={model} />);
    await user.click(screen.getByRole("tab", { name: "Por estado" }));

    await user.click(within(screen.getByTestId("status-column-PLANNED")).getByRole("button", { name: "Acciones de Mantenimiento Panamá" }));
    await user.click(await screen.findByRole("menuitem", { name: "Mover a En progreso" }));
    expect(within(screen.getByTestId("status-column-IN_PROGRESS")).getByText("Mantenimiento Panamá")).toBeVisible();

    resolveStatus({ success: false, errorCode: "FORBIDDEN" });
    await waitFor(() => expect(within(screen.getByTestId("status-column-PLANNED")).getByText("Mantenimiento Panamá")).toBeVisible());
    expect(mocks.refresh).not.toHaveBeenCalled();
  });

  it("shows a functional empty state with creation still available", () => {
    render(<AgendaView model={{ ...model, activities: [] }} />);

    expect(screen.getByText("Aún no hay actividades")).toBeVisible();
    expect(screen.getAllByRole("button", { name: "Nueva actividad" })[0]).toBeEnabled();
  });

  it("uses the shared surface-free toolbar and responsive filter grid", () => {
    render(<AgendaView model={model} />);

    const toolbar = screen.getByRole("toolbar", {
      name: "Herramientas de agenda",
    });
    expect(toolbar).not.toHaveClass("card-enterprise");
    expect(screen.getByLabelText("Filtros")).toHaveClass("agenda-filter-grid");
    expect(screen.getByRole("textbox", { name: "Buscar agenda" }).parentElement).toHaveClass(
      "agenda-filter-search",
    );
  });

  it("replaces summary metrics with actionable quick filters", async () => {
    const user = userEvent.setup();
    render(<AgendaView model={model} />);

    expect(screen.getByRole("button", { name: /Mis actividades 1/ })).toBeVisible();
    expect(screen.getByRole("button", { name: /Pendientes 1/ })).toBeVisible();
    expect(screen.queryByLabelText("Resumen operativo")).not.toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: /Mis actividades 1/ }));
    expect(screen.getByRole("button", { name: /Mis actividades 1/ })).toHaveAttribute("aria-pressed", "true");
  });

  it("uses a stable drag-and-drop accessibility id during hydration", async () => {
    localStorage.setItem(AGENDA_VIEW_STORAGE_KEY, "kanban");
    const user = userEvent.setup();
    render(<AgendaView model={model} />);
    await user.click(screen.getByRole("tab", { name: "Por estado" }));

    await waitFor(() =>
      expect(
        screen.getByRole("button", { name: /Arrastrar Mantenimiento/ }),
      ).toHaveAttribute("aria-describedby", "agenda-kanban"),
    );
  });
});
