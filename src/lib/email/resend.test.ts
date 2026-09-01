import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({ send: vi.fn() }));

vi.mock("resend", () => ({
  Resend: class {
    emails = { send: mocks.send };
  },
}));

import { resetResendClientForTests, sendEmail } from "@/lib/email/resend";

describe("sendEmail", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    resetResendClientForTests();
    process.env.RESEND_API_KEY = "re_test_key";
    process.env.RESEND_FROM_EMAIL = "calendar@example.com";
    process.env.RESEND_FROM_NAME = "Calendar";
    process.env.NEXTAUTH_URL = "https://calendar.example.com";
  });

  it("sends one message with to and cc arrays", async () => {
    mocks.send.mockResolvedValue({ data: { id: "email-1" }, error: null });

    await expect(
      sendEmail({
        cc: ["admin@example.com"],
        html: "<p>Hola</p>",
        subject: "Actividad creada",
        text: "Hola",
        to: ["tech@example.com"],
      }),
    ).resolves.toEqual({ success: true, id: "email-1" });

    expect(mocks.send).toHaveBeenCalledWith(
      expect.objectContaining({
        cc: ["admin@example.com"],
        from: "Calendar <calendar@example.com>",
        to: ["tech@example.com"],
      }),
    );
  });

  it("returns a typed failure without throwing provider errors", async () => {
    mocks.send.mockResolvedValue({ data: null, error: { message: "rate limited" } });

    await expect(
      sendEmail({ subject: "Aviso", text: "Texto", to: ["tech@example.com"] }),
    ).resolves.toEqual({ success: false, error: "rate limited" });
  });

  it("fails safely when Resend is not configured", async () => {
    delete process.env.RESEND_API_KEY;

    await expect(
      sendEmail({ subject: "Aviso", text: "Texto", to: ["tech@example.com"] }),
    ).resolves.toEqual({ success: false, error: "EMAIL_NOT_CONFIGURED" });
  });
});
