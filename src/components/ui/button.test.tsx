import { fireEvent, render, screen } from "@testing-library/react";
import type { FormEvent } from "react";
import { describe, expect, it, vi } from "vitest";

import { Button } from "@/components/ui/button";

describe("Button", () => {
  it("does not submit a surrounding form unless explicitly requested", () => {
    const onSubmit = vi.fn((event: FormEvent<HTMLFormElement>) => event.preventDefault());

    render(
      <form onSubmit={onSubmit}>
        <Button onClick={() => undefined}>Siguiente</Button>
      </form>,
    );

    const button = screen.getByRole("button", { name: "Siguiente" });
    expect(button).toHaveAttribute("type", "button");

    fireEvent.click(button);
    expect(onSubmit).not.toHaveBeenCalled();
  });
});
