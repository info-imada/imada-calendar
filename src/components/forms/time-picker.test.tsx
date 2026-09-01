import userEvent from "@testing-library/user-event";
import { cleanup, render, screen } from "@testing-library/react";
import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from "vitest";

vi.mock("@/hooks/use-mobile", () => ({ useIsMobile: () => false }));

import { createTimeOptions, TimePicker } from "@/components/forms/time-picker";

describe("TimePicker", () => {
  beforeAll(() => {
    vi.stubGlobal("ResizeObserver", class {
      disconnect() {}
      observe() {}
      unobserve() {}
    });
    Object.defineProperty(Element.prototype, "getAnimations", { configurable: true, value: vi.fn(() => []) });
    Object.defineProperty(Element.prototype, "scrollIntoView", { configurable: true, value: vi.fn() });
  });

  afterAll(() => vi.unstubAllGlobals());
  afterEach(cleanup);

  it("creates a full day of deterministic 30-minute options", () => {
    const options = createTimeOptions(30);

    expect(options).toHaveLength(48);
    expect(options[0]).toEqual({ label: "12:00 a. m.", value: "00:00" });
    expect(options[19]).toEqual({ label: "9:30 a. m.", value: "09:30" });
  });

  it("selects a localized time without a native time input", async () => {
    const onChange = vi.fn();
    const user = userEvent.setup();
    const { container } = render(<TimePicker label="Hora de inicio" onChange={onChange} value="09:00" />);

    expect(screen.getByRole("button", { name: "Hora de inicio" })).toHaveTextContent("9:00 a. m.");
    expect(container.querySelector('input[type="time"]')).toBeNull();

    await user.click(screen.getByRole("button", { name: "Hora de inicio" }));
    await user.click(screen.getByText("9:30 a. m."));

    expect(onChange).toHaveBeenCalledWith("09:30");
  });

  it("disables selection for all-day activities", () => {
    render(<TimePicker disabled label="Hora de fin" onChange={() => undefined} value="17:00" />);
    expect(screen.getByRole("button", { name: "Hora de fin" })).toBeDisabled();
  });
});
