import { describe, expect, it } from "vitest";

import { config } from "@/proxy";

describe("proxy matcher", () => {
  const matcher = new RegExp(`^${config.matcher[0]}$`);

  it("does not intercept public static assets used by the login screen", () => {
    expect(matcher.test("/zoho-svgrepo-com.svg")).toBe(false);
    expect(matcher.test("/brand/logo.png")).toBe(false);
    expect(matcher.test("/fonts/inter.woff2")).toBe(false);
  });

  it("continues protecting application routes", () => {
    expect(matcher.test("/dashboard")).toBe(true);
    expect(matcher.test("/team")).toBe(true);
    expect(matcher.test("/settings")).toBe(true);
  });

  it("allows the public health endpoint without exposing other API routes", () => {
    expect(matcher.test("/api/health")).toBe(false);
    expect(matcher.test("/api/private")).toBe(true);
  });
});
