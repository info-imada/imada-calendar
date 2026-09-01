CREATE TABLE "Customer" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "code" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "Customer_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "Customer_code_key" ON "Customer"("code");
CREATE INDEX "Customer_isActive_name_idx" ON "Customer"("isActive", "name");

ALTER TABLE "Activity" ADD COLUMN "customerId" TEXT;
ALTER TABLE "Activity" ADD COLUMN "partNumber" TEXT;
ALTER TABLE "Activity" ADD COLUMN "partUrl" VARCHAR(2048);
CREATE INDEX "Activity_customerId_startsAt_idx" ON "Activity"("customerId", "startsAt");
ALTER TABLE "Activity" ADD CONSTRAINT "Activity_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "Customer"("id") ON DELETE SET NULL ON UPDATE CASCADE;

INSERT INTO "ActivityType" ("id", "code", "name", "color", "sortOrder", "isActive")
VALUES ('seed_equipment_delivery', 'EQUIPMENT_DELIVERY', 'Entrega de Equipo', '#0EA5E9', 50, true)
ON CONFLICT ("code") DO UPDATE
SET "name" = EXCLUDED."name", "color" = EXCLUDED."color", "sortOrder" = EXCLUDED."sortOrder", "isActive" = EXCLUDED."isActive";

DO $$
DECLARE
    admin_role_id TEXT;
    technician_role_id TEXT;
BEGIN
    SELECT "id" INTO admin_role_id FROM "Role" WHERE "key" = 'ADMIN';
    SELECT "id" INTO technician_role_id FROM "Role" WHERE "key" = 'TECNICO';

    IF admin_role_id IS NULL OR technician_role_id IS NULL THEN
        RAISE EXCEPTION 'ADMIN and TECNICO system roles are required for role migration';
    END IF;

    CREATE TEMP TABLE role_replacements (
        old_id TEXT PRIMARY KEY,
        new_id TEXT NOT NULL
    ) ON COMMIT DROP;

    INSERT INTO role_replacements (old_id, new_id)
    SELECT "id", CASE WHEN "key" = 'LIDER' THEN admin_role_id ELSE technician_role_id END
    FROM "Role"
    WHERE "isSystem" = true AND "key" NOT IN ('ADMIN', 'TECNICO');

    DELETE FROM "UserRoleAssignment" old_assignment
    USING role_replacements replacement, "UserRoleAssignment" target_assignment
    WHERE old_assignment."roleId" = replacement.old_id
      AND target_assignment."userId" = old_assignment."userId"
      AND target_assignment."roleId" = replacement.new_id
      AND target_assignment."scopeKey" = old_assignment."scopeKey";

    UPDATE "UserRoleAssignment" assignment
    SET "roleId" = replacement.new_id
    FROM role_replacements replacement
    WHERE assignment."roleId" = replacement.old_id;

    DELETE FROM "Role" role
    USING role_replacements replacement
    WHERE role."id" = replacement.old_id;
END $$;
