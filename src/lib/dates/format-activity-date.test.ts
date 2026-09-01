import { describe, expect, it } from "vitest";

import {
  formatActivityDate,
  formatActivityDateTime,
} from "@/lib/dates/format-activity-date";

describe("activity date formatting", () => {
  it("formats Panama operation time compactly", () => {
    expect(formatActivityDateTime("2026-07-30T14:00:00.000Z")).toBe(
      "30 jul 2026 · 9:00 a. m.",
    );
  });

  it("formats a date without time for recurrence copy", () => {
    expect(formatActivityDate("2026-07-30T23:59:59.000Z")).toBe(
      "30 jul 2026",
    );
  });

  it("does not emit non-breaking spaces", () => {
    expect(formatActivityDateTime("2026-07-30T14:00:00.000Z")).not.toMatch(
      /[\u00a0\u202f]/,
    );
  });
});
