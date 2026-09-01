import { render, screen } from "@testing-library/react";
import { CalendarDaysIcon } from "lucide-react";
import { describe, expect, it } from "vitest";

import {
  DetailBadgeRow,
  DetailField,
  DetailSection,
} from "@/components/product/details";

describe("detail primitives", () => {
  it("renders a labelled thematic region", () => {
    render(
      <DetailSection title="Programación">
        <p>Contenido</p>
      </DetailSection>,
    );

    expect(
      screen.getByRole("region", { name: "Programación" }),
    ).toBeVisible();
  });

  it("renders an explicit fallback and non-wrapping value", () => {
    render(
      <DetailField
        icon={CalendarDaysIcon}
        label="Inicio"
        preventWrap
        value={null}
      />,
    );

    expect(screen.getByText("Sin información")).toHaveClass(
      "whitespace-nowrap",
    );
  });

  it("separates primary and secondary metadata groups", () => {
    render(
      <DetailBadgeRow
        primary={<span>Cancelada</span>}
        secondary={<span>Recurrente</span>}
      />,
    );

    expect(screen.getByTestId("detail-badges-primary")).toContainElement(
      screen.getByText("Cancelada"),
    );
    expect(screen.getByTestId("detail-badges-secondary")).toContainElement(
      screen.getByText("Recurrente"),
    );
  });
});
