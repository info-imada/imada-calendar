import { describe, expect, it } from "vitest";

import {
  buildWorkLogHistoryWhere,
  buildWorkLogScopeWhere,
} from "@/lib/work-logs/read-model";

describe("work log read model scopes", () => {
  it("allows global administrators to query every work log", () => {
    expect(buildWorkLogScopeWhere("user-1", [
      { scopeType: "GLOBAL", countryId: null, teamId: null },
    ])).toEqual({});
  });

  it("combines the owner and the administrator's territorial scope", () => {
    expect(buildWorkLogScopeWhere("user-1", [
      { scopeType: "COUNTRY", countryId: "country-1", teamId: null },
      { scopeType: "TEAM", countryId: null, teamId: "team-1" },
    ])).toEqual({
      OR: [
        { userId: "user-1" },
        { countryId: { in: ["country-1"] } },
        { teamId: { in: ["team-1"] } },
      ],
    });
  });

  it("returns an impossible predicate when the user has no scope", () => {
    expect(buildWorkLogScopeWhere("user-1", [])).toEqual({
      id: { equals: "__work-log-scope-denied__" },
    });
  });

  it("builds the same date and status filters used by the history screen", () => {
    const dateFrom = new Date("2026-08-01T00:00:00.000Z");
    const dateTo = new Date("2026-08-31T00:00:00.000Z");

    expect(buildWorkLogHistoryWhere("user-1", {
      dateFrom,
      dateTo,
      customerId: "customer-1",
      reference: " IMADA-123 ",
      status: "COMPLETED",
    })).toEqual({
      AND: [
        { OR: [{ userId: "user-1" }] },
        { workDate: { gte: dateFrom, lte: dateTo } },
        { customerId: "customer-1" },
        { machineReference: { contains: "IMADA-123", mode: "insensitive" } },
        { status: "COMPLETED" },
      ],
    });
  });
});
