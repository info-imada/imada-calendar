import userEvent from "@testing-library/user-event";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from "vitest";

vi.mock("next/navigation", () => ({ useRouter: () => ({ refresh: vi.fn() }) }));
vi.mock("@/hooks/use-mobile", () => ({ useIsMobile: () => false }));
vi.mock("@/app/actions/activities", () => ({
  createActivity: vi.fn(),
  updateActivity: vi.fn(),
}));

import { ActivityFormPanel } from "@/features/activities/activity-form-panel";
import { createActivity } from "@/app/actions/activities";

const model = {
  currentUserId: "tech-1",
  canCreate: true,
  activities: [],
  countries: [{ id: "country-pa", code: "PA", name: "Panamá", teams: [{ id: "team-pa", name: "Soporte Panamá" }] }],
  technicians: [{ id: "tech-1", name: "Ana Torres", email: "ana@example.com" }],
  types: [{ id: "type-1", code: "VISIT", name: "Visita", color: "#10B981" }],
  statuses: [{ id: "status-1", code: "PLANNED", name: "Planificada", color: "#3B82F6" }],
  priorities: [{ id: "priority-1", code: "MEDIUM", name: "Media", color: "#3B82F6", level: 20 }],
};

describe("ActivityFormPanel ShadCN controls", () => {
  beforeAll(() => {
    vi.stubGlobal("ResizeObserver", class {
      disconnect() {}
      observe() {}
      unobserve() {}
    });
    Object.defineProperty(Element.prototype, "getAnimations", { configurable: true, value: vi.fn(() => []) });
  });

  afterAll(() => vi.unstubAllGlobals());
  afterEach(cleanup);

  it("guides creation through three focused steps with advanced options disclosed on demand", async () => {
    const user = userEvent.setup();
    render(
      <ActivityFormPanel
        initialEndsAt={new Date(2026, 6, 20, 11, 0)}
        initialStartsAt={new Date(2026, 6, 20, 9, 0)}
        model={model}
        onOpenChange={() => undefined}
        open
      />,
    );

    expect(screen.getByText("Paso 1 de 3")).toBeVisible();
    expect(screen.getByRole("heading", { name: "Actividad" })).toBeVisible();
    expect(screen.queryByRole("button", { name: "Inicio" })).not.toBeInTheDocument();
    await user.type(screen.getByRole("textbox", { name: "Título" }), "Visita técnica");
    await user.click(screen.getByRole("button", { name: "Siguiente" }));
    expect(screen.getByText("Paso 2 de 3")).toBeVisible();
    expect(screen.getByRole("button", { name: "Inicio" })).toHaveTextContent("20 jul 2026");
    expect(screen.getByRole("button", { name: "Fin" })).toHaveTextContent("20 jul 2026");
    expect(screen.getByRole("button", { name: "Hora de inicio" })).toHaveTextContent("9:00 a. m.");
    expect(screen.getByRole("button", { name: "Hora de fin" })).toHaveTextContent("11:00 a. m.");
    expect(screen.getByRole("checkbox", { name: "Todo el día" })).toHaveAttribute("data-slot", "checkbox");
    expect(document.querySelector('input[type="time"]')).toBeNull();
    await user.click(screen.getByRole("button", { name: "Siguiente" }));
    expect(screen.getByText("Paso 3 de 3")).toBeVisible();
    expect(screen.getByRole("combobox", { name: "País" })).toHaveAttribute("data-slot", "select-trigger");
    expect(screen.getByText("Opciones")).toBeVisible();
  });

  it("keeps the user on the current step and explains missing required fields", async () => {
    const user = userEvent.setup();
    const mockedCreateActivity = vi.mocked(createActivity);
    mockedCreateActivity.mockReset();

    render(<ActivityFormPanel model={model} onOpenChange={() => undefined} open />);

    await user.click(screen.getByRole("button", { name: "Siguiente" }));

    expect(screen.getByText("Paso 1 de 3")).toBeVisible();
    expect(screen.getByText("Indica un título para la actividad.")).toBeVisible();
    expect(mockedCreateActivity).not.toHaveBeenCalled();
  });

  it("requires an active customer before allowing the final save", async () => {
    const user = userEvent.setup();
    const customerModel = {
      ...model,
      customers: [{ id: "customer-1", name: "Cliente demo", code: null, isActive: true }],
    };

    render(<ActivityFormPanel model={customerModel} onOpenChange={() => undefined} open />);
    await user.type(screen.getByRole("textbox", { name: "Título" }), "Visita técnica");
    await user.click(screen.getByRole("button", { name: "Siguiente" }));
    await user.click(screen.getByRole("button", { name: "Siguiente" }));

    await user.click(screen.getByRole("combobox", { name: "Cliente" }));
    await user.click(screen.getByText("Sin cliente", { exact: true }));

    const save = screen.getByRole("button", { name: "Guardar actividad" });
    expect(save).toBeDisabled();
    expect(screen.getByText("Selecciona un cliente.")).toBeVisible();
  });

  it("never persists when the form is submitted before the final step", () => {
    const mockedCreateActivity = vi.mocked(createActivity);
    mockedCreateActivity.mockReset();

    render(<ActivityFormPanel model={model} onOpenChange={() => undefined} open />);

    fireEvent.change(screen.getByRole("textbox", { name: "Título" }), { target: { value: "Visita técnica" } });

    const form = screen.getByRole("button", { name: "Siguiente" }).closest("form");
    expect(form).not.toBeNull();
    fireEvent.submit(form!);

    expect(screen.getByText("Paso 2 de 3")).toBeVisible();
    expect(mockedCreateActivity).not.toHaveBeenCalled();
  });

  it("does not persist on an implicit submit from the final step", () => {
    const mockedCreateActivity = vi.mocked(createActivity);
    mockedCreateActivity.mockReset();

    render(<ActivityFormPanel model={model} onOpenChange={() => undefined} open />);

    fireEvent.change(screen.getByRole("textbox", { name: "Título" }), { target: { value: "Visita técnica" } });

    const form = screen.getByRole("button", { name: "Siguiente" }).closest("form");
    expect(form).not.toBeNull();
    fireEvent.submit(form!);
    fireEvent.submit(form!);
    expect(screen.getByText("Paso 3 de 3")).toBeVisible();

    fireEvent.submit(form!);
    expect(mockedCreateActivity).not.toHaveBeenCalled();
    expect(screen.getByText("Paso 3 de 3")).toBeVisible();
  });

  it("confirms before discarding unsaved changes", async () => {
    const onOpenChange = vi.fn();
    const user = userEvent.setup();
    render(<ActivityFormPanel model={model} onOpenChange={onOpenChange} open />);

    await user.type(screen.getByRole("textbox", { name: "Título" }), "Visita técnica");
    await user.click(screen.getByRole("button", { name: "Cerrar" }));

    expect(screen.getByRole("alertdialog")).toHaveTextContent("Descartar cambios sin guardar");
    expect(onOpenChange).not.toHaveBeenCalledWith(false);

    await user.click(screen.getByRole("button", { name: "Descartar" }));
    expect(onOpenChange).toHaveBeenCalledWith(false);
  });

  it("blocks an end time equal to the start before calling the action", async () => {
    const user = userEvent.setup();
    const mockedCreateActivity = vi.mocked(createActivity);
    mockedCreateActivity.mockReset();

    render(
      <ActivityFormPanel
        initialEndsAt={new Date(2026, 6, 20, 9, 0)}
        initialStartsAt={new Date(2026, 6, 20, 9, 0)}
        model={model}
        onOpenChange={() => undefined}
        open
      />,
    );

    await user.type(screen.getByRole("textbox", { name: "Título" }), "Visita técnica");
    await user.click(screen.getByRole("button", { name: "Siguiente" }));
    await user.click(screen.getByRole("button", { name: "Siguiente" }));
    await user.click(screen.getByRole("button", { name: "Guardar actividad" }));

    expect((await screen.findAllByText("La hora de fin debe ser posterior a la hora de inicio.")).length).toBeGreaterThan(0);
    expect(mockedCreateActivity).not.toHaveBeenCalled();
  });
});
