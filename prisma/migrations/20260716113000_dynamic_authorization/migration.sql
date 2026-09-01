CREATE TYPE "OverrideEffect" AS ENUM ('GRANT', 'DENY');

ALTER TABLE "Role"
  ADD COLUMN "name" TEXT,
  ADD COLUMN "description" TEXT,
  ADD COLUMN "isSystem" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN "priority" INTEGER;

UPDATE "Role" SET "key" = 'LIDER' WHERE "key" = 'LEAD';
UPDATE "Role" SET "key" = 'COORDINADOR' WHERE "key" = 'COORDINATOR';
UPDATE "Role" SET "key" = 'TECNICO' WHERE "key" = 'TECHNICIAN';

UPDATE "Role"
SET
  "name" = CASE "key"
    WHEN 'ADMIN' THEN 'Administrador'
    WHEN 'LIDER' THEN 'Líder'
    WHEN 'COORDINADOR' THEN 'Coordinador'
    WHEN 'TECNICO' THEN 'Técnico'
    WHEN 'AUDITOR' THEN 'Auditor'
    ELSE "key"
  END,
  "description" = CASE "key"
    WHEN 'ADMIN' THEN 'Administración global de la operación.'
    WHEN 'LIDER' THEN 'Liderazgo operativo y gestión del equipo.'
    WHEN 'COORDINADOR' THEN 'Coordinación de actividades y disponibilidad.'
    WHEN 'TECNICO' THEN 'Ejecución de actividades técnicas asignadas.'
    WHEN 'AUDITOR' THEN 'Consulta de operación y trazabilidad.'
    ELSE NULL
  END,
  "isSystem" = "key" IN ('ADMIN', 'LIDER', 'COORDINADOR', 'TECNICO', 'AUDITOR'),
  "priority" = CASE "key"
    WHEN 'ADMIN' THEN 500
    WHEN 'LIDER' THEN 400
    WHEN 'COORDINADOR' THEN 300
    WHEN 'TECNICO' THEN 200
    WHEN 'AUDITOR' THEN 100
    ELSE NULL
  END;

WITH custom_roles AS (
  SELECT "id", ROW_NUMBER() OVER (ORDER BY "id") AS sequence
  FROM "Role"
  WHERE "priority" IS NULL
)
UPDATE "Role" AS role
SET "priority" = -custom_roles.sequence
FROM custom_roles
WHERE role."id" = custom_roles."id";

ALTER TABLE "Role"
  ALTER COLUMN "name" SET NOT NULL,
  ALTER COLUMN "priority" SET NOT NULL;

CREATE UNIQUE INDEX "Role_priority_key" ON "Role"("priority");

CREATE TABLE "Permission" (
  "id" TEXT NOT NULL,
  "key" TEXT NOT NULL,
  "label" TEXT NOT NULL,
  "category" TEXT NOT NULL,
  CONSTRAINT "Permission_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "Permission_key_key" ON "Permission"("key");

CREATE TABLE "RolePermission" (
  "id" TEXT NOT NULL,
  "roleId" TEXT NOT NULL,
  "permissionId" TEXT NOT NULL,
  CONSTRAINT "RolePermission_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "RolePermission_roleId_permissionId_key"
  ON "RolePermission"("roleId", "permissionId");

ALTER TABLE "RolePermission"
  ADD CONSTRAINT "RolePermission_roleId_fkey"
  FOREIGN KEY ("roleId") REFERENCES "Role"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "RolePermission"
  ADD CONSTRAINT "RolePermission_permissionId_fkey"
  FOREIGN KEY ("permissionId") REFERENCES "Permission"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TABLE "UserPermissionOverride" (
  "id" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "permissionId" TEXT NOT NULL,
  "effect" "OverrideEffect" NOT NULL,
  "countryId" TEXT,
  "teamId" TEXT,
  "scopeKey" TEXT NOT NULL,
  "createdById" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "UserPermissionOverride_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "UserPermissionOverride_userId_permissionId_scopeKey_key"
  ON "UserPermissionOverride"("userId", "permissionId", "scopeKey");

CREATE INDEX "UserPermissionOverride_userId_countryId_teamId_idx"
  ON "UserPermissionOverride"("userId", "countryId", "teamId");

ALTER TABLE "UserPermissionOverride"
  ADD CONSTRAINT "UserPermissionOverride_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "UserPermissionOverride"
  ADD CONSTRAINT "UserPermissionOverride_permissionId_fkey"
  FOREIGN KEY ("permissionId") REFERENCES "Permission"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "UserPermissionOverride"
  ADD CONSTRAINT "UserPermissionOverride_countryId_fkey"
  FOREIGN KEY ("countryId") REFERENCES "Country"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "UserPermissionOverride"
  ADD CONSTRAINT "UserPermissionOverride_teamId_fkey"
  FOREIGN KEY ("teamId") REFERENCES "Team"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "UserPermissionOverride"
  ADD CONSTRAINT "UserPermissionOverride_createdById_fkey"
  FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "UserPermissionOverride"
  ADD CONSTRAINT "UserPermissionOverride_scope_check"
  CHECK (
    ("scopeKey" = 'GLOBAL' AND "countryId" IS NULL AND "teamId" IS NULL)
    OR ("scopeKey" = 'COUNTRY:' || "countryId" AND "countryId" IS NOT NULL AND "teamId" IS NULL)
    OR ("scopeKey" = 'TEAM:' || "teamId" AND "teamId" IS NOT NULL)
  );
