import { describe, expect, it } from "vitest";

import {
  resolveEffectivePermissions,
  type PermissionAssignment,
  type PermissionOverride,
} from "@/lib/authorization/effective-permissions";

const globalAdmin: PermissionAssignment = {
  scopeType: "GLOBAL",
  countryId: null,
  teamId: null,
  role: {
    key: "ADMIN",
    priority: 500,
    permissions: ["activity:read", "team:manage"],
  },
};

describe("resolveEffectivePermissions", () => {
  it("uses only global assignments when no resource is supplied", () => {
    const result = resolveEffectivePermissions({
      assignments: [
        globalAdmin,
        {
          scopeType: "COUNTRY",
          countryId: "country-pa",
          teamId: null,
          role: {
            key: "TECNICO",
            priority: 400,
            permissions: ["activity:create"],
          },
        },
      ],
      overrides: [],
    });

    expect(result.roles).toEqual(["ADMIN"]);
    expect(result.permissions).toEqual(
      new Set(["activity:read", "team:manage"]),
    );
  });

  it("combines global, country and matching team assignments", () => {
    const result = resolveEffectivePermissions({
      assignments: [
        globalAdmin,
        {
          scopeType: "COUNTRY",
          countryId: "country-pa",
          teamId: null,
          role: {
            key: "TECNICO",
            priority: 400,
            permissions: ["activity:create"],
          },
        },
        {
          scopeType: "TEAM",
          countryId: null,
          teamId: "team-pa",
          role: {
            key: "FIELD_COORDINATOR",
            priority: 300,
            permissions: ["activity:assign"],
          },
        },
      ],
      overrides: [],
      resource: { countryId: "country-pa", teamId: "team-pa" },
    });

    expect(result.permissions).toEqual(
      new Set([
        "activity:read",
        "team:manage",
        "activity:create",
        "activity:assign",
      ]),
    );
  });

  it("applies grants but always lets any applicable deny win", () => {
    const overrides: PermissionOverride[] = [
      {
        permissionKey: "activity:create",
        effect: "GRANT",
        countryId: "country-pa",
        teamId: null,
      },
      {
        permissionKey: "activity:read",
        effect: "DENY",
        countryId: null,
        teamId: "team-pa",
      },
      {
        permissionKey: "team:manage",
        effect: "GRANT",
        countryId: null,
        teamId: "team-pa",
      },
      {
        permissionKey: "team:manage",
        effect: "DENY",
        countryId: null,
        teamId: null,
      },
    ];

    const result = resolveEffectivePermissions({
      assignments: [globalAdmin],
      overrides,
      resource: { countryId: "country-pa", teamId: "team-pa" },
    });

    expect(result.can("activity:create")).toBe(true);
    expect(result.can("activity:read")).toBe(false);
    expect(result.can("team:manage")).toBe(false);
    expect(result.sources["activity:read"].effect).toBe("DENY");
  });

  it("ignores overrides outside the requested scope", () => {
    const result = resolveEffectivePermissions({
      assignments: [globalAdmin],
      overrides: [
        {
          permissionKey: "activity:read",
          effect: "DENY",
          countryId: "country-mx",
          teamId: null,
        },
      ],
      resource: { countryId: "country-pa", teamId: "team-pa" },
    });

    expect(result.can("activity:read")).toBe(true);
  });
});
