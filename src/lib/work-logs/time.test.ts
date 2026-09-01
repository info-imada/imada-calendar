import { describe, expect, it } from "vitest";

import {
  formatWorkLogDateTime,
  getWorkDate,
  isStartResetAllowed,
} from "@/lib/work-logs/time";

describe("work log time helpers", () => {
  it("derives the local work date from the captured timezone", () => {
    expect(getWorkDate(new Date("2026-08-31T00:30:00.000Z"), "Europe/Madrid")).toBe("2026-08-31");
    expect(getWorkDate(new Date("2026-08-31T06:30:00.000Z"), "America/Panama")).toBe("2026-08-31");
  });

  it("formats UTC instants using the work log timezone", () => {
    expect(formatWorkLogDateTime(new Date("2026-08-31T06:30:00.000Z"), "America/Panama")).toBe("31 ago 2026 · 1:30 a. m.");
  });

  it("allows start reset only during the first two minutes", () => {
    const startedAt = new Date("2026-08-31T12:00:00.000Z");
    expect(isStartResetAllowed(startedAt, new Date("2026-08-31T12:01:59.999Z"))).toBe(true);
    expect(isStartResetAllowed(startedAt, new Date("2026-08-31T12:02:00.001Z"))).toBe(false);
  });
});
