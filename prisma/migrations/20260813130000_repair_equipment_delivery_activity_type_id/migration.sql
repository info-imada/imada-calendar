-- The first activity-customer migration used a human-readable id for this
-- catalog row. Activity inputs are validated as CUIDs, so repair the row
-- without losing existing activities that reference it.
DO $$
DECLARE
    old_id TEXT;
    repaired_id TEXT := 'cmrl0x4sa000380o3h9q67awx';
BEGIN
    SELECT "id" INTO old_id
    FROM "ActivityType"
    WHERE "code" = 'EQUIPMENT_DELIVERY';

    IF old_id IS NULL OR old_id = repaired_id THEN
        RETURN;
    END IF;

    IF EXISTS (SELECT 1 FROM "ActivityType" WHERE "id" = repaired_id AND "id" <> old_id) THEN
        RAISE EXCEPTION 'Cannot repair EQUIPMENT_DELIVERY: target ActivityType id already exists';
    END IF;

    INSERT INTO "ActivityType" ("id", "code", "name", "color", "sortOrder", "isActive")
    SELECT repaired_id, 'EQUIPMENT_DELIVERY_REPAIR', "name", "color", "sortOrder", "isActive"
    FROM "ActivityType"
    WHERE "id" = old_id;

    UPDATE "Activity"
    SET "typeId" = repaired_id
    WHERE "typeId" = old_id;

    DELETE FROM "ActivityType"
    WHERE "id" = old_id;

    UPDATE "ActivityType"
    SET "code" = 'EQUIPMENT_DELIVERY'
    WHERE "id" = repaired_id;
END $$;
