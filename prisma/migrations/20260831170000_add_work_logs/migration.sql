CREATE TYPE "WorkLogStatus" AS ENUM ('IN_PROGRESS', 'COMPLETION_PENDING', 'COMPLETED');

ALTER TABLE "User" ADD COLUMN "timezone" VARCHAR(64) NOT NULL DEFAULT 'America/Panama';
ALTER TABLE "Customer" ADD COLUMN "legacySource" TEXT;
ALTER TABLE "Customer" ADD COLUMN "legacyId" TEXT;

CREATE TABLE "CustomerLocation" (
    "id" TEXT NOT NULL,
    "customerId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "legacySource" TEXT,
    "legacyId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "CustomerLocation_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "WorkLog" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "activityId" TEXT,
    "countryId" TEXT NOT NULL,
    "teamId" TEXT,
    "customerId" TEXT,
    "customerLocationId" TEXT,
    "workDate" DATE NOT NULL,
    "timezone" VARCHAR(64) NOT NULL DEFAULT 'America/Panama',
    "startedAt" TIMESTAMP(3) NOT NULL,
    "endedAt" TIMESTAMP(3),
    "durationMinutes" INTEGER,
    "status" "WorkLogStatus" NOT NULL DEFAULT 'IN_PROGRESS',
    "startResetUsedAt" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),
    "activeKey" TEXT,
    "draftNotifiedAt" TIMESTAMP(3),
    "machineReference" VARCHAR(255),
    "location" VARCHAR(255),
    "description" TEXT,
    "legacySource" TEXT,
    "legacyId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "WorkLog_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "WorkLogAttachment" (
    "id" TEXT NOT NULL,
    "workLogId" TEXT,
    "userId" TEXT NOT NULL,
    "uploadUuid" TEXT NOT NULL,
    "objectKey" TEXT NOT NULL,
    "referenceUrl" TEXT,
    "originalName" TEXT NOT NULL,
    "mimeType" TEXT NOT NULL,
    "sizeBytes" INTEGER NOT NULL,
    "etag" TEXT,
    "legacySource" TEXT,
    "legacyId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "WorkLogAttachment_pkey" PRIMARY KEY ("id")
);

ALTER TABLE "CustomerLocation" ADD CONSTRAINT "CustomerLocation_customerId_fkey"
    FOREIGN KEY ("customerId") REFERENCES "Customer"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "WorkLog" ADD CONSTRAINT "WorkLog_userId_fkey"
    FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "WorkLog" ADD CONSTRAINT "WorkLog_activityId_fkey"
    FOREIGN KEY ("activityId") REFERENCES "Activity"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "WorkLog" ADD CONSTRAINT "WorkLog_countryId_fkey"
    FOREIGN KEY ("countryId") REFERENCES "Country"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "WorkLog" ADD CONSTRAINT "WorkLog_teamId_fkey"
    FOREIGN KEY ("teamId") REFERENCES "Team"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "WorkLog" ADD CONSTRAINT "WorkLog_customerId_fkey"
    FOREIGN KEY ("customerId") REFERENCES "Customer"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "WorkLog" ADD CONSTRAINT "WorkLog_customerLocationId_fkey"
    FOREIGN KEY ("customerLocationId") REFERENCES "CustomerLocation"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "WorkLogAttachment" ADD CONSTRAINT "WorkLogAttachment_workLogId_fkey"
    FOREIGN KEY ("workLogId") REFERENCES "WorkLog"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "WorkLogAttachment" ADD CONSTRAINT "WorkLogAttachment_userId_fkey"
    FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE UNIQUE INDEX "Customer_legacySource_legacyId_key" ON "Customer"("legacySource", "legacyId");
CREATE UNIQUE INDEX "CustomerLocation_customerId_name_key" ON "CustomerLocation"("customerId", "name");
CREATE UNIQUE INDEX "CustomerLocation_legacySource_legacyId_key" ON "CustomerLocation"("legacySource", "legacyId");
CREATE UNIQUE INDEX "WorkLog_activityId_key" ON "WorkLog"("activityId");
CREATE UNIQUE INDEX "WorkLog_activeKey_key" ON "WorkLog"("activeKey");
CREATE UNIQUE INDEX "WorkLog_legacySource_legacyId_key" ON "WorkLog"("legacySource", "legacyId");
CREATE UNIQUE INDEX "WorkLogAttachment_uploadUuid_key" ON "WorkLogAttachment"("uploadUuid");
CREATE UNIQUE INDEX "WorkLogAttachment_objectKey_key" ON "WorkLogAttachment"("objectKey");
CREATE UNIQUE INDEX "WorkLogAttachment_legacySource_legacyId_key" ON "WorkLogAttachment"("legacySource", "legacyId");
CREATE INDEX "CustomerLocation_customerId_isActive_name_idx" ON "CustomerLocation"("customerId", "isActive", "name");
CREATE INDEX "WorkLog_userId_workDate_idx" ON "WorkLog"("userId", "workDate");
CREATE INDEX "WorkLog_countryId_workDate_idx" ON "WorkLog"("countryId", "workDate");
CREATE INDEX "WorkLog_teamId_workDate_idx" ON "WorkLog"("teamId", "workDate");
CREATE INDEX "WorkLog_customerId_workDate_idx" ON "WorkLog"("customerId", "workDate");
CREATE INDEX "WorkLog_status_workDate_idx" ON "WorkLog"("status", "workDate");
CREATE INDEX "WorkLog_machineReference_idx" ON "WorkLog"("machineReference");
CREATE INDEX "WorkLogAttachment_userId_workLogId_idx" ON "WorkLogAttachment"("userId", "workLogId");
