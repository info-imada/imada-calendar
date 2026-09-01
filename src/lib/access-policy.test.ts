import { AccessStatus } from "@prisma/client";
import { describe, expect, it } from "vitest";

import { canSignInWithZoho } from "@/lib/access-policy";

describe("canSignInWithZoho", () => {
  it("admits a new Zoho identity with an email so the adapter can create a pending user", () => {
    expect(canSignInWithZoho({ email: "new.user@example.com" }, null)).toBe(true);
  });

  it.each([
    [{ email: null }, null],
    [{ email: "suspended@example.com" }, { accessStatus: AccessStatus.SUSPENDED, hasCredential: false }],
    [{ email: "password@example.com" }, { accessStatus: AccessStatus.ACTIVE, hasCredential: true }],
  ])("denies identities that cannot use Zoho", (identity, storedUser) => {
    expect(canSignInWithZoho(identity, storedUser)).toBe(false);
  });

  it.each([AccessStatus.PENDING, AccessStatus.ACTIVE])("admits an existing non-password Zoho user", (accessStatus) => {
    expect(canSignInWithZoho({ email: "known@example.com" }, { accessStatus, hasCredential: false })).toBe(true);
  });
});
