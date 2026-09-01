import "server-only";

import { getPrisma } from "@/lib/prisma";

export const maximumFailedAttempts = 5;
export const lockoutDurationMs = 15 * 60 * 1000;

export function getLockoutState(failedAttempts: Date[], now = new Date()) {
  const recentAttempts = failedAttempts.filter((attemptedAt) => now.getTime() - attemptedAt.getTime() < lockoutDurationMs);
  const locked = recentAttempts.length >= maximumFailedAttempts;
  const oldestBlockingAttempt = recentAttempts.at(0);

  return {
    locked,
    remainingAttempts: Math.max(0, maximumFailedAttempts - recentAttempts.length),
    retryAt: locked && oldestBlockingAttempt ? new Date(oldestBlockingAttempt.getTime() + lockoutDurationMs) : null,
  };
}

export async function assertLoginAllowed(email: string) {
  const since = new Date(Date.now() - lockoutDurationMs);
  const attempts = await getPrisma().loginAttempt.findMany({
    where: { email, succeeded: false, attemptedAt: { gte: since } },
    orderBy: { attemptedAt: "asc" },
    select: { attemptedAt: true },
  });

  return getLockoutState(attempts.map((attempt) => attempt.attemptedAt));
}

export async function recordLoginAttempt(email: string, succeeded: boolean) {
  await getPrisma().loginAttempt.create({ data: { email, succeeded } });

  if (succeeded) {
    await getPrisma().loginAttempt.deleteMany({ where: { email, succeeded: false } });
  }
}
