import { describe, expect, it } from "vitest";

import {
  combineLocalDateAndTime,
  endOfSelectedDay,
  getLocalTimeValue,
} from "@/lib/dates/form-date-time";

describe("form date and time helpers", () => {
  it("combines a selected calendar date with a local time", () => {
    const value = combineLocalDateAndTime(new Date(2026, 6, 20), "09:30");

    expect(value.getFullYear()).toBe(2026);
    expect(value.getMonth()).toBe(6);
    expect(value.getDate()).toBe(20);
    expect(value.getHours()).toBe(9);
    expect(value.getMinutes()).toBe(30);
  });

  it("normalizes recurrence end dates to the end of the selected day", () => {
    const value = endOfSelectedDay(new Date(2026, 6, 30, 8, 15));

    expect([value.getHours(), value.getMinutes(), value.getSeconds(), value.getMilliseconds()]).toEqual([23, 59, 59, 999]);
  });

  it("serializes a Date for the ShadCN time Input", () => {
    expect(getLocalTimeValue(new Date(2026, 6, 20, 7, 5))).toBe("07:05");
  });
});
