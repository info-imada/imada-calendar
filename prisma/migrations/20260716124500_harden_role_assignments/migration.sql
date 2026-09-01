ALTER TABLE "UserRoleAssignment"
  ADD COLUMN "scopeKey" TEXT;

UPDATE "UserRoleAssignment"
SET
  "countryId" = CASE
    WHEN "scopeType" = 'COUNTRY' THEN "countryId"
    ELSE NULL
  END,
  "teamId" = CASE
    WHEN "scopeType" = 'TEAM' THEN "teamId"
    ELSE NULL
  END;

UPDATE "UserRoleAssignment"
SET "scopeKey" = CASE
  WHEN "scopeType" = 'GLOBAL' THEN 'GLOBAL'
  WHEN "scopeType" = 'COUNTRY' AND "countryId" IS NOT NULL
    THEN 'COUNTRY:' || "countryId"
  WHEN "scopeType" = 'TEAM' AND "teamId" IS NOT NULL
    THEN 'TEAM:' || "teamId"
  ELSE NULL
END;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM "UserRoleAssignment"
    WHERE "scopeKey" IS NULL
  ) THEN
    RAISE EXCEPTION 'Cannot derive UserRoleAssignment.scopeKey from its scope columns';
  END IF;
END
$$;

WITH ranked_assignments AS (
  SELECT
    "id",
    ROW_NUMBER() OVER (
      PARTITION BY "userId", "roleId", "scopeKey"
      ORDER BY "createdAt", "id"
    ) AS duplicate_number
  FROM "UserRoleAssignment"
)
DELETE FROM "UserRoleAssignment" AS assignment
USING ranked_assignments
WHERE assignment."id" = ranked_assignments."id"
  AND ranked_assignments.duplicate_number > 1;

ALTER TABLE "UserRoleAssignment"
  ALTER COLUMN "scopeKey" SET NOT NULL;

CREATE UNIQUE INDEX "UserRoleAssignment_userId_roleId_scopeKey_key"
  ON "UserRoleAssignment"("userId", "roleId", "scopeKey");

ALTER TABLE "UserRoleAssignment"
  ADD CONSTRAINT "UserRoleAssignment_scope_check"
  CHECK (
    ("scopeType" = 'GLOBAL' AND "scopeKey" = 'GLOBAL' AND "countryId" IS NULL AND "teamId" IS NULL)
    OR (
      "scopeType" = 'COUNTRY'
      AND "scopeKey" = 'COUNTRY:' || "countryId"
      AND "countryId" IS NOT NULL
      AND "teamId" IS NULL
    )
    OR (
      "scopeType" = 'TEAM'
      AND "scopeKey" = 'TEAM:' || "teamId"
      AND "countryId" IS NULL
      AND "teamId" IS NOT NULL
    )
  );
