import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({ sendEmail: vi.fn() }));

vi.mock("@/lib/email/config", () => ({
  getEmailConfig: () => ({ appUrl: "https://calendar.example.com" }),
}));
vi.mock("@/lib/email/resend", () => ({ sendEmail: mocks.sendEmail }));

import { sendEphemeralCredentialEmail } from "@/lib/notifications/account-notifications";

describe("credential notifications", () => {
  beforeEach(() => vi.clearAllMocks());

  it("sends a temporary password only to the affected user without cc", async () => {
    mocks.sendEmail.mockResolvedValue({ success: true, id: "resend-1" });
    await expect(sendEphemeralCredentialEmail({
      kind: "USER_WELCOME",
      user: { id: "user-1", email: "User@Example.com", name: "Usuario" },
      authMethod: "LOCAL",
      temporaryPassword: "Combi-temporal9!",
    })).resolves.toBe("SENT");
    expect(mocks.sendEmail).toHaveBeenCalledWith(expect.objectContaining({
      to: ["user@example.com"],
      cc: [],
      text: expect.stringContaining("Combi-temporal9!"),
    }));
  });
});
