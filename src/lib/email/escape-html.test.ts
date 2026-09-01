import { describe, expect, it } from "vitest";

import { escapeHtml, sanitizeHeader } from "@/lib/email/escape-html";

describe("email text safety", () => {
  it("escapes user-controlled HTML", () => {
    expect(escapeHtml(`<a title="x">Tom & O'Brien</a>`)).toBe(
      "&lt;a title=&quot;x&quot;&gt;Tom &amp; O&#039;Brien&lt;/a&gt;",
    );
  });

  it("rejects CRLF header injection", () => {
    expect(() => sanitizeHeader("Calendar\r\nBcc: attacker@example.com")).toThrow(
      "INVALID_EMAIL_HEADER",
    );
  });
});
