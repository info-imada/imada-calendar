import { describe, expect, it } from "vitest";

import { buildOccurrenceWindows, hasInternalScheduleOverlap } from "@/lib/activities/schedule";

describe("activity recurrence schedule", () => {
  it("builds daily occurrence windows while preserving duration", () => {
    const windows = buildOccurrenceWindows({
      startsAt: new Date("2026-07-15T13:00:00.000Z"),
      endsAt: new Date("2026-07-15T15:00:00.000Z"),
      recurrence: {
        frequency: "DAILY",
        interval: 1,
        endsAt: new Date("2026-07-17T13:00:00.000Z"),
        timezone: "America/Panama",
      },
    });

    expect(windows).toHaveLength(3);
    expect(windows[2]).toEqual({
      startsAt: new Date("2026-07-17T13:00:00.000Z"),
      endsAt: new Date("2026-07-17T15:00:00.000Z"),
    });
    expect(hasInternalScheduleOverlap(windows)).toBe(false);
  });

  it("detects a recurring schedule that overlaps itself", () => {
    const windows = buildOccurrenceWindows({
      startsAt: new Date("2026-07-15T13:00:00.000Z"),
      endsAt: new Date("2026-07-16T14:00:00.000Z"),
      recurrence: {
        frequency: "DAILY",
        interval: 1,
        endsAt: new Date("2026-07-17T13:00:00.000Z"),
        timezone: "America/Panama",
      },
    });

    expect(hasInternalScheduleOverlap(windows)).toBe(true);
  });

  it("caps unbounded occurrence generation", () => {
    expect(() => buildOccurrenceWindows({
      startsAt: new Date("2026-01-01T13:00:00.000Z"),
      endsAt: new Date("2026-01-01T14:00:00.000Z"),
      recurrence: {
        frequency: "DAILY",
        interval: 1,
        endsAt: new Date("2026-12-31T13:00:00.000Z"),
        timezone: "America/Panama",
      },
    })).toThrowError("RECURRENCE_LIMIT");
  });
});
