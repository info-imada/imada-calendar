import { afterEach, describe, expect, it } from "vitest";

import { buildAuthenticationState, createAuthOptions } from "@/lib/auth";
import { AccessStatus } from "@prisma/client";

const originalZohoClientId = process.env.ZOHO_CLIENT_ID;
const originalZohoClientSecret = process.env.ZOHO_CLIENT_SECRET;

afterEach(() => {
  process.env.ZOHO_CLIENT_ID = originalZohoClientId;
  process.env.ZOHO_CLIENT_SECRET = originalZohoClientSecret;
});

describe("Zoho auth callback", () => {
  it("enables adapter-owned linking for an eligible Zoho identity", () => {
    process.env.ZOHO_CLIENT_ID = "test-client-id";
    process.env.ZOHO_CLIENT_SECRET = "test-client-secret";

    const zohoProvider = createAuthOptions().providers?.find((provider) => provider.id === "zoho");

    expect(zohoProvider).toMatchObject({
      options: { allowDangerousEmailAccountLinking: true },
    });
  });
});

describe("fresh authentication state", () => {
  it("returns active when the database has a role even if the previous token was pending", () => {
    expect(buildAuthenticationState({
      email: "technician@example.com",
      accessStatus: AccessStatus.ACTIVE,
      credential: null,
      roleAssignments: [{ id: "assignment-1" }],
    }, "technician@example.com")).toEqual({
      accessDecision: "ACTIVE",
      email: "technician@example.com",
      mustChangePassword: false,
    });
  });

  it("keeps genuinely unassigned pending users pending", () => {
    expect(buildAuthenticationState({
      email: "pending@example.com",
      accessStatus: AccessStatus.PENDING,
      credential: null,
      roleAssignments: [],
    }, "pending@example.com").accessDecision).toBe("PENDING");
  });
});
