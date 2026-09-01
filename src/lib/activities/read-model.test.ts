import { ScopeType } from "@prisma/client";
import { describe, expect, it } from "vitest";

import { buildActivityScopeWhere } from "@/lib/activities/read-model";

describe("activity scope query", () => {
  it("does not constrain a global assignment", () => {
    expect(buildActivityScopeWhere("user-1", [
      { scopeType: ScopeType.GLOBAL, countryId: null, teamId: null },
    ])).toEqual({});
  });

  it("combines country, team and own activity scopes", () => {
    expect(buildActivityScopeWhere("user-1", [
      { scopeType: ScopeType.COUNTRY, countryId: "country-1", teamId: null },
      { scopeType: ScopeType.TEAM, countryId: null, teamId: "team-1" },
    ])).toEqual({
      OR: [
        { countryId: { in: ["country-1"] } },
        { teamId: { in: ["team-1"] } },
        { assignedToId: "user-1" },
        { createdById: "user-1" },
      ],
    });
  });
});
