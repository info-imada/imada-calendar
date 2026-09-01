import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { WorkLogFilters } from "@/features/work-logs/work-log-filters";

describe("WorkLogFilters", () => {
  beforeEach(() => {
    vi.stubGlobal("matchMedia", (query: string) => ({
      matches: !query.includes("max-width: 639px"),
      media: query,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      addListener: vi.fn(),
      removeListener: vi.fn(),
      onchange: null,
      dispatchEvent: vi.fn(),
    }));
  });

  it("uses accessible design-system triggers instead of native select and date controls", () => {
    render(
      <WorkLogFilters
        onChange={vi.fn()}
        value={{ dateFrom: "", dateTo: "", reference: "", status: "" }}
      />,
    );

    expect(document.querySelectorAll("select")).toHaveLength(0);
    expect(screen.getByRole("combobox", { name: /estado/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /desde/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /hasta/i })).toBeInTheDocument();
  });
});
