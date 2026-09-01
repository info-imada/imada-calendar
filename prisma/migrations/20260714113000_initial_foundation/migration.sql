CREATE TYPE "ScopeType" AS ENUM ('GLOBAL', 'COUNTRY', 'TEAM');
CREATE TYPE "AccessStatus" AS ENUM ('PENDING', 'ACTIVE', 'SUSPENDED');
CREATE TYPE "RecurrenceFrequency" AS ENUM ('DAILY', 'WEEKLY', 'MONTHLY');
CREATE TYPE "ReminderChannel" AS ENUM ('IN_APP', 'EMAIL');

CREATE TABLE "User" (
  "id" TEXT PRIMARY KEY, "email" TEXT UNIQUE, "emailVerified" TIMESTAMP(3), "name" TEXT, "image" TEXT,
  "accessStatus" "AccessStatus" NOT NULL DEFAULT 'PENDING', "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL
);
CREATE TABLE "Account" (
  "userId" TEXT NOT NULL REFERENCES "User"("id") ON DELETE CASCADE, "type" TEXT NOT NULL, "provider" TEXT NOT NULL,
  "providerAccountId" TEXT NOT NULL, "refresh_token" TEXT, "access_token" TEXT, "expires_at" INTEGER, "token_type" TEXT,
  "scope" TEXT, "id_token" TEXT, "session_state" TEXT, PRIMARY KEY ("provider", "providerAccountId")
);
CREATE TABLE "Session" (
  "sessionToken" TEXT PRIMARY KEY, "userId" TEXT NOT NULL REFERENCES "User"("id") ON DELETE CASCADE, "expires" TIMESTAMP(3) NOT NULL
);
CREATE TABLE "VerificationToken" (
  "identifier" TEXT NOT NULL, "token" TEXT NOT NULL UNIQUE, "expires" TIMESTAMP(3) NOT NULL, UNIQUE ("identifier", "token")
);
CREATE TABLE "Country" ("id" TEXT PRIMARY KEY, "code" TEXT NOT NULL UNIQUE, "name" TEXT NOT NULL);
CREATE TABLE "Team" (
  "id" TEXT PRIMARY KEY, "name" TEXT NOT NULL, "countryId" TEXT NOT NULL REFERENCES "Country"("id"), UNIQUE ("countryId", "name")
);
CREATE TABLE "Role" ("id" TEXT PRIMARY KEY, "key" TEXT NOT NULL UNIQUE);
CREATE TABLE "UserRoleAssignment" (
  "id" TEXT PRIMARY KEY, "userId" TEXT NOT NULL REFERENCES "User"("id") ON DELETE CASCADE,
  "roleId" TEXT NOT NULL REFERENCES "Role"("id"), "scopeType" "ScopeType" NOT NULL,
  "countryId" TEXT REFERENCES "Country"("id") ON DELETE SET NULL, "teamId" TEXT REFERENCES "Team"("id") ON DELETE SET NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, "createdById" TEXT NOT NULL
);
CREATE TABLE "ActivityType" (
  "id" TEXT PRIMARY KEY, "code" TEXT NOT NULL UNIQUE, "name" TEXT NOT NULL, "color" TEXT NOT NULL,
  "sortOrder" INTEGER NOT NULL DEFAULT 0, "isActive" BOOLEAN NOT NULL DEFAULT true
);
CREATE TABLE "ActivityStatus" (
  "id" TEXT PRIMARY KEY, "code" TEXT NOT NULL UNIQUE, "name" TEXT NOT NULL, "color" TEXT NOT NULL,
  "sortOrder" INTEGER NOT NULL DEFAULT 0, "isActive" BOOLEAN NOT NULL DEFAULT true
);
CREATE TABLE "Priority" (
  "id" TEXT PRIMARY KEY, "code" TEXT NOT NULL UNIQUE, "name" TEXT NOT NULL, "level" INTEGER NOT NULL UNIQUE,
  "color" TEXT NOT NULL, "sortOrder" INTEGER NOT NULL DEFAULT 0, "isActive" BOOLEAN NOT NULL DEFAULT true
);
CREATE TABLE "ActivitySeries" ("id" TEXT PRIMARY KEY);
CREATE TABLE "Activity" (
  "id" TEXT PRIMARY KEY, "title" TEXT NOT NULL, "description" TEXT, "startsAt" TIMESTAMP(3) NOT NULL,
  "endsAt" TIMESTAMP(3) NOT NULL, "allDay" BOOLEAN NOT NULL DEFAULT false,
  "countryId" TEXT NOT NULL REFERENCES "Country"("id"), "teamId" TEXT REFERENCES "Team"("id") ON DELETE SET NULL,
  "typeId" TEXT NOT NULL REFERENCES "ActivityType"("id"), "statusId" TEXT NOT NULL REFERENCES "ActivityStatus"("id"),
  "priorityId" TEXT NOT NULL REFERENCES "Priority"("id"), "assignedToId" TEXT REFERENCES "User"("id") ON DELETE SET NULL,
  "createdById" TEXT NOT NULL REFERENCES "User"("id"), "seriesId" TEXT REFERENCES "ActivitySeries"("id") ON DELETE SET NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, "updatedAt" TIMESTAMP(3) NOT NULL
);
CREATE TABLE "RecurrenceRule" (
  "id" TEXT PRIMARY KEY, "seriesId" TEXT NOT NULL UNIQUE REFERENCES "ActivitySeries"("id") ON DELETE CASCADE,
  "frequency" "RecurrenceFrequency" NOT NULL, "interval" INTEGER NOT NULL DEFAULT 1, "daysOfWeek" INTEGER[] NOT NULL,
  "endsAt" TIMESTAMP(3), "timezone" TEXT NOT NULL
);
CREATE TABLE "ActivityComment" (
  "id" TEXT PRIMARY KEY, "activityId" TEXT NOT NULL REFERENCES "Activity"("id") ON DELETE CASCADE,
  "authorId" TEXT NOT NULL REFERENCES "User"("id"), "body" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, "updatedAt" TIMESTAMP(3) NOT NULL
);
CREATE TABLE "ActivityReminder" (
  "id" TEXT PRIMARY KEY, "activityId" TEXT NOT NULL REFERENCES "Activity"("id") ON DELETE CASCADE,
  "channel" "ReminderChannel" NOT NULL DEFAULT 'IN_APP', "scheduledAt" TIMESTAMP(3) NOT NULL, "sentAt" TIMESTAMP(3)
);
CREATE TABLE "Availability" (
  "id" TEXT PRIMARY KEY, "userId" TEXT NOT NULL REFERENCES "User"("id") ON DELETE CASCADE,
  "startsAt" TIMESTAMP(3) NOT NULL, "endsAt" TIMESTAMP(3) NOT NULL, "reason" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE TABLE "Notification" (
  "id" TEXT PRIMARY KEY, "userId" TEXT NOT NULL REFERENCES "User"("id") ON DELETE CASCADE,
  "title" TEXT NOT NULL, "body" TEXT NOT NULL, "readAt" TIMESTAMP(3), "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE TABLE "AuditLog" (
  "id" TEXT PRIMARY KEY, "actorId" TEXT, "entityType" TEXT NOT NULL, "entityId" TEXT NOT NULL,
  "action" TEXT NOT NULL, "metadata" JSONB, "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX "UserRoleAssignment_userId_countryId_teamId_idx" ON "UserRoleAssignment" ("userId", "countryId", "teamId");
CREATE INDEX "Activity_countryId_startsAt_idx" ON "Activity" ("countryId", "startsAt");
CREATE INDEX "Activity_teamId_startsAt_idx" ON "Activity" ("teamId", "startsAt");
CREATE INDEX "Activity_assignedToId_startsAt_idx" ON "Activity" ("assignedToId", "startsAt");
CREATE INDEX "Activity_statusId_startsAt_idx" ON "Activity" ("statusId", "startsAt");
CREATE INDEX "ActivityReminder_scheduledAt_sentAt_idx" ON "ActivityReminder" ("scheduledAt", "sentAt");
CREATE INDEX "Availability_userId_startsAt_idx" ON "Availability" ("userId", "startsAt");
CREATE INDEX "Notification_userId_readAt_createdAt_idx" ON "Notification" ("userId", "readAt", "createdAt");
CREATE INDEX "AuditLog_entityType_entityId_createdAt_idx" ON "AuditLog" ("entityType", "entityId", "createdAt");

CREATE FUNCTION prevent_audit_log_mutation() RETURNS trigger AS $$
BEGIN
  RAISE EXCEPTION 'AuditLog is immutable';
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER "AuditLog_immutable"
BEFORE UPDATE OR DELETE ON "AuditLog"
FOR EACH ROW EXECUTE FUNCTION prevent_audit_log_mutation();
