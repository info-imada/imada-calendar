import "server-only";

import { PrismaAdapter } from "@auth/prisma-adapter";
import type { Adapter, AdapterAccount } from "@auth/core/adapters";

import { getPrisma } from "@/lib/prisma";

const persistedAccountKeys = new Set([
  "userId",
  "type",
  "provider",
  "providerAccountId",
  "refresh_token",
  "access_token",
  "expires_at",
  "token_type",
  "scope",
  "id_token",
  "session_state",
]);

export function sanitizeAdapterAccount(account: AdapterAccount): AdapterAccount {
  return Object.fromEntries(
    Object.entries(account).filter(([key]) => persistedAccountKeys.has(key)),
  ) as AdapterAccount;
}

export function createAuthAdapter(): Adapter {
  const adapter = PrismaAdapter(getPrisma());
  const linkAccount = adapter.linkAccount;

  if (!linkAccount) return adapter;

  return {
    ...adapter,
    linkAccount: (account: AdapterAccount) => linkAccount(sanitizeAdapterAccount(account)),
  };
}
