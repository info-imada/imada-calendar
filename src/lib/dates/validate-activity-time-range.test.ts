import { describe, expect, it } from "vitest";

import { validateActivityTimeRange } from "./validate-activity-time-range";

describe("validateActivityTimeRange", () => {
  it("accepts an end after the start", () => {
    const result = validateActivityTimeRange({
      startsAt: new Date("2026-07-14T09:00:00"),
      endsAt: new Date("2026-07-14T11:00:00"),
    });

    expect(result).toEqual({ durationMinutes: 120, valid: true });
  });

  it("rejects equal or earlier end times", () => {
    expect(validateActivityTimeRange({ startsAt: new Date("2026-07-14T11:00:00"), endsAt: new Date("2026-07-14T11:00:00") }).valid).toBe(false);
    expect(validateActivityTimeRange({ startsAt: new Date("2026-07-14T23:00:00"), endsAt: new Date("2026-07-14T01:00:00") }).valid).toBe(false);
  });
});
