import { afterEach, describe, expect, it } from "vitest";

import { createAuthOptions } from "@/lib/auth";

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
