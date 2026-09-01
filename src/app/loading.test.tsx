import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import Loading from "@/app/loading";

describe("root loading state", () => {
  it("uses a module-neutral message", () => {
    render(<Loading />);

    expect(screen.getByRole("status", { name: "Cargando contenido" })).toBeVisible();
    expect(screen.queryByLabelText("Cargando agenda")).not.toBeInTheDocument();
  });
});
