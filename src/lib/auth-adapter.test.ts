import type { AdapterAccount } from "@auth/core/adapters";
import { describe, expect, it } from "vitest";

import { sanitizeAdapterAccount } from "@/lib/auth-adapter";

describe("sanitizeAdapterAccount", () => {
  it("removes provider-specific token fields before Prisma persists an OAuth account", () => {
    const account = {
      userId: "cmrl0x4sa000180o3h9q67awx",
      type: "oauth",
      provider: "zoho",
      providerAccountId: "855411886",
      access_token: "access-token",
      expires_at: 1784059701,
      scope: "AaaServer.profile.Read",
      token_type: "Bearer",
      api_domain: "https://www.zohoapis.com",
    } as AdapterAccount & { api_domain: string };

    expect(sanitizeAdapterAccount(account)).toEqual({
      userId: "cmrl0x4sa000180o3h9q67awx",
      type: "oauth",
      provider: "zoho",
      providerAccountId: "855411886",
      access_token: "access-token",
      expires_at: 1784059701,
      scope: "AaaServer.profile.Read",
      token_type: "Bearer",
    });
  });
});
