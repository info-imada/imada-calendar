import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import type { ActivityWorkspaceModel } from "@/features/activities/activity-types";

const mocks = vi.hoisted(() => ({ isMobile: false }));
vi.mock("@/hooks/use-mobile", () => ({ useIsMobile: () => mocks.isMobile }));
vi.mock("react-big-calendar", () => ({
  Calendar: ({
    events,
    onDrillDown,
    onSelectEvent,
    onSelectSlot,
    resourceAccessor,
    resourceIdAccessor,
    resources,
    view,
  }: {
    events: Array<{ id: string; title: string }>;
    onDrillDown: (date: Date) => void;
    onSelectEvent: (event: { id: string; title: string }) => void;
    onSelectSlot: (slot: {
      action: string;
      end: Date;
      slots: Date[];
      start: Date;
    }) => void;
    resourceAccessor?: string;
    resourceIdAccessor?: string;
    resources?: unknown[];
    view: string;
  }) => (
    <div
      data-resource-accessor={resourceAccessor}
      data-resource-count={resources?.length ?? 0}
      data-resource-id-accessor={resourceIdAccessor}
      data-testid="big-calendar"
      data-view={view}
    >
      <button
        onClick={() =>
          onSelectSlot({
            action: "select",
            end: new Date("2026-07-20T16:00:00.000Z"),
            slots: [],
            start: new Date("2026-07-20T14:00:00.000Z"),
          })
        }
        type="button"
      >
        Seleccionar intervalo
      </button>
      <button onClick={() => onSelectEvent(events[0])} type="button">
        Abrir primer evento
      </button>
      <button onClick={() => onDrillDown(new Date("2026-07-20T12:00:00.000Z"))} type="button">
        Abrir día
      </button>
    </div>
  ),
  dateFnsLocalizer: () => ({}),
}));
vi.mock("@/features/activities/activity-form-panel", () => ({
  ActivityFormPanel: ({
    activity,
    initialEndsAt,
    initialStartsAt,
    open,
  }: {
    activity?: { id: string } | null;
    initialEndsAt?: Date;
    initialStartsAt?: Date;
    open: boolean;
  }) =>
    open ? (
      <div aria-label="Formulario de actividad" role="dialog">
        <span>{activity ? `edit:${activity.id}` : "create"}</span>
        <span>{initialStartsAt?.toISOString()}</span>
        <span>{initialEndsAt?.toISOString()}</span>
      </div>
    ) : null,
}));
vi.mock("@/features/activities/activity-detail-panel", () => ({
  ActivityDetailPanel: ({ activity, open }: { activity?: { id: string } | null; open: boolean }) =>
    open ? <div aria-label="Detalle de actividad" role="dialog">detail:{activity?.id}</div> : null,
}));

import { CalendarWorkspace } from "@/features/calendar/calendar-workspace";

const catalog = {
  countries: [{ id: "country-pa", code: "PA", name: "Panamá", teams: [] }],
  technicians: [
    { id: "tech-pa", name: "Ana Torres", email: "ana@example.com" },
  ],
  types: [{ id: "type-1", code: "VISIT", name: "Visita", color: "#34b27b" }],
  statuses: [
    { id: "status-1", code: "PLANNED", name: "Planificada", color: "#3b82f6" },
  ],
  priorities: [
    {
      id: "priority-1",
      code: "HIGH",
      name: "Alta",
      color: "#f59e0b",
      level: 30,
    },
  ],
};

const model: ActivityWorkspaceModel = {
  currentUserId: "tech-pa",
  canCreate: true,
  ...catalog,
  activities: [
    {
      id: "activity-pa",
      title: "Mantenimiento Panamá",
      description: null,
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
    },
  ],
};

describe("CalendarWorkspace", () => {
  afterEach(() => { cleanup(); mocks.isMobile = false; });

  it("switches between month, week and technician resource views", () => {
    render(<CalendarWorkspace model={model} />);

    expect(
      screen.getByRole("toolbar", { name: "Herramientas del calendario" }),
    ).not.toHaveClass("card-enterprise");
    expect(
      screen.getByRole("heading", { name: "Calendario operativo" }),
    ).toBeVisible();
    expect(screen.getByTestId("big-calendar")).toHaveAttribute(
      "data-view",
      "month",
    );

    fireEvent.click(screen.getByRole("tab", { name: "Semana" }));
    expect(screen.getByTestId("big-calendar")).toHaveAttribute(
      "data-view",
      "week",
    );

    fireEvent.click(screen.getByRole("tab", { name: "Técnicos" }));
    expect(screen.getByTestId("big-calendar")).toHaveAttribute(
      "data-view",
      "day",
    );
    expect(screen.getByTestId("big-calendar")).toHaveAttribute(
      "data-resource-count",
      "2",
    );
    expect(screen.getByTestId("big-calendar")).toHaveAttribute(
      "data-resource-accessor",
      "resourceId",
    );
    expect(screen.getByTestId("big-calendar")).toHaveAttribute(
      "data-resource-id-accessor",
      "id",
    );
  });

  it("opens creation from a selected slot without losing calendar context", () => {
    render(<CalendarWorkspace model={model} />);

    fireEvent.click(
      screen.getByRole("button", { name: "Seleccionar intervalo" }),
    );

    const form = screen.getByRole("dialog", {
      name: "Formulario de actividad",
    });
    expect(form).toHaveTextContent("create");
    expect(form).toHaveTextContent("2026-07-20T14:00:00.000Z");
    expect(form).toHaveTextContent("2026-07-20T16:00:00.000Z");
    expect(screen.getByTestId("big-calendar")).toBeVisible();
  });

  it("opens an existing event in the shared detail before editing", () => {
    render(<CalendarWorkspace model={model} />);

    fireEvent.click(
      screen.getByRole("button", { name: "Abrir primer evento" }),
    );

    expect(
      screen.getByRole("dialog", { name: "Detalle de actividad" }),
    ).toHaveTextContent("detail:activity-pa");
  });

  it("drills from a month cell into the weekly operational view", () => {
    render(<CalendarWorkspace model={model} />);

    fireEvent.click(screen.getByRole("button", { name: "Abrir día" }));

    expect(screen.getByTestId("big-calendar")).toHaveAttribute("data-view", "week");
    expect(screen.getByRole("tab", { name: "Semana" })).toHaveAttribute("aria-selected", "true");
  });

  it("keeps the calendar and creation action available when filters have no events", () => {
    render(<CalendarWorkspace model={{ ...model, activities: [] }} />);

    expect(screen.getByText("Sin actividades para estos filtros")).toBeVisible();
    expect(screen.getByTestId("big-calendar")).toBeVisible();
    expect(screen.getAllByRole("button", { name: "Nueva actividad" })[0]).toBeEnabled();
  });

  it("does not repeat a permanent status legend", () => {
    render(<CalendarWorkspace model={model} />);

    expect(screen.queryByLabelText("Leyenda de estados")).not.toBeInTheDocument();
  });

  it("uses a grouped agenda instead of the calendar grid on mobile", () => {
    mocks.isMobile = true;
    render(<CalendarWorkspace model={model} />);

    expect(screen.queryByTestId("big-calendar")).not.toBeInTheDocument();
    expect(screen.getByRole("heading", { name: /miércoles.*15.*julio/i })).toBeVisible();
    expect(screen.getByRole("button", { name: "Mantenimiento Panamá" })).toBeVisible();
  });
});
