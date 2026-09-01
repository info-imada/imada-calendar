CREATE TYPE "NotificationKind" AS ENUM (
  'GENERIC',
  'ACTIVITY_CREATED',
  'ACTIVITY_UPDATED',
  'ACTIVITY_REASSIGNED',
  'ACTIVITY_STATUS_CHANGED',
  'ACTIVITY_CANCELLED',
  'ACTIVITY_COMMENTED',
  'ACTIVITY_REMINDER',
  'USER_WELCOME',
  'PASSWORD_RESET',
  'USER_ROLE_ASSIGNED',
  'USER_ROLE_REVOKED',
  'USER_ACCESS_STATUS_CHANGED'
);

CREATE TYPE "EmailDeliveryStatus" AS ENUM (
  'PENDING',
  'PROCESSING',
  'SENT',
  'FAILED',
  'SKIPPED'
);

CREATE TABLE "EmailNotification" (
  "id" TEXT NOT NULL,
  "kind" "NotificationKind" NOT NULL,
  "entityType" TEXT NOT NULL,
  "entityId" TEXT NOT NULL,
  "payload" JSONB NOT NULL,
  "dedupeKey" TEXT NOT NULL,
  "toRecipients" TEXT[] NOT NULL,
  "ccRecipients" TEXT[] NOT NULL,
  "status" "EmailDeliveryStatus" NOT NULL DEFAULT 'PENDING',
  "attemptCount" INTEGER NOT NULL DEFAULT 0,
  "nextAttemptAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "lockedAt" TIMESTAMP(3),
  "sentAt" TIMESTAMP(3),
  "providerId" TEXT,
  "lastError" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "EmailNotification_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "EmailNotification_dedupeKey_key"
  ON "EmailNotification"("dedupeKey");
CREATE INDEX "EmailNotification_status_nextAttemptAt_lockedAt_idx"
  ON "EmailNotification"("status", "nextAttemptAt", "lockedAt");
CREATE INDEX "EmailNotification_entityType_entityId_createdAt_idx"
  ON "EmailNotification"("entityType", "entityId", "createdAt");

DELETE FROM "ActivityReminder"
WHERE "id" IN (
  SELECT "id"
  FROM (
    SELECT
      "id",
      ROW_NUMBER() OVER (
        PARTITION BY "activityId", "channel", "scheduledAt"
        ORDER BY "id"
      ) AS duplicate_number
    FROM "ActivityReminder"
  ) duplicates
  WHERE duplicate_number > 1
);

CREATE UNIQUE INDEX "ActivityReminder_activityId_channel_scheduledAt_key"
  ON "ActivityReminder"("activityId", "channel", "scheduledAt");
