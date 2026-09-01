CREATE TABLE "UserCredential" (
  "userId" TEXT PRIMARY KEY,
  "passwordHash" TEXT NOT NULL,
  "mustChangePassword" BOOLEAN NOT NULL DEFAULT true,
  "changedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "UserCredential_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE TABLE "LoginAttempt" (
  "id" TEXT PRIMARY KEY,
  "email" TEXT NOT NULL,
  "attemptedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "succeeded" BOOLEAN NOT NULL
);

CREATE INDEX "LoginAttempt_email_attemptedAt_idx" ON "LoginAttempt" ("email", "attemptedAt");
