import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeAll, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({ mobile: false }));

vi.mock("@/hooks/use-mobile", () => ({ useIsMobile: () => mocks.mobile }));

import { ResponsiveDatePicker } from "@/components/forms/responsive-date-picker";
import { ResponsiveDateRangePicker } from "@/components/forms/responsive-date-range-picker";

describe("responsive ShadCN date pickers", () => {
  beforeAll(() => {
    vi.stubGlobal("ResizeObserver", class {
      disconnect() {}
      observe() {}
      unobserve() {}
    });
  });

  afterEach(() => {
    cleanup();
    mocks.mobile = false;
  });

  it("opens a ShadCN Calendar inside a Popover on larger screens", () => {
    render(
      <ResponsiveDatePicker
        label="Fecha de inicio"
        onChange={() => undefined}
        value={new Date(2026, 6, 20)}
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: "Fecha de inicio" }));

    expect(document.querySelector("[data-slot='calendar']")).toBeInTheDocument();
  });

  it("opens a range Calendar inside a Drawer on mobile", () => {
    mocks.mobile = true;
    render(
      <ResponsiveDateRangePicker
        label="Filtrar por rango de fechas"
        onChange={() => undefined}
        value={{ from: new Date(2026, 6, 20), to: new Date(2026, 6, 24) }}
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: "Filtrar por rango de fechas" }));

    expect(screen.getByRole("dialog")).toBeVisible();
    expect(screen.getByText("Seleccionar rango")).toBeVisible();
    expect(document.querySelector("[data-slot='calendar']")).toBeInTheDocument();
  });
});
