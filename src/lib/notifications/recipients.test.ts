import { beforeEach, describe, expect, it, vi } from "vitest";

const mockedGetEffectivePermissions = vi.hoisted(() => vi.fn());

vi.mock("@/lib/permissions", () => ({ getEffectivePermissions: mockedGetEffectivePermissions }));

import { composeEmailRecipients, notificationDedupeKey, resolveActivitySupervisors } from "@/lib/notifications/recipients";

describe("notification recipients", () => {
  beforeEach(() => mockedGetEffectivePermissions.mockReset());

  it("uses one primary recipient and deduplicates supervisors into cc", () => {
    expect(
      composeEmailRecipients({
        directRecipients: [
          { id: "tech", email: "Tech@Example.com", name: "Técnico" },
          { id: "creator", email: "creator@example.com", name: "Creador" },
        ],
        supervisors: [
          { id: "admin", email: "admin@example.com", name: "Admin" },
          { id: "duplicate", email: "tech@example.com", name: "Duplicado" },
        ],
      }),
    ).toEqual({
      to: ["tech@example.com"],
      cc: ["creator@example.com", "admin@example.com"],
    });
  });

  it("skips recipients without email and returns no delivery without a primary", () => {
    expect(
      composeEmailRecipients({
        directRecipients: [{ id: "tech", email: null, name: "Técnico" }],
        supervisors: [{ id: "admin", email: "admin@example.com", name: "Admin" }],
      }),
    ).toEqual({ to: ["admin@example.com"], cc: [] });
  });

  it("builds a stable event-level dedupe key", () => {
    expect(notificationDedupeKey("audit-1", "ACTIVITY_CREATED")).toBe(
      "audit-1:ACTIVITY_CREATED",
    );
  });

  it("resolves supervisors from one authorization query inside an activity transaction", async () => {
    const transaction = {
      user: {
        findMany: vi.fn().mockResolvedValue([
          {
            id: "admin",
            email: "admin@example.com",
            name: "Admin",
            roleAssignments: [{
              scopeType: "GLOBAL",
              countryId: null,
              teamId: null,
              role: { key: "ADMIN", priority: 500, permissions: [{ permission: { key: "activity:read" } }, { permission: { key: "activity:assign" } }] },
            }],
            permissionOverrides: [],
          },
        ]),
      },
    } as never;

    const supervisors = await resolveActivitySupervisors(transaction, { countryId: "country-1", teamId: "team-1" });

    expect(supervisors).toEqual([{ id: "admin", email: "admin@example.com", name: "Admin" }]);
    expect((transaction as { user: { findMany: ReturnType<typeof vi.fn> } }).user.findMany).toHaveBeenCalledOnce();
    expect(mockedGetEffectivePermissions).not.toHaveBeenCalled();
  });
});
