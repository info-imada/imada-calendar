-- CreateTable
CREATE TABLE `calendar_users` (
    `id` VARCHAR(191) NOT NULL,
    `email` VARCHAR(191) NULL,
    `emailVerified` DATETIME(3) NULL,
    `name` VARCHAR(191) NULL,
    `image` VARCHAR(191) NULL,
    `accessStatus` ENUM('PENDING', 'ACTIVE', 'SUSPENDED') NOT NULL DEFAULT 'PENDING',
    `timezone` VARCHAR(64) NOT NULL DEFAULT 'America/Panama',
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `calendar_users_email_key`(`email`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `calendar_user_credentials` (
    `userId` VARCHAR(191) NOT NULL,
    `passwordHash` TEXT NOT NULL,
    `mustChangePassword` BOOLEAN NOT NULL DEFAULT true,
    `changedAt` DATETIME(3) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    PRIMARY KEY (`userId`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `calendar_login_attempts` (
    `id` VARCHAR(191) NOT NULL,
    `email` VARCHAR(191) NOT NULL,
    `attemptedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `succeeded` BOOLEAN NOT NULL,

    INDEX `calendar_login_attempts_email_attemptedAt_idx`(`email`, `attemptedAt`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `calendar_accounts` (
    `userId` VARCHAR(191) NOT NULL,
    `type` VARCHAR(191) NOT NULL,
    `provider` VARCHAR(191) NOT NULL,
    `providerAccountId` VARCHAR(191) NOT NULL,
    `refresh_token` TEXT NULL,
    `access_token` TEXT NULL,
    `expires_at` INTEGER NULL,
    `token_type` VARCHAR(191) NULL,
    `scope` VARCHAR(191) NULL,
    `id_token` TEXT NULL,
    `session_state` VARCHAR(191) NULL,

    PRIMARY KEY (`provider`, `providerAccountId`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `calendar_sessions` (
    `sessionToken` VARCHAR(191) NOT NULL,
    `userId` VARCHAR(191) NOT NULL,
    `expires` DATETIME(3) NOT NULL,

    UNIQUE INDEX `calendar_sessions_sessionToken_key`(`sessionToken`),
    PRIMARY KEY (`sessionToken`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `calendar_verification_tokens` (
    `identifier` VARCHAR(191) NOT NULL,
    `token` VARCHAR(191) NOT NULL,
    `expires` DATETIME(3) NOT NULL,

    UNIQUE INDEX `calendar_verification_tokens_token_key`(`token`),
    UNIQUE INDEX `calendar_verification_tokens_identifier_token_key`(`identifier`, `token`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `calendar_countries` (
    `id` VARCHAR(191) NOT NULL,
    `code` VARCHAR(191) NOT NULL,
    `name` VARCHAR(191) NOT NULL,

    UNIQUE INDEX `calendar_countries_code_key`(`code`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `calendar_teams` (
    `id` VARCHAR(191) NOT NULL,
    `name` VARCHAR(191) NOT NULL,
    `countryId` VARCHAR(191) NOT NULL,

    UNIQUE INDEX `calendar_teams_countryId_name_key`(`countryId`, `name`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `calendar_customers` (
    `id` VARCHAR(191) NOT NULL,
    `name` VARCHAR(191) NOT NULL,
    `code` VARCHAR(191) NULL,
    `isActive` BOOLEAN NOT NULL DEFAULT true,
    `legacySource` VARCHAR(191) NULL,
    `legacyId` VARCHAR(191) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `calendar_customers_code_key`(`code`),
    INDEX `calendar_customers_isActive_name_idx`(`isActive`, `name`),
    UNIQUE INDEX `calendar_customers_legacySource_legacyId_key`(`legacySource`, `legacyId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `calendar_customer_locations` (
    `id` VARCHAR(191) NOT NULL,
    `customerId` VARCHAR(191) NOT NULL,
    `name` VARCHAR(191) NOT NULL,
    `sortOrder` INTEGER NOT NULL DEFAULT 0,
    `isActive` BOOLEAN NOT NULL DEFAULT true,
    `legacySource` VARCHAR(191) NULL,
    `legacyId` VARCHAR(191) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `calendar_customer_locations_customerId_isActive_name_idx`(`customerId`, `isActive`, `name`),
    UNIQUE INDEX `calendar_customer_locations_customerId_name_key`(`customerId`, `name`),
    UNIQUE INDEX `calendar_customer_locations_legacySource_legacyId_key`(`legacySource`, `legacyId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `calendar_roles` (
    `id` VARCHAR(191) NOT NULL,
    `key` VARCHAR(191) NOT NULL,
    `name` VARCHAR(191) NOT NULL,
    `description` VARCHAR(191) NULL,
    `isSystem` BOOLEAN NOT NULL DEFAULT false,
    `priority` INTEGER NOT NULL,

    UNIQUE INDEX `calendar_roles_key_key`(`key`),
    UNIQUE INDEX `calendar_roles_priority_key`(`priority`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `calendar_permissions` (
    `id` VARCHAR(191) NOT NULL,
    `key` VARCHAR(191) NOT NULL,
    `label` VARCHAR(191) NOT NULL,
    `category` VARCHAR(191) NOT NULL,

    UNIQUE INDEX `calendar_permissions_key_key`(`key`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `calendar_role_permissions` (
    `id` VARCHAR(191) NOT NULL,
    `roleId` VARCHAR(191) NOT NULL,
    `permissionId` VARCHAR(191) NOT NULL,

    UNIQUE INDEX `calendar_role_permissions_roleId_permissionId_key`(`roleId`, `permissionId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `calendar_user_permission_overrides` (
    `id` VARCHAR(191) NOT NULL,
    `userId` VARCHAR(191) NOT NULL,
    `permissionId` VARCHAR(191) NOT NULL,
    `effect` ENUM('GRANT', 'DENY') NOT NULL,
    `countryId` VARCHAR(191) NULL,
    `teamId` VARCHAR(191) NULL,
    `scopeKey` VARCHAR(191) NOT NULL,
    `createdById` VARCHAR(191) NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `calendar_user_permission_overrides_userId_countryId_teamId_idx`(`userId`, `countryId`, `teamId`),
    UNIQUE INDEX `calendar_user_permission_overrides_userId_permissionId_scope_key`(`userId`, `permissionId`, `scopeKey`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `calendar_user_role_assignments` (
    `id` VARCHAR(191) NOT NULL,
    `userId` VARCHAR(191) NOT NULL,
    `roleId` VARCHAR(191) NOT NULL,
    `scopeType` ENUM('GLOBAL', 'COUNTRY', 'TEAM') NOT NULL,
    `countryId` VARCHAR(191) NULL,
    `teamId` VARCHAR(191) NULL,
    `scopeKey` VARCHAR(191) NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `createdById` VARCHAR(191) NOT NULL,

    INDEX `calendar_user_role_assignments_userId_countryId_teamId_idx`(`userId`, `countryId`, `teamId`),
    UNIQUE INDEX `calendar_user_role_assignments_userId_roleId_scopeKey_key`(`userId`, `roleId`, `scopeKey`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `calendar_activity_types` (
    `id` VARCHAR(191) NOT NULL,
    `code` VARCHAR(191) NOT NULL,
    `name` VARCHAR(191) NOT NULL,
    `color` VARCHAR(191) NOT NULL,
    `sortOrder` INTEGER NOT NULL DEFAULT 0,
    `isActive` BOOLEAN NOT NULL DEFAULT true,

    UNIQUE INDEX `calendar_activity_types_code_key`(`code`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `calendar_activity_statuses` (
    `id` VARCHAR(191) NOT NULL,
    `code` VARCHAR(191) NOT NULL,
    `name` VARCHAR(191) NOT NULL,
    `color` VARCHAR(191) NOT NULL,
    `sortOrder` INTEGER NOT NULL DEFAULT 0,
    `isActive` BOOLEAN NOT NULL DEFAULT true,

    UNIQUE INDEX `calendar_activity_statuses_code_key`(`code`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `calendar_priorities` (
    `id` VARCHAR(191) NOT NULL,
    `code` VARCHAR(191) NOT NULL,
    `name` VARCHAR(191) NOT NULL,
    `level` INTEGER NOT NULL,
    `color` VARCHAR(191) NOT NULL,
    `sortOrder` INTEGER NOT NULL DEFAULT 0,
    `isActive` BOOLEAN NOT NULL DEFAULT true,

    UNIQUE INDEX `calendar_priorities_code_key`(`code`),
    UNIQUE INDEX `calendar_priorities_level_key`(`level`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `calendar_activities` (
    `id` VARCHAR(191) NOT NULL,
    `title` VARCHAR(191) NOT NULL,
    `description` TEXT NULL,
    `startsAt` DATETIME(3) NOT NULL,
    `endsAt` DATETIME(3) NOT NULL,
    `allDay` BOOLEAN NOT NULL DEFAULT false,
    `countryId` VARCHAR(191) NOT NULL,
    `teamId` VARCHAR(191) NULL,
    `customerId` VARCHAR(191) NULL,
    `typeId` VARCHAR(191) NOT NULL,
    `statusId` VARCHAR(191) NOT NULL,
    `priorityId` VARCHAR(191) NOT NULL,
    `assignedToId` VARCHAR(191) NULL,
    `createdById` VARCHAR(191) NOT NULL,
    `partNumber` VARCHAR(191) NULL,
    `partUrl` VARCHAR(2048) NULL,
    `seriesId` VARCHAR(191) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `calendar_activities_countryId_startsAt_idx`(`countryId`, `startsAt`),
    INDEX `calendar_activities_teamId_startsAt_idx`(`teamId`, `startsAt`),
    INDEX `calendar_activities_assignedToId_startsAt_idx`(`assignedToId`, `startsAt`),
    INDEX `calendar_activities_customerId_startsAt_idx`(`customerId`, `startsAt`),
    INDEX `calendar_activities_statusId_startsAt_idx`(`statusId`, `startsAt`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `calendar_work_logs` (
    `id` VARCHAR(191) NOT NULL,
    `userId` VARCHAR(191) NOT NULL,
    `activityId` VARCHAR(191) NULL,
    `countryId` VARCHAR(191) NOT NULL,
    `teamId` VARCHAR(191) NULL,
    `customerId` VARCHAR(191) NULL,
    `customerLocationId` VARCHAR(191) NULL,
    `workDate` DATE NOT NULL,
    `timezone` VARCHAR(64) NOT NULL DEFAULT 'America/Panama',
    `startedAt` DATETIME(3) NOT NULL,
    `endedAt` DATETIME(3) NULL,
    `durationMinutes` INTEGER NULL,
    `status` ENUM('IN_PROGRESS', 'COMPLETION_PENDING', 'COMPLETED') NOT NULL DEFAULT 'IN_PROGRESS',
    `startResetUsedAt` DATETIME(3) NULL,
    `completedAt` DATETIME(3) NULL,
    `activeKey` VARCHAR(191) NULL,
    `draftNotifiedAt` DATETIME(3) NULL,
    `machineReference` VARCHAR(255) NULL,
    `location` VARCHAR(255) NULL,
    `description` TEXT NULL,
    `legacySource` VARCHAR(191) NULL,
    `legacyId` VARCHAR(191) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `calendar_work_logs_activityId_key`(`activityId`),
    UNIQUE INDEX `calendar_work_logs_activeKey_key`(`activeKey`),
    INDEX `calendar_work_logs_userId_workDate_idx`(`userId`, `workDate`),
    INDEX `calendar_work_logs_countryId_workDate_idx`(`countryId`, `workDate`),
    INDEX `calendar_work_logs_teamId_workDate_idx`(`teamId`, `workDate`),
    INDEX `calendar_work_logs_customerId_workDate_idx`(`customerId`, `workDate`),
    INDEX `calendar_work_logs_status_workDate_idx`(`status`, `workDate`),
    INDEX `calendar_work_logs_machineReference_idx`(`machineReference`),
    UNIQUE INDEX `calendar_work_logs_legacySource_legacyId_key`(`legacySource`, `legacyId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `calendar_work_log_attachments` (
    `id` VARCHAR(191) NOT NULL,
    `workLogId` VARCHAR(191) NULL,
    `userId` VARCHAR(191) NOT NULL,
    `uploadUuid` VARCHAR(191) NOT NULL,
    `objectKey` VARCHAR(191) NOT NULL,
    `referenceUrl` VARCHAR(191) NULL,
    `originalName` VARCHAR(191) NOT NULL,
    `mimeType` VARCHAR(191) NOT NULL,
    `sizeBytes` INTEGER NOT NULL,
    `etag` VARCHAR(191) NULL,
    `legacySource` VARCHAR(191) NULL,
    `legacyId` VARCHAR(191) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    UNIQUE INDEX `calendar_work_log_attachments_uploadUuid_key`(`uploadUuid`),
    UNIQUE INDEX `calendar_work_log_attachments_objectKey_key`(`objectKey`),
    INDEX `calendar_work_log_attachments_userId_workLogId_idx`(`userId`, `workLogId`),
    UNIQUE INDEX `calendar_work_log_attachments_legacySource_legacyId_key`(`legacySource`, `legacyId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `calendar_activity_series` (
    `id` VARCHAR(191) NOT NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `calendar_recurrence_rules` (
    `id` VARCHAR(191) NOT NULL,
    `seriesId` VARCHAR(191) NOT NULL,
    `frequency` ENUM('DAILY', 'WEEKLY', 'MONTHLY') NOT NULL,
    `interval` INTEGER NOT NULL DEFAULT 1,
    `daysOfWeek` JSON NOT NULL,
    `endsAt` DATETIME(3) NULL,
    `timezone` VARCHAR(191) NOT NULL,

    UNIQUE INDEX `calendar_recurrence_rules_seriesId_key`(`seriesId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `calendar_activity_comments` (
    `id` VARCHAR(191) NOT NULL,
    `activityId` VARCHAR(191) NOT NULL,
    `authorId` VARCHAR(191) NOT NULL,
    `body` TEXT NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `calendar_activity_reminders` (
    `id` VARCHAR(191) NOT NULL,
    `activityId` VARCHAR(191) NOT NULL,
    `channel` ENUM('IN_APP', 'EMAIL') NOT NULL DEFAULT 'IN_APP',
    `scheduledAt` DATETIME(3) NOT NULL,
    `sentAt` DATETIME(3) NULL,

    INDEX `calendar_activity_reminders_scheduledAt_sentAt_idx`(`scheduledAt`, `sentAt`),
    UNIQUE INDEX `calendar_activity_reminders_activityId_channel_scheduledAt_key`(`activityId`, `channel`, `scheduledAt`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `calendar_availability` (
    `id` VARCHAR(191) NOT NULL,
    `userId` VARCHAR(191) NOT NULL,
    `startsAt` DATETIME(3) NOT NULL,
    `endsAt` DATETIME(3) NOT NULL,
    `reason` VARCHAR(191) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `calendar_availability_userId_startsAt_idx`(`userId`, `startsAt`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `calendar_notifications` (
    `id` VARCHAR(191) NOT NULL,
    `userId` VARCHAR(191) NOT NULL,
    `title` VARCHAR(191) NOT NULL,
    `body` TEXT NOT NULL,
    `readAt` DATETIME(3) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `calendar_notifications_userId_readAt_createdAt_idx`(`userId`, `readAt`, `createdAt`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `calendar_email_notifications` (
    `id` VARCHAR(191) NOT NULL,
    `kind` ENUM('GENERIC', 'ACTIVITY_CREATED', 'ACTIVITY_UPDATED', 'ACTIVITY_REASSIGNED', 'ACTIVITY_STATUS_CHANGED', 'ACTIVITY_CANCELLED', 'ACTIVITY_COMMENTED', 'ACTIVITY_REMINDER', 'USER_WELCOME', 'PASSWORD_RESET', 'USER_ROLE_ASSIGNED', 'USER_ROLE_REVOKED', 'USER_ACCESS_STATUS_CHANGED', 'WORK_LOG_DRAFT', 'WORK_LOG_COMPLETED', 'WORK_LOG_ADMIN_UPDATED') NOT NULL,
    `entityType` VARCHAR(191) NOT NULL,
    `entityId` VARCHAR(191) NOT NULL,
    `payload` JSON NOT NULL,
    `dedupeKey` VARCHAR(191) NOT NULL,
    `toRecipients` JSON NOT NULL,
    `ccRecipients` JSON NOT NULL,
    `status` ENUM('PENDING', 'PROCESSING', 'SENT', 'FAILED', 'SKIPPED') NOT NULL DEFAULT 'PENDING',
    `attemptCount` INTEGER NOT NULL DEFAULT 0,
    `nextAttemptAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `lockedAt` DATETIME(3) NULL,
    `sentAt` DATETIME(3) NULL,
    `providerId` VARCHAR(191) NULL,
    `lastError` TEXT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `calendar_email_notifications_dedupeKey_key`(`dedupeKey`),
    INDEX `calendar_email_notifications_status_nextAttemptAt_lockedAt_idx`(`status`, `nextAttemptAt`, `lockedAt`),
    INDEX `calendar_email_notifications_entityType_entityId_createdAt_idx`(`entityType`, `entityId`, `createdAt`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `calendar_audit_logs` (
    `id` VARCHAR(191) NOT NULL,
    `actorId` VARCHAR(191) NULL,
    `entityType` VARCHAR(191) NOT NULL,
    `entityId` VARCHAR(191) NOT NULL,
    `action` VARCHAR(191) NOT NULL,
    `metadata` JSON NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `calendar_audit_logs_entityType_entityId_createdAt_idx`(`entityType`, `entityId`, `createdAt`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `calendar_user_credentials` ADD CONSTRAINT `calendar_user_credentials_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `calendar_users`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `calendar_accounts` ADD CONSTRAINT `calendar_accounts_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `calendar_users`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `calendar_sessions` ADD CONSTRAINT `calendar_sessions_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `calendar_users`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `calendar_teams` ADD CONSTRAINT `calendar_teams_countryId_fkey` FOREIGN KEY (`countryId`) REFERENCES `calendar_countries`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `calendar_customer_locations` ADD CONSTRAINT `calendar_customer_locations_customerId_fkey` FOREIGN KEY (`customerId`) REFERENCES `calendar_customers`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `calendar_role_permissions` ADD CONSTRAINT `calendar_role_permissions_roleId_fkey` FOREIGN KEY (`roleId`) REFERENCES `calendar_roles`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `calendar_role_permissions` ADD CONSTRAINT `calendar_role_permissions_permissionId_fkey` FOREIGN KEY (`permissionId`) REFERENCES `calendar_permissions`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `calendar_user_permission_overrides` ADD CONSTRAINT `calendar_user_permission_overrides_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `calendar_users`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `calendar_user_permission_overrides` ADD CONSTRAINT `calendar_user_permission_overrides_permissionId_fkey` FOREIGN KEY (`permissionId`) REFERENCES `calendar_permissions`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `calendar_user_permission_overrides` ADD CONSTRAINT `calendar_user_permission_overrides_countryId_fkey` FOREIGN KEY (`countryId`) REFERENCES `calendar_countries`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `calendar_user_permission_overrides` ADD CONSTRAINT `calendar_user_permission_overrides_teamId_fkey` FOREIGN KEY (`teamId`) REFERENCES `calendar_teams`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `calendar_user_permission_overrides` ADD CONSTRAINT `calendar_user_permission_overrides_createdById_fkey` FOREIGN KEY (`createdById`) REFERENCES `calendar_users`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `calendar_user_role_assignments` ADD CONSTRAINT `calendar_user_role_assignments_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `calendar_users`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `calendar_user_role_assignments` ADD CONSTRAINT `calendar_user_role_assignments_roleId_fkey` FOREIGN KEY (`roleId`) REFERENCES `calendar_roles`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `calendar_user_role_assignments` ADD CONSTRAINT `calendar_user_role_assignments_countryId_fkey` FOREIGN KEY (`countryId`) REFERENCES `calendar_countries`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `calendar_user_role_assignments` ADD CONSTRAINT `calendar_user_role_assignments_teamId_fkey` FOREIGN KEY (`teamId`) REFERENCES `calendar_teams`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `calendar_activities` ADD CONSTRAINT `calendar_activities_countryId_fkey` FOREIGN KEY (`countryId`) REFERENCES `calendar_countries`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `calendar_activities` ADD CONSTRAINT `calendar_activities_teamId_fkey` FOREIGN KEY (`teamId`) REFERENCES `calendar_teams`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `calendar_activities` ADD CONSTRAINT `calendar_activities_customerId_fkey` FOREIGN KEY (`customerId`) REFERENCES `calendar_customers`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `calendar_activities` ADD CONSTRAINT `calendar_activities_typeId_fkey` FOREIGN KEY (`typeId`) REFERENCES `calendar_activity_types`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `calendar_activities` ADD CONSTRAINT `calendar_activities_statusId_fkey` FOREIGN KEY (`statusId`) REFERENCES `calendar_activity_statuses`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `calendar_activities` ADD CONSTRAINT `calendar_activities_priorityId_fkey` FOREIGN KEY (`priorityId`) REFERENCES `calendar_priorities`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `calendar_activities` ADD CONSTRAINT `calendar_activities_assignedToId_fkey` FOREIGN KEY (`assignedToId`) REFERENCES `calendar_users`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `calendar_activities` ADD CONSTRAINT `calendar_activities_createdById_fkey` FOREIGN KEY (`createdById`) REFERENCES `calendar_users`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `calendar_activities` ADD CONSTRAINT `calendar_activities_seriesId_fkey` FOREIGN KEY (`seriesId`) REFERENCES `calendar_activity_series`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `calendar_work_logs` ADD CONSTRAINT `calendar_work_logs_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `calendar_users`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `calendar_work_logs` ADD CONSTRAINT `calendar_work_logs_activityId_fkey` FOREIGN KEY (`activityId`) REFERENCES `calendar_activities`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `calendar_work_logs` ADD CONSTRAINT `calendar_work_logs_countryId_fkey` FOREIGN KEY (`countryId`) REFERENCES `calendar_countries`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `calendar_work_logs` ADD CONSTRAINT `calendar_work_logs_teamId_fkey` FOREIGN KEY (`teamId`) REFERENCES `calendar_teams`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `calendar_work_logs` ADD CONSTRAINT `calendar_work_logs_customerId_fkey` FOREIGN KEY (`customerId`) REFERENCES `calendar_customers`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `calendar_work_logs` ADD CONSTRAINT `calendar_work_logs_customerLocationId_fkey` FOREIGN KEY (`customerLocationId`) REFERENCES `calendar_customer_locations`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `calendar_work_log_attachments` ADD CONSTRAINT `calendar_work_log_attachments_workLogId_fkey` FOREIGN KEY (`workLogId`) REFERENCES `calendar_work_logs`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `calendar_work_log_attachments` ADD CONSTRAINT `calendar_work_log_attachments_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `calendar_users`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `calendar_recurrence_rules` ADD CONSTRAINT `calendar_recurrence_rules_seriesId_fkey` FOREIGN KEY (`seriesId`) REFERENCES `calendar_activity_series`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `calendar_activity_comments` ADD CONSTRAINT `calendar_activity_comments_activityId_fkey` FOREIGN KEY (`activityId`) REFERENCES `calendar_activities`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `calendar_activity_comments` ADD CONSTRAINT `calendar_activity_comments_authorId_fkey` FOREIGN KEY (`authorId`) REFERENCES `calendar_users`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `calendar_activity_reminders` ADD CONSTRAINT `calendar_activity_reminders_activityId_fkey` FOREIGN KEY (`activityId`) REFERENCES `calendar_activities`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `calendar_availability` ADD CONSTRAINT `calendar_availability_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `calendar_users`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `calendar_notifications` ADD CONSTRAINT `calendar_notifications_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `calendar_users`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
